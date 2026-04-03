
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Gamepad2, Coins, Trophy, Loader2, Sparkles, Dice5 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase, useUser } from "@/firebase"
import { doc, writeBatch, increment as firestoreIncrement, collection } from "firebase/firestore"
import { ref, onValue, runTransaction as runRtdbTransaction } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const GAME_BETS = [20, 50, 100, 200, 500]

const SEGMENT_COLORS = [
  '#eae56f', '#89f26e', '#7de6ef', '#e7706f', 
  '#f2a65a', '#f2c65a', '#a65af2', '#5af2a6'
]

const WHEEL_CONFIGS = {
  low: [5, 50, 10, 25, 2, 40, 15, 30],        // For bet < 50
  mid: [20, 300, 50, 150, 10, 250, 100, 200], // For bet 50-100
  high: [25, 1000, 50, 500, 100, 750, 150, 350] // For bet 200-500
}

export default function GamesCenterPage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore, database } = useFirebase()
  const { toast } = useToast()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [userCoins, setUserCoins] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedBet, setSelectedBet] = useState<number | null>(null)
  const [rotation, setRotation] = useState(0)
  const [gameResult, setGameResult] = useState<{ winner: boolean; pot: number } | null>(null)
  const [pendingResult, setPendingResult] = useState<{ winner: boolean; pot: number } | null>(null)

  const currentWheelValues = useMemo(() => {
    if (!selectedBet) return WHEEL_CONFIGS.low;
    if (selectedBet < 50) return WHEEL_CONFIGS.low;
    if (selectedBet <= 100) return WHEEL_CONFIGS.mid;
    return WHEEL_CONFIGS.high;
  }, [selectedBet]);

  // Draw the wheel whenever values or colors are ready
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = canvas.width
    const center = size / 2
    const radius = center - 10
    const segmentAngle = (2 * Math.PI) / 8

    ctx.clearRect(0, 0, size, size)

    currentWheelValues.forEach((val, i) => {
      // Draw Segment
      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.arc(center, center, radius, i * segmentAngle, (i + 1) * segmentAngle)
      ctx.fillStyle = SEGMENT_COLORS[i]
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw Text
      ctx.save()
      ctx.translate(center, center)
      ctx.rotate(i * segmentAngle + segmentAngle / 2)
      ctx.textAlign = "right"
      ctx.fillStyle = "#333333"
      ctx.font = "bold 16px Space Grotesk"
      ctx.fillText(val.toString(), radius - 20, 5)
      ctx.restore()
    })

    // Outer Border
    ctx.beginPath()
    ctx.arc(center, center, radius, 0, 2 * Math.PI)
    ctx.strokeStyle = '#333333'
    ctx.lineWidth = 8
    ctx.stroke()
  }, [currentWheelValues])

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
      // 1. Deduct Bet (Immediate RTDB)
      const userRef = ref(database, `users/${currentUser.uid}/coinBalance`)
      const result = await runRtdbTransaction(userRef, (curr) => {
        if (curr === null) return curr
        if (curr < selectedBet) return undefined
        return curr - selectedBet
      })

      if (!result.committed) throw new Error("INSUFFICIENT_COINS")

      // 2. Determine Winner Index
      const winnerIndex = Math.floor(Math.random() * 8)
      const winAmount = currentWheelValues[winnerIndex]

      // 3. Batch Firestore balance update + transaction log (Reduction)
      const batch = writeBatch(firestore);
      const pRef = doc(firestore, "userProfiles", currentUser.uid);
      const txRef = doc(collection(pRef, "transactions"));
      batch.update(pRef, { coinBalance: firestoreIncrement(-selectedBet), updatedAt: new Date().toISOString() });
      batch.set(txRef, {
        id: txRef.id,
        type: "game_bet",
        amount: -selectedBet,
        transactionDate: new Date().toISOString(),
        description: `Bet ${selectedBet} coins in Lucky Spin`
      });
      await batch.commit();

      // 4. Calculate Rotation (10 spins + offset to pointer)
      // Canvas draws segment 0 at 0 radians (3 o'clock). 
      // Pointer is at the top (270 degrees or -90 degrees).
      // To get segment i to the top, we rotate by (270 - (i * 45 + 22.5))
      const extraSpins = 10
      const segmentSize = 45
      const currentRotationBase = Math.floor(rotation / 360) * 360
      const targetAngle = (270 - (winnerIndex * segmentSize + segmentSize / 2))
      const newRotation = currentRotationBase + (extraSpins * 360) + (targetAngle % 360)
      
      setRotation(newRotation)

      const winData = { winner: winAmount > 0, pot: winAmount }
      setPendingResult(winData)

      // 5. Process win in background so it's ready when wheel stops
      if (winAmount > 0) {
        runRtdbTransaction(userRef, (curr) => (curr || 0) + winAmount)
        
        const winBatch = writeBatch(firestore);
        const winTxRef = doc(collection(pRef, "transactions"));
        winBatch.update(pRef, { coinBalance: firestoreIncrement(winAmount), updatedAt: new Date().toISOString() });
        winBatch.set(winTxRef, {
          id: winTxRef.id,
          type: "game_win",
          amount: winAmount,
          transactionDate: new Date().toISOString(),
          description: `Won ${winAmount} coins in Lucky Spin!`
        });
        winBatch.commit();
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
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-gray-900 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Games Center</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-2 pb-40 space-y-10 scroll-smooth">
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

        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Dice5 className="w-4 h-4 text-purple-500" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Lucky Spin Wheel</h2>
            </div>
            <div className="px-3 py-1 bg-purple-50 rounded-full border border-purple-100">
              <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">
                Max Win: {selectedBet ? (selectedBet < 50 ? "50" : selectedBet <= 100 ? "300" : "1000") : "..."}
              </span>
            </div>
          </div>

          <div className="relative w-full aspect-square max-w-[320px] mx-auto">
            {/* The Pointer */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-12 bg-zinc-900 rounded-b-full z-20 shadow-xl border-4 border-white flex items-center justify-center">
               <div className="w-2 h-6 bg-amber-500 rounded-full" />
            </div>

            {/* The Canvas Wheel */}
            <div 
              onTransitionEnd={handleAnimationEnd}
              style={{ transform: `rotate(${rotation}deg)`, transitionTimingFunction: 'cubic-bezier(0.1, 0, 0.1, 1)' }}
              className="w-full h-full transition-transform duration-[5000ms] shadow-2xl rounded-full overflow-hidden"
            >
              <canvas 
                ref={canvasRef} 
                width={400} 
                height={400} 
                className="w-full h-full"
              />
            </div>

            {/* Stable Center Hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border-4 border-amber-500/30 z-10 shadow-xl">
              <Trophy className={cn("w-6 h-6 text-amber-500 transition-transform", isSpinning && "scale-110 animate-pulse")} />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {GAME_BETS.map((bet) => (
              <button key={bet} onClick={() => !isSpinning && setSelectedBet(bet)} disabled={isSpinning} className={cn("h-12 rounded-2xl flex items-center justify-center transition-all border-2 font-black text-[10px]", selectedBet === bet ? "bg-purple-600 border-purple-400 text-white scale-105" : "bg-white border-gray-100 text-gray-400")}>
                {bet}
              </button>
            ))}
          </div>

          <Button onClick={handleLuckySpin} disabled={!selectedBet || isSpinning || userCoins < (selectedBet || 0)} className={cn("w-full h-18 rounded-full text-white font-black text-lg shadow-2xl active:scale-95 transition-all", selectedBet && userCoins >= selectedBet ? darkMaroon : "bg-gray-200 text-gray-400")}>
            {isSpinning ? "SPINNING..." : "PLACE BET"}
          </Button>
        </section>

        <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 space-y-2 opacity-60">
          <div className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-blue-500" /><p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Lucky Spin Rules</p></div>
          <p className="text-[10px] font-medium text-blue-400 leading-relaxed">Wheel values are pre-set based on your bet tier. Land on high-value segments to multiply your coins instantly!</p>
        </div>
      </main>

      {gameResult && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="text-center space-y-6">
            {gameResult.winner ? (
              <><div className="w-32 h-32 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border-4 border-amber-500 animate-bounce"><Trophy className="w-16 h-16 text-amber-500" /></div><div className="space-y-2"><h2 className="text-5xl font-black font-headline text-green-500 uppercase tracking-tighter">WON!</h2><p className="text-white font-bold text-xl">{gameResult.pot} COINS</p></div></>
            ) : (
              <><div className="w-32 h-32 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border-4 border-red-500/20"><Dice5 className="w-16 h-16 text-red-500/40" /></div><div className="space-y-2"><h2 className="text-4xl font-black font-headline text-white/40 uppercase tracking-widest">LOST</h2></div></>
            )}
            <Button onClick={() => setGameResult(null)} className="mt-10 rounded-full bg-white text-zinc-900 px-12 h-14 font-black uppercase text-xs tracking-widest">CLOSE</Button>
          </div>
        </div>
      )}
    </div>
  )
}
