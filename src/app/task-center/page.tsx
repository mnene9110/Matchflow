
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw, Trophy, Loader2, ChevronLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirestore, useUser, useDoc, useMemoFirebase, useFirebase } from "@/firebase"
import { doc, writeBatch, increment, collection, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const REWARDS = [5, 5, 10, 5, 5, 7, 50]

export default function TaskCenterPage() {
  const router = useRouter()
  const { user } = useUser()
  const { firestore } = useFirebase()
  const { toast } = useToast()
  
  const [isClaiming, setIsClaiming] = useState(false)
  const [todayStr, setTodayStr] = useState<string>("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTodayStr(new Date().toISOString().split('T')[0]);
    setMounted(true);
  }, []);

  const userRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "userProfiles", user.uid)
  }, [firestore, user])

  const { data: profile, isLoading } = useDoc(userRef)

  const lastCheckIn = profile?.lastCheckInDate || ""
  const streak = profile?.checkInStreak || 0
  const canClaim = !!todayStr && lastCheckIn !== todayStr

  const handleClaim = async () => {
    if (!user || !firestore || !userRef || isClaiming || !canClaim || !todayStr) return
    setIsClaiming(true)

    try {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      
      let newStreak = 1
      if (profile?.lastCheckInDate === yesterdayStr) {
        newStreak = ((profile?.checkInStreak || 0) % 7) + 1
      }
      const rewardAmount = REWARDS[newStreak - 1]

      const batch = writeBatch(firestore);
      const txRef = doc(collection(userRef, "transactions"));
      
      batch.update(userRef, {
        coinBalance: increment(rewardAmount),
        lastCheckInDate: todayStr,
        checkInStreak: newStreak,
        lastActiveAt: serverTimestamp(),
        updatedAt: new Date().toISOString()
      });

      batch.set(txRef, {
        id: txRef.id,
        type: "check-in",
        amount: rewardAmount,
        transactionDate: new Date().toISOString(),
        description: `Daily check-in reward (Day ${newStreak})`
      });

      await batch.commit();

      toast({ title: "Coins Claimed!", description: `You've received ${rewardAmount} coins.` })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Claim Failed", description: "An error occurred." })
    } finally {
      setIsClaiming(false)
    }
  }

  const darkMaroon = "text-[#5A1010]";
  const darkMaroonBg = "bg-[#5A1010]";

  if (!mounted || isLoading) {
    return (
      <div className="flex h-svh items-center justify-center bg-[#FF3737]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-white" />
          <span className="text-[10px] font-black uppercase text-white/60 tracking-[0.2em]">Checking rewards...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-svh bg-transparent text-gray-900 overflow-hidden font-body">
      <header className="px-6 pt-12 pb-6 flex items-center justify-between shrink-0 relative">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-gray-900 hover:bg-white/40"><ChevronLeft className="w-6 h-6" /></Button>
        <div className="text-center"><h1 className={cn("text-xl font-black font-headline tracking-widest uppercase", darkMaroon)}>Task Center</h1><p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-1">Daily Flow Rewards</p></div>
        <Button variant="ghost" size="icon" onClick={() => window.location.reload()} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-gray-900 hover:bg-white/40"><RotateCcw className="w-5 h-5" /></Button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-20 space-y-8 scroll-smooth">
        <section className="bg-white/40 backdrop-blur-xl rounded-[3rem] p-8 border border-white/40 relative overflow-hidden shadow-2xl">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-2"><h2 className={cn("text-3xl font-black font-headline leading-tight", darkMaroon)}>Daily Attendance</h2><p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Maintain your streak for massive bonuses</p></div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center"><Trophy className="w-5 h-5 text-primary" /></div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            {REWARDS.slice(0, 4).map((reward, i) => {
              const dayNum = i + 1; const isActive = streak >= dayNum; const isCurrent = (streak % 7) + 1 === dayNum && canClaim;
              return (<div key={i} className={cn("aspect-square rounded-[1.75rem] border flex flex-col items-center justify-center gap-2 transition-all duration-500", isActive ? "bg-[#5A1010] border-[#5A1010] shadow-lg" : isCurrent ? "bg-white/60 border-primary animate-pulse" : "bg-white/20 border-white/30")}><span className={cn("text-[8px] font-black uppercase tracking-widest", isActive ? "text-white/60" : "text-gray-400")}>Day {dayNum}</span><div className="flex flex-col items-center"><div className={cn("w-6 h-6 rounded-full flex items-center justify-center mb-0.5", isActive ? "bg-white/20" : "bg-primary/10")}>{isActive ? <Check className="w-3 h-3 text-white stroke-[4]" /> : <span className="font-black text-[10px] text-primary italic">S</span>}</div><span className={cn("text-[10px] font-black", isActive ? "text-white" : "text-gray-900")}>{reward}</span></div></div>)
            })}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {REWARDS.slice(4).map((reward, i) => {
              const dayNum = i + 5; const isActive = streak >= dayNum; const isCurrent = (streak % 7) + 1 === dayNum && canClaim;
              return (<div key={i} className={cn("aspect-square rounded-[2rem] border flex flex-col items-center justify-center gap-2 transition-all relative", isActive ? "bg-[#5A1010] border-[#5A1010] shadow-lg" : isCurrent ? "bg-white/60 border-primary animate-pulse" : "bg-white/20 border-white/30")}><span className={cn("text-[8px] font-black uppercase tracking-widest", isActive ? "text-white/60" : "text-gray-400")}>Day {dayNum}</span><div className="flex flex-col items-center"><div className={cn("w-8 h-8 rounded-full flex items-center justify-center mb-1", isActive ? "bg-white/20" : "bg-primary/10")}>{isActive ? <Check className="w-4 h-4 text-white stroke-[4]" /> : <span className="font-black text-xs text-primary italic">S</span>}</div><span className={cn("text-xs font-black", isActive ? "text-white" : "text-gray-900")}>{reward}</span></div></div>)
            })}
          </div>

          <Button onClick={handleClaim} disabled={!canClaim || isClaiming} className={cn("w-full h-18 rounded-full text-white text-xl font-black uppercase tracking-widest mt-10 shadow-2xl transition-all active:scale-95", canClaim ? darkMaroonBg : "bg-gray-200 text-gray-400")}>{isClaiming ? <Loader2 className="w-6 h-6 animate-spin" /> : canClaim ? "Claim Reward" : "Already Claimed"}</Button>
        </section>
      </main>
    </div>
  )
}
