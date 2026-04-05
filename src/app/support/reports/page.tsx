"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, CheckCircle, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, collection, query, where, onSnapshot, updateDoc, serverTimestamp, increment as firestoreIncrement, setDoc } from "firebase/firestore"
import { format } from "date-fns"

export default function ReviewReportsPage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore } = useFirebase()
  
  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const userRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: supportProfile } = useDoc(userRef)

  useEffect(() => {
    if (!firestore || !currentUser) return
    
    const q = query(collection(firestore, "reports"), where("status", "==", "pending"))
    
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setReports(list)
      setIsLoading(false)
    }, (error) => {
      console.error("Reports fetch error:", error)
      setIsLoading(false)
    })
  }, [firestore, currentUser])

  if (supportProfile && !supportProfile.isSupport && !supportProfile.isAdmin) {
    return <div className="flex h-svh items-center justify-center bg-white text-zinc-400 font-black uppercase text-xs tracking-widest">Access Denied</div>
  }

  const handleReviewed = async (report: any) => {
    if (!firestore || processingId || !supportProfile) return
    setProcessingId(report.id)

    try {
      const chatId = [report.reporterId, supportProfile.id].sort().join("_")
      const chatRef = doc(firestore, "chats", chatId)
      const msgRef = doc(collection(chatRef, "messages"))
      const feedbackText = "✅ Your complaint has been reviewed by our safety team. Thank you for helping keep MatchFlow safe."
      
      // 1. Update Report status
      await updateDoc(doc(firestore, "reports", report.id), { status: 'reviewed', reviewedAt: serverTimestamp() })
      
      // 2. Send feedback message
      await setDoc(msgRef, {
        messageText: feedbackText,
        senderId: supportProfile.id,
        sentAt: serverTimestamp(),
        status: 'sent'
      })

      // 3. Update chat metadata
      await setDoc(chatRef, {
        lastMessage: feedbackText,
        timestamp: serverTimestamp(),
        participants: [supportProfile.id, report.reporterId],
        [`unreadCount_${report.reporterId}`]: firestoreIncrement(1),
        [`userHasSent_${supportProfile.id}`]: true
      }, { merge: true })

      toast({ title: "Report Processed" })
    } catch (error) {
      console.error(error)
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="flex flex-col min-h-svh bg-transparent text-gray-900">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-transparent z-10">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-gray-900 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Review Reports</h1>
      </header>

      <main className="flex-1 px-6 pb-20">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : reports.length > 0 ? (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-white/60 backdrop-blur-xl border border-white p-6 rounded-[2.5rem] shadow-xl space-y-4">
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><ShieldAlert className="w-5 h-5 text-red-500" /></div>
                      <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reported User</p><p className="text-xs font-bold text-gray-900">ID: {report.reportedUserId}</p></div>
                   </div>
                   <p className="text-[9px] font-bold text-gray-300 uppercase">{report.timestamp ? format(report.timestamp.toDate ? report.timestamp.toDate() : new Date(report.timestamp), "MMM d, HH:mm") : ""}</p>
                </div>
                <p className="text-sm font-bold text-gray-900 bg-white/40 p-4 rounded-2xl border border-white/60">{report.details}</p>
                <Button className="w-full h-12 rounded-full bg-zinc-900 text-white font-black text-xs uppercase" onClick={() => handleReviewed(report)} disabled={!!processingId}>{processingId === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reviewed & Dismiss"}</Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 opacity-30 text-center space-y-4"><CheckCircle className="w-16 h-16 text-green-500" /><p className="text-[10px] font-black uppercase tracking-widest">All Clear</p></div>
        )}
      </main>
    </div>
  )
}
