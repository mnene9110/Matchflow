"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X, RotateCcw, Coins, Trophy, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, runTransaction, collection } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const REWARDS = [5, 5, 10, 5, 5, 7, 50]

export default function TaskCenterPage() {
  const router = useRouter()
  const { user } = useUser()
  const firestore = useFirestore()
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
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userRef)
        if (!userDoc.exists()) throw new Error("Profile not found")

        const currentStreak = userDoc.data()?.checkInStreak || 0
        const lastDate = userDoc.data()?.lastCheckInDate || ""
        
        let newStreak = 1
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        if (lastDate === yesterdayStr) {
          newStreak = (currentStreak % 7) + 1
        }

        const rewardAmount = REWARDS[newStreak - 1]
        const currentBalance = userDoc.data()?.coinBalance || 0

        transaction.update(userRef, {
          coinBalance: currentBalance + rewardAmount,
          lastCheckInDate: todayStr,
          checkInStreak: newStreak,
          updatedAt: new Date().toISOString()
        })

        const txRef = doc(collection(userRef, "transactions"))
        transaction.set(txRef, {
          id: txRef.id,
          type: "check-in",
          amount: rewardAmount,
          transactionDate: new Date().toISOString(),
          description: `Daily check-in reward (Day ${newStreak})`
        })
      })

      toast({
        title: "Coins Claimed!",
        description: `You've received your reward for today.`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Claim Failed",
        description: error.message || "An error occurred while claiming rewards.",
      })
    } finally {
      setIsClaiming(false)
    }
  }

  // Prevent hydration mismatch by waiting for mount
  if (!mounted || isLoading) {
    return (
      <div className="flex h-svh items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#FF7A00]" />
          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Preparing rewards...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-svh bg-zinc-950 text-white overflow-hidden font-body">
      <header className="px-6 pt-12 pb-6 flex items-center justify-between shrink-0 relative">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-white/70 hover:bg-zinc-800"
        >
          <X className="w-6 h-6" />
        </Button>
        
        <div className="text-center">
          <h1 className="text-xl font-black font-headline tracking-wider uppercase">Task Center</h1>
          <p className="text-[10px] font-black text-[#FF7A00] tracking-[0.2em] uppercase mt-1">Earn Rewards</p>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => window.location.reload()}
          className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-white/70 hover:bg-zinc-800"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-20 space-y-8 scroll-smooth">
        <section className="bg-zinc-900/50 rounded-[3rem] p-8 border border-zinc-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF7A00]/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-black font-headline leading-tight">Check-in</h2>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest max-w-[150px]">
                Flow streak for bonus coins
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[#FF7A00]" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            {REWARDS.slice(0, 4).map((reward, i) => {
              const dayNum = i + 1
              const isActive = streak >= dayNum
              const isCurrent = (streak % 7) + 1 === dayNum && canClaim
              return (
                <div 
                  key={i}
                  className={cn(
                    "aspect-square rounded-[1.75rem] border flex flex-col items-center justify-center gap-2 transition-all",
                    isActive ? "bg-[#FF7A00] border-[#FF7A00] shadow-[0_0_20px_rgba(255,122,0,0.3)]" : 
                    isCurrent ? "bg-zinc-800 border-[#FF7A00] animate-pulse" : "bg-zinc-800/50 border-zinc-700/50"
                  )}
                >
                  <span className={cn("text-[8px] font-black uppercase tracking-widest", isActive ? "text-white/70" : "text-zinc-500")}>Day {dayNum}</span>
                  <div className="flex flex-col items-center">
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center mb-0.5 shadow-inner", isActive ? "bg-white/20" : "bg-zinc-700")}>
                      <span className={cn("font-black text-[10px] italic", isActive ? "text-white" : "text-[#FF7A00]")}>C</span>
                    </div>
                    <span className={cn("text-[10px] font-black", isActive ? "text-white" : "text-zinc-400")}>{reward}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {REWARDS.slice(4).map((reward, i) => {
              const dayNum = i + 5
              const isActive = streak >= dayNum
              const isCurrent = (streak % 7) + 1 === dayNum && canClaim
              return (
                <div 
                  key={i}
                  className={cn(
                    "aspect-square rounded-[2rem] border flex flex-col items-center justify-center gap-2 transition-all relative",
                    isActive ? "bg-[#FF7A00] border-[#FF7A00] shadow-[0_0_20px_rgba(255,122,0,0.3)]" : 
                    isCurrent ? "bg-zinc-800 border-[#FF7A00] animate-pulse" : "bg-zinc-800/50 border-zinc-700/50"
                  )}
                >
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isActive ? "text-white/70" : "text-zinc-500")}>Day {dayNum}</span>
                  <div className="flex flex-col items-center">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center mb-1 shadow-inner", isActive ? "bg-white/20" : "bg-zinc-700")}>
                      <span className={cn("font-black text-xs italic", isActive ? "text-white" : "text-[#FF7A00]")}>C</span>
                    </div>
                    <span className={cn("text-xs font-black", isActive ? "text-white" : "text-zinc-400")}>{reward}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <Button 
            onClick={handleClaim}
            disabled={!canClaim || isClaiming}
            className={cn(
              "w-full h-18 rounded-full text-zinc-950 text-xl font-black uppercase tracking-widest mt-10 shadow-[0_15px_40px_rgba(255,122,0,0.2)] transition-all active:scale-95",
              canClaim ? "bg-[#FF7A00] hover:bg-[#FF7A00]/90" : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
            )}
          >
            {isClaiming ? <Loader2 className="w-6 h-6 animate-spin" /> : canClaim ? "Claim Daily Coins" : "Already Claimed"}
          </Button>
        </section>

        <section className="grid grid-cols-2 gap-4">
           <div className="bg-zinc-900/50 rounded-[2.5rem] p-6 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                 <div className="w-5 h-5 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <Coins className="w-3 h-3 text-[#FF7A00]" />
                 </div>
                 <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Balance</span>
              </div>
              <p className="text-2xl font-black font-headline">{(profile?.coinBalance || 0).toLocaleString()}</p>
           </div>
           
           <div className="bg-zinc-900/50 rounded-[2.5rem] p-6 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                 <div className="w-5 h-5 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <RotateCcw className="w-3 h-3 text-[#FF7A00]" />
                 </div>
                 <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Streak</span>
              </div>
              <p className="text-2xl font-black font-headline">{streak} Days</p>
           </div>
        </section>
      </main>
    </div>
  )
}