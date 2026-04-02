"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw, Trophy, Loader2, ChevronLeft, Check } from "lucide-react"
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
    // CRITICAL: Prevent Hydration Mismatch by moving date calculation to Client-side
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

        // Persistence: Check if streak is continued or reset
        if (lastDate === yesterdayStr) {
          newStreak = (currentStreak % 7) + 1
        }

        const rewardAmount = REWARDS[newStreak - 1]
        const currentBalance = userDoc.data()?.coinBalance || 0

        // Security: Prevent double claim and update balance
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

  const darkMaroon = "text-[#5A1010]";
  const darkMaroonBg = "bg-[#5A1010]";

  // Match the app's background to stop the "blinking"
  if (!mounted || isLoading) {
    return (
      <div className="flex h-svh items-center justify-center bg-[#B36666]">
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
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-gray-900 hover:bg-white/40"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        
        <div className="text-center">
          <h1 className={cn("text-xl font-black font-headline tracking-widest uppercase", darkMaroon)}>Task Center</h1>
          <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-1">Daily Flow Rewards</p>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => window.location.reload()}
          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-gray-900 hover:bg-white/40"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-20 space-y-8 scroll-smooth">
        <section className="bg-white/40 backdrop-blur-xl rounded-[3rem] p-8 border border-white/40 relative overflow-hidden shadow-2xl shadow-black/5">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-2">
              <h2 className={cn("text-3xl font-black font-headline leading-tight", darkMaroon)}>Daily Attendance</h2>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest max-w-[150px]">
                Maintain your streak for massive bonuses
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
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
                    "aspect-square rounded-[1.75rem] border flex flex-col items-center justify-center gap-2 transition-all duration-500",
                    isActive ? "bg-[#5A1010] border-[#5A1010] shadow-lg shadow-[#5A1010]/20" : 
                    isCurrent ? "bg-white/60 border-primary animate-pulse" : "bg-white/20 border-white/30"
                  )}
                >
                  <span className={cn("text-[8px] font-black uppercase tracking-widest", isActive ? "text-white/60" : "text-gray-400")}>Day {dayNum}</span>
                  <div className="flex flex-col items-center">
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center mb-0.5", isActive ? "bg-white/20" : "bg-primary/10")}>
                      {isActive ? <Check className="w-3 h-3 text-white stroke-[4]" /> : <span className="font-black text-[10px] text-primary italic">S</span>}
                    </div>
                    <span className={cn("text-[10px] font-black", isActive ? "text-white" : "text-gray-900")}>{reward}</span>
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
                    isActive ? "bg-[#5A1010] border-[#5A1010] shadow-lg shadow-[#5A1010]/20" : 
                    isCurrent ? "bg-white/60 border-primary animate-pulse" : "bg-white/20 border-white/30"
                  )}
                >
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isActive ? "text-white/60" : "text-gray-400")}>Day {dayNum}</span>
                  <div className="flex flex-col items-center">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center mb-1", isActive ? "bg-white/20" : "bg-primary/10")}>
                      {isActive ? <Check className="w-4 h-4 text-white stroke-[4]" /> : <span className="font-black text-xs text-primary italic">S</span>}
                    </div>
                    <span className={cn("text-xs font-black", isActive ? "text-white" : "text-gray-900")}>{reward}</span>
                  </div>
                  {dayNum === 7 && (
                    <div className="absolute -top-2 -right-1 px-2 py-0.5 bg-primary rounded-full text-[7px] font-black text-white uppercase tracking-tighter shadow-sm">Super</div>
                  )}
                </div>
              )
            })}
          </div>

          <Button 
            onClick={handleClaim}
            disabled={!canClaim || isClaiming}
            className={cn(
              "w-full h-18 rounded-full text-white text-xl font-black uppercase tracking-widest mt-10 shadow-2xl transition-all active:scale-95",
              canClaim ? cn(darkMaroonBg, "hover:opacity-90") : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {isClaiming ? <Loader2 className="w-6 h-6 animate-spin" /> : canClaim ? "Claim Reward" : "Already Claimed"}
          </Button>
        </section>

        <section className="flex flex-col items-center justify-center gap-4 py-10 opacity-40">
           <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30">
              <RotateCcw className="w-5 h-5 text-gray-900" />
           </div>
           <div className="text-center space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Streak Count</p>
              <p className="text-2xl font-black font-headline">{streak} Days Consecutively</p>
           </div>
        </section>
      </main>
    </div>
  )
}