"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, CheckCircle, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase } from "@/firebase/provider"
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc, serverTimestamp, orderBy } from "firebase/firestore"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

export default function ReviewReportsPage() {
  const router = useRouter()
  const { firestore } = useFirebase()
  const { profile: supportProfile } = useSupabaseUser()
  const { toast } = useToast()
  
  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (!supportProfile) return
    
    const q = query(
      collection(firestore, 'reports'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [supportProfile, firestore])

  if (supportProfile && !supportProfile.isSupport && !supportProfile.isAdmin) {
    return <div className="flex h-svh items-center justify-center bg-white text-zinc-400 font-black uppercase text-xs tracking-widest">Access Denied</div>
  }

  const handleReviewed = async (report: any) => {
    if (processingId || !supportProfile) return
    setProcessingId(report.id)

    try {
      const chatId = [report.reporterId, supportProfile.id].sort().join("_")
      const feedbackText = "✅ Your complaint has been reviewed by our safety team. Thank you for helping keep MatchFlow safe."
      
      await updateDoc(doc(firestore, "reports", report.id), { status: 'reviewed' });
      
      await addDoc(collection(firestore, "chats", chatId, "messages"), {
        senderId: supportProfile.id,
        text: feedbackText,
        timestamp: serverTimestamp()
      });

      toast({ title: "Report Processed" })
    } catch (error) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="flex flex-col min-h-svh bg-white text-gray-900">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-[#3BC1A8] z-10 text-white shadow-lg">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Review Reports</h1>
      </header>

      <main className="flex-1 px-6 pb-20 pt-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : reports.length > 0 ? (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-gray-50 border border-gray-100 p-6 rounded-[2.5rem] shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><ShieldAlert className="w-5 h-5 text-red-500" /></div>
                      <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reported User ID</p><p className="text-xs font-bold text-gray-900">{report.reportedUserId}</p></div>
                   </div>
                   <p className="text-[9px] font-bold text-gray-300 uppercase">{report.createdAt ? format(new Date(report.createdAt), "MMM d, HH:mm") : ""}</p>
                </div>
                <p className="text-sm font-bold text-gray-900 bg-white p-4 rounded-2xl border border-gray-100">{report.details}</p>
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
