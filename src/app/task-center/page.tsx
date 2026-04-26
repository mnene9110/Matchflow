"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw, Trophy, Loader2, ChevronLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase } from "@/firebase/provider"
import { doc, runTransaction, serverTimestamp, collection } from "firebase/firestore"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const REWARDS = [5, 5, 10, 5, 5, 7, 50]

export default function TaskCenterPage() {
  const router = useRouter()
  const { firestore } = useFirebase()
  const { user, profile, isLoading } = useSupabaseUser()
  const { toast } = useToast()
  
  const [isClaiming, setIsClaiming] = useState(false)
  const [todayStr, setTodayStr] = useState<string>("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTodayStr(new Date().toISOString().split('T')[0]);
    setMounted(true);
  }, []);

  const lastCheckIn = profile?.last_check_in_date || ""
  const streak = profile?.check_in_streak || 0
  const canClaim = !!todayStr && lastCheckIn !== todayStr

  const handleClaim = async () => {
    if (!user || isClaiming || !canClaim || !todayStr || !profile) return
    setIsClaiming(true)
    
    try {
      await runTransaction(firestore, async (transaction) => {
        const profileRef = doc(firestore, "userProfiles", user.id);
        const profDoc = await transaction.get(profileRef);
        if (!profDoc.exists()) throw new Error("Profile not found");

        const data = profDoc.data();
        const lastCheck = data.lastCheckInDate || "";
        if (lastCheck === todayStr) throw new Error("ALREADY_CLAIMED");

        // Calculate streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = 1;
        if (lastCheck === yesterdayStr) {
          newStreak = (data.checkInStreak % 7) + 1;
        }

        const reward = REWARDS[newStreak - 1];

        transaction.update(profileRef, {
          coinBalance: (data.coinBalance || 0) + reward,
          lastCheckInDate: todayStr,
          checkInStreak: newStreak,
          updatedAt: serverTimestamp()
        });

        const logRef = doc(collection(firestore, `userProfiles/${user.id}/transactions`));
        transaction.set(logRef, {
          type: "check-in",
          amount: reward,
          description: `Daily check-in Day ${newStreak}`,
          transactionDate: new Date().toISOString()
        });
      });

      toast({ title: "Coins Claimed!", description: "Come back tomorrow!" });
      router.refresh();
    } catch (error: any) {
      if (error.message === "ALREADY_CLAIMED") {
        toast({ variant: "destructive", title: "Already Claimed", description: "Come back tomorrow!" });
      } else {
        toast({ variant: "destructive", title: "Claim Failed" });
      }
    } finally {
      setIsClaiming(false);
    }
  }

  if (!mounted || isLoading) return <div className="flex h-svh items-center justify-center bg-[#3BC1A8]"><Loader2 className="w-10 h-10 animate-spin text-white" /></div>

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900 overflow-hidden font-body scroll-smooth">
      <header className="px-6 pt-12 pb-6 flex items-center justify-between shrink-0 relative bg-[#3BC1A8] text-white">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white"><ChevronLeft className="w-6 h-6" /></Button>
        <div className="text-center"><h1 className="text-xl font-black font-headline tracking-widest uppercase">Task Center</h1></div>
        <Button variant="ghost" size="icon" onClick={() => window.location.reload()} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white"><RotateCcw className="w-5 h-5" /></Button>
      </header>
      <main className="flex-1 overflow-y-auto px-6 pb-20 space-y-8 pt-6">
        <section className="bg-gray-50 rounded-[3rem] p-8 border border-gray-100 relative overflow-hidden shadow-sm">
          <div className="flex justify-between items-start mb-8"><div className="space-y-2"><h2 className="text-3xl font-black font-headline leading-tight text-gray-900">Daily Attendance</h2></div><div className="w-12 h-12 rounded-2xl bg-[#3BC1A8]/10 border border-[#3BC1A8]/20 flex items-center justify-center"><Trophy className="w-5 h-5 text-[#3BC1A8]" /></div></div>
          <div className="grid grid-cols-4 gap-3 mb-4">{REWARDS.slice(0, 4).map((reward, i) => { const dayNum = i + 1; const isActive = streak >= dayNum; return (<div key={i} className={cn("aspect-square rounded-[1.75rem] border flex flex-col items-center justify-center gap-2 transition-all duration-500", isActive ? "bg-[#3BC1A8] border-[#3BC1A8] shadow-lg" : "bg-white border-gray-100")}><span className={cn("text-[8px] font-black uppercase tracking-widest", isActive ? "text-white/60" : "text-gray-400")}>Day {dayNum}</span><div className="flex flex-col items-center"><div className={cn("w-6 h-6 rounded-full flex items-center justify-center mb-0.5", isActive ? "bg-white/20" : "bg-[#3BC1A8]/10")}>{isActive ? <Check className="w-3 h-3 text-white stroke-[4]" /> : <span className="font-black text-[10px] text-[#3BC1A8] italic">S</span>}</div><span className={cn("text-[10px] font-black", isActive ? "text-white" : "text-gray-900")}>{reward}</span></div></div>) })}</div>
          <div className="grid grid-cols-3 gap-3">{REWARDS.slice(4).map((reward, i) => { const dayNum = i + 5; const isActive = streak >= dayNum; return (<div key={i} className={cn("aspect-square rounded-[2rem] border flex flex-col items-center justify-center gap-2 transition-all relative", isActive ? "bg-[#3BC1A8] border-[#3BC1A8] shadow-lg" : "bg-white border-gray-100")}><span className={cn("text-[8px] font-black uppercase tracking-widest", isActive ? "text-white/60" : "text-gray-400")}>Day {dayNum}</span><div className="flex flex-col items-center"><div className={cn("w-8 h-8 rounded-full flex items-center justify-center mb-1", isActive ? "bg-white/20" : "bg-[#3BC1A8]/10")}>{isActive ? <Check className="w-4 h-4 text-white stroke-[4]" /> : <span className="font-black text-xs text-[#3BC1A8] italic">S</span>}</div><span className="text-xs font-black">{isActive ? "CLAIMED" : reward}</span></div></div>) })}</div>
          <Button onClick={handleClaim} disabled={!canClaim || isClaiming} className={cn("w-full h-18 rounded-full text-white text-xl font-black uppercase tracking-widest mt-10 shadow-2xl transition-all active:scale-95", canClaim ? "bg-zinc-900" : "bg-gray-200 text-gray-400")}>{isClaiming ? <Loader2 className="w-6 h-6 animate-spin" /> : canClaim ? "Claim Reward" : "Already Claimed"}</Button>
        </section>
      </main>
    </div>
  )
}
