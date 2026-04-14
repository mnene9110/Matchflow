
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, Eye, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, onSnapshot, doc } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export default function VisitorsPage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore } = useFirebase()
  
  const [visitors, setVisitors] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const meRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: profile } = useDoc(meRef)

  useEffect(() => {
    if (!firestore || !currentUser) return

    const visitorsRef = collection(firestore, "userProfiles", currentUser.uid, "visitors")
    const q = query(visitorsRef, orderBy("timestamp", "desc"))

    const unsubscribe = onSnapshot(q, (snap) => {
      setVisitors(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setIsLoading(false)
    }, (err) => {
      console.error(err)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [firestore, currentUser])

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-[#3BC1A8] z-10 shadow-lg text-white">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Profile Visitors</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-8 pb-20">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : visitors.length > 0 ? (
          <div className="space-y-4">
            {visitors.map((v) => (
              <div 
                key={v.id} 
                onClick={() => router.push(`/profile/${v.userId}`)}
                className="bg-gray-50 border border-gray-100 p-4 rounded-[2rem] flex items-center gap-4 transition-all active:scale-95 cursor-pointer"
              >
                <Avatar className="w-14 h-14 border-2 border-white shadow-sm">
                  <AvatarImage src={v.photo} className="object-cover" />
                  <AvatarFallback className="bg-primary text-white font-black">{v.username?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-sm font-black text-gray-900 leading-tight">{v.username}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                    {v.timestamp ? format(v.timestamp.toDate(), "MMM d, HH:mm") : "Recently"}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 opacity-30">
            <Eye className="w-12 h-12" />
            <p className="text-[10px] font-black uppercase tracking-widest">No visitors yet</p>
          </div>
        )}
      </main>
    </div>
  )
}
