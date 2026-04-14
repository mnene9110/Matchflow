
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, Eye, ArrowRight, Lock, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, onSnapshot, doc, runTransaction, increment } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

const UNLOCK_COST = 500

export default function VisitorsPage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore } = useFirebase()
  const { toast } = useToast()
  
  const [visitors, setVisitors] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUnlocking, setIsUnlocking] = useState(false)

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

  const handleUnlock = async () => {
    if (!currentUser || !firestore || !profile || isUnlocking) return
    
    if ((profile.coinBalance || 0) < UNLOCK_COST) {
      toast({ variant: "destructive", title: "Insufficient Coins", description: `You need ${UNLOCK_COST} coins to unlock.` })
      return
    }

    setIsUnlocking(true)
    try {
      await runTransaction(firestore, async (transaction) => {
        const mySnap = await transaction.get(meRef!)
        if (!mySnap.exists()) return

        const currentBalance = mySnap.data().coinBalance || 0
        if (currentBalance < UNLOCK_COST) throw new Error("INSUFFICIENT_COINS")

        transaction.update(meRef!, {
          coinBalance: increment(-UNLOCK_COST),
          visitorsUnlocked: true,
          updatedAt: new Date().toISOString()
        })

        const txRef = doc(collection(meRef!, "transactions"))
        transaction.set(txRef, {
          id: txRef.id,
          type: "visitor_unlock",
          amount: -UNLOCK_COST,
          transactionDate: new Date().toISOString(),
          description: "Unlocked profile visitors list"
        })
      })

      toast({ title: "Unlocked!", description: "You can now see your visitors." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Unlock Failed", description: e.message === "INSUFFICIENT_COINS" ? "Not enough coins." : "Error occurred." })
    } finally {
      setIsUnlocking(false)
    }
  }

  const isUnlocked = !!profile?.visitorsUnlocked || profile?.isAdmin || profile?.isSupport

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

      <main className="flex-1 overflow-y-auto px-6 pt-8 pb-20 relative">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {visitors.length > 0 ? (
              <div className="space-y-4">
                {visitors.map((v) => (
                  <div 
                    key={v.id} 
                    onClick={() => isUnlocked && router.push(`/profile/${v.userId}`)}
                    className={cn(
                      "bg-gray-50 border border-gray-100 p-4 rounded-[2rem] flex items-center gap-4 transition-all active:scale-95",
                      isUnlocked ? "cursor-pointer" : "cursor-default"
                    )}
                  >
                    <Avatar className={cn("w-14 h-14 border-2 border-white shadow-sm", !isUnlocked && "blur-sm")}>
                      <AvatarImage src={v.photo} className="object-cover" />
                      <AvatarFallback className="bg-primary text-white font-black">{v.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className={cn("text-sm font-black text-gray-900 leading-tight", !isUnlocked && "blur-[4px] select-none")}>
                        {isUnlocked ? v.username : "Someone"}
                      </h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        {v.timestamp ? format(v.timestamp.toDate(), "MMM d, HH:mm") : "Recently"}
                      </p>
                    </div>
                    {isUnlocked && <ArrowRight className="w-4 h-4 text-gray-300" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 opacity-30">
                <Eye className="w-12 h-12" />
                <p className="text-[10px] font-black uppercase tracking-widest">No visitors yet</p>
              </div>
            )}
          </div>
        )}

        {!isUnlocked && !isLoading && (
          <div className="fixed inset-0 top-[88px] z-20 bg-white/40 backdrop-blur-md flex items-center justify-center p-8">
            <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-gray-100 text-center space-y-8 w-full max-w-sm animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto border-4 border-white shadow-lg">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black font-headline text-gray-900">Who's viewing you?</h2>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  Unlock your visitor list to see who has been checking out your profile.
                </p>
              </div>
              <Button 
                onClick={handleUnlock}
                disabled={isUnlocking}
                className="w-full h-16 rounded-full bg-zinc-900 text-white font-black text-lg gap-3 shadow-xl active:scale-95 transition-all"
              >
                {isUnlocking ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <span>Unlock for {UNLOCK_COST}</span>
                    <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[10px] italic">S</div>
                  </>
                )}
              </Button>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">One-time payment</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
