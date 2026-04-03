
"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Gamepad2, Coins, Trophy, Loader2, Star, Sparkles, Dice5, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase, useUser, useMemoFirebase } from "@/firebase"
import { doc, updateDoc, increment as firestoreIncrement, setDoc, collection } from "firebase/firestore"
import { ref, onValue, runTransaction as runRtdbTransaction } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const GAME_BETS = [20, 50, 100, 200, 500]

// Define wheel values based on bet amounts
const WHEEL_CONFIGS = {
  low: [5, 50, 10, 25, 2, 40, 15, 30],        // For bet < 50 (Max 50)
  mid: [20, 300, 50, 150, 10, 250, 100, 200], // For bet 50-100 (Max 300)
  high: [50, 1000, 150, 500, 25, 750, 250, 400] // For bet 200-500 (Max 1000)
}

export default function GamesCenterPage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore, database } = useFirebase()
  const { toast } = useToast()

  const [userCoins, setUserCoins] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedBet, setSelectedBet] = useState<number | null>(null)
  const [rotation, setRotation] = useState(0)
  const [gameResult, setGameResult] = useState<{ winner: boolean; pot: number } | null>(null)
  const [pendingResult, setPendingResult] = useState<{ winner: boolean; pot: number } | null>(null)

  // Determine current wheel values based on selected bet
  const currentWheelValues = useMemo(() => {
    if (!selectedBet) return WHEEL_CONFIGS.low;
    if (selectedBet < 50) return WHEEL_CONFIGS.low;
    if (selectedBet <= 100) return WHEEL_CONFIGS.mid;
    return WHEEL_CONFIGS.high;
  }, [selectedBet]);

  useEffect(() => {
    if (!database || !currentUser) return
    const coinRef = ref(database, `users/${currentUser.uid}/coinBalance`)
    return onValue(coinRef, (snap) => setUserCoins(snap.val() || 0))
  }, [database, currentUser])

  const handleLuckySpin = async () => {
    if (!currentUser || !selectedBet || isSpinning) return
    if (userCoins < selectedBet) {
      toast({ variant: "destructive", title: "Insufficient Coins", description: "Recharge to play!" })
      return
    }

    setIsSpinning(true)
    setGameResult(null)
    setPendingResult(null)

    try {
      // 1. Deduct Bet (Immediate)
      const userRef = ref(database, `users/${currentUser.uid}/coinBalance`)
      const result = await runRtdbTransaction(userRef, (curr) => {
        if (curr === null) return curr
        if (curr < selectedBet) return undefined
        return curr - selectedBet
      })

      if (!result.committed) throw new Error("INSUFFICIENT_COINS")

      const pRef = doc(firestore, "userProfiles", currentUser.uid)
      updateDoc(pRef, { coinBalance: firestoreIncrement(-selectedBet), updatedAt: new Date().toISOString() })
      
      const txRef = doc(collection(pRef, "transactions"))
      setDoc(txRef, {
        id: txRef.id,
        type: "game_bet",
        amount: -selectedBet,
        transactionDate: new Date().toISOString(),
        description: `Bet ${selectedBet} coins in Solo Spin`
      })

      // 2. Determine Winner Index (Visual)
      const winnerIndex = Math.floor(Math.random() * 8)
      const winAmount = currentWheelValues[winnerIndex]
      
      // 3. Start Animation (6 full spins + target)
      const extraSpins = 6
      const segmentAngle = 45
      const currentRotationBase = Math.floor(rotation / 360) * 360
      const targetAngle = (360 - (winnerIndex * segmentAngle)) % 360
      const newRotation = currentRotationBase + (extraSpins * 360) + targetAngle
      
      setRotation(newRotation)

      // 4. Pre-prepare the win result while spinning
      const winData = { winner: winAmount > 0, pot: winAmount }
      setPendingResult(winData)

      // Process win in background so it's ready when wheel stops
      if (winAmount > 0) {
        runRtdbTransaction(userRef, (curr) => (curr || 0) + winAmount)
        updateDoc(pRef, { coinBalance: firestoreIncrement(winAmount), updatedAt: new Date().toISOString() })
        
        const winTxRef = doc(collection(pRef, "transactions"))
        setDoc(winTxRef, {
          id: winTxRef.id,
          type: "game_win",
          amount: winAmount,
          transactionDate: new Date().toISOString(),
          description: `Won ${winAmount} coins in Solo Spin!`
        })
      }

    } catch (e: any) {
      toast({ variant: "destructive", title: "Game Error", description: e.message })
      setIsSpinning(false)
    }
  }

  const handleAnimationEnd = () => {
    if (isSpinning && pendingResult) {
      setGameResult(pendingResult)
      setPendingResult(null)
      setIsSpinning(false)
    }
  }

  const darkMaroon = "bg-[#5A1010]";

  return (
    <div className="flex flex-col h-svh bg-transparent text-gray-900 overflow-hidden relative">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-transparent z-50 shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-gray-900 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Games Center</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-2 pb-40 space-y-10 scroll-smooth">
        {/* Balance Card */}
        <section className="bg-zinc-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-6 opacity-10"><Gamepad2 className="w-32 h-32" /></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center"><Coins className="w-5 h-5 text-amber-500" /></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Your Wallet</span>
            </div>
            <div className="flex flex-col">
              <span className="text-5xl font-black font-headline tracking-tighter">{userCoins.toLocaleString()}</span>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Ready for bets</p>
            </div>
          </div>
        </section>

        {/* Solo Spinning Wheel Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Dice5 className="w-4 h-4 text-purple-500" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Solo Lucky Spin</h2>
            </div>
            <div className="px-3 py-1 bg-purple-50 rounded-full border border-purple-100">
              <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">
                Max Win: {selectedBet ? (selectedBet < 50 ? "50" : selectedBet <= 100 ? "300" : "1000") : "..."}
              </span>
            </div>
          </div>

          <div className="relative w-full aspect-square max-w-[280px] mx-auto group">
            <div 
              onTransitionEnd={handleAnimationEnd}
              style={{ 
                transform: `rotate(${rotation}deg)`,
                transitionTimingFunction: 'cubic-bezier(0.1, 0, 0.1, 1)' 
              }}
              className={cn(
                "w-full h-full rounded-full border-[10px] border-zinc-900 relative flex items-center justify-center shadow-2xl transition-transform duration-[4000ms] overflow-hidden"
              )}
            >
              <div className="absolute inset-0 bg-zinc-800" />
              {currentWheelValues.map((val, i) => (
                <div 
                  key={i} 
                  className="absolute inset-0 flex justify-center pt-6 origin-center"
                  style={{ transform: `rotate(${i * 45}deg)` }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-white font-black text-xs drop-shadow-md">{val}</span>
                    <Coins className="w-2.5 h-2.5 text-amber-500/40" />
                  </div>
                  <div className="absolute top-0 bottom-1/2 left-1/2 w-px bg-zinc-900/30 -translate-x-1/2" />
                </div>
              ))}
              
              <div className="w-14 h-14 bg-zinc-900 rounded-full flex items-center justify-center border-4 border-amber-500/30 z-10 shadow-xl">
                <Trophy className={cn("w-5 h-5 text-amber-500 transition-transform", isSpinning && "scale-110 animate-pulse")} />
              </div>
            </div>
            
            {/* The Pointer Arrow (Top center) */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-10 bg-zinc-900 rounded-b-full z-20 shadow-xl border-2 border-white flex items-center justify-center">
               <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {GAME_BETS.map((bet) => (
              <button
                key={bet}
                onClick={() => !isSpinning && setSelectedBet(bet)}
                disabled={isSpinning}
                className={cn(
                  "h-12 rounded-2xl flex items-center justify-center transition-all border-2 font-black text-[10px]",
                  selectedBet === bet 
                    ? "bg-purple-600 border-purple-400 text-white scale-105" 
                    : "bg-white border-gray-100 text-gray-400"
                )}
              >
                {bet}
              </button>
            ))}
          </div>

          <Button 
            onClick={handleLuckySpin}
            disabled={!selectedBet || isSpinning || userCoins < (selectedBet || 0)}
            className={cn(
              "w-full h-18 rounded-full text-white font-black text-lg shadow-2xl active:scale-95 transition-all",
              selectedBet && userCoins >= selectedBet ? darkMaroon : "bg-gray-200 text-gray-400"
            )}
          >
            {isSpinning ? "SPINNING..." : "PLACE BET"}
          </Button>
        </section>

        {/* Rules Footer */}
        <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 space-y-2 opacity-60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-blue-500" />
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Lucky Spin Rules</p>
          </div>
          <p className="text-[10px] font-medium text-blue-400 leading-relaxed">
            The wheel values change based on your bet amount. Higher bets unlock the potential for 1,000 coin jackpots!
          </p>
        </div>
      </main>

      {/* Result Overlay */}
      {gameResult && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="text-center space-y-6">
            {gameResult.winner ? (
              <>
                <div className="w-32 h-32 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border-4 border-amber-500 animate-bounce">
                  <Trophy className="w-16 h-16 text-amber-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-5xl font-black font-headline text-green-500 uppercase tracking-tighter">WON!</h2>
                  <p className="text-white font-bold text-xl">{gameResult.pot} COINS</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-32 h-32 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border-4 border-red-500/20">
                  <Dice5 className="w-16 h-16 text-red-500/40" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-black font-headline text-white/40 uppercase tracking-widest">LOST</h2>
                </div>
              </>
            )}
            <Button onClick={() => setGameResult(null)} className="mt-10 rounded-full bg-white text-zinc-900 px-12 h-14 font-black uppercase text-xs tracking-widest">CLOSE</Button>
          </div>
        </div>
      )}
    </div>
  )
}
