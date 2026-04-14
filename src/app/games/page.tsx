
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Gamepad2, Coins, Trophy, Loader2, Sparkles, Dice5 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { 
  doc, 
  runTransaction, 
  collection, 
  increment as firestoreIncrement 
} from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { getVipLevelFromExp } from "@/app/profile/vip/page"

const GAME_BETS = [20, 50, 100, 200, 500]

const SEGMENT_COLORS = [
  '#eae56f', '#89f26e', '#7de6ef', '#e7706f', 
  '#f2a65a', '#f2c65a', '#a65af2', '#5af2a6',
  '#f25a5a', '#5a89f2', '#f25ad5', '#5af2ef',
  '#b2f25a', '#f29b5a', '#5a62f2', '#f2e15a',
  '#5af284', '#a65af2'
]

const WHEEL_CONFIGS = {
  low: [5, 0, 10, 50, 2, 0, 15, 30, 5, 0, 8, 12, 0, 20, 10, 0, 15, 40],
  mid: [20, 0, 50, 300, 10, 0, 100, 200, 20, 0, 40, 80, 0, 150, 60, 0, 120, 250],
  high: [25, 0, 50, 1000, 100, 0, 150, 500, 50, 0, 100, 200, 0, 400, 150, 0, 300, 800]
}

export default function GamesCenterPage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore } = useFirebase()
  const { toast } = useToast()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedBet, setSelectedBet] = useState<number | null>(null)
  const [rotation, setRotation] = useState(0)
  const [gameResult, setGameResult] = useState<{ winner: boolean; pot: number } | null>(null)
  const [pendingResult, setPendingResult] = useState<{ winner: boolean; pot: number } | null>(null)

  const meRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: profile } = useDoc(meRef)

  const userCoins = profile?.coinBalance || 0

  const currentWheelValues = useMemo(() => {
    if (!selectedBet) return WHEEL_CONFIGS.low;
    if (selectedBet < 50) return WHEEL_CONFIGS.low;
    if (selectedBet <= 100) return WHEEL_CONFIGS.mid;
    return WHEEL_CONFIGS.high;
  }, [selectedBet]);

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = canvas.width
    const center = size / 2
    const radius = center - 10
    const segmentAngle = (2 * Math.PI) / 18

    ctx.clearRect(0, 0, size, size)

    currentWheelValues.forEach((val, i) => {
      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.arc(center, center, radius, i * segmentAngle, (i + 1) * segmentAngle)
      ctx.fillStyle = SEGMENT_COLORS[i]
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.save()
      ctx.translate(center, center)
      ctx.rotate(i * segmentAngle + segmentAngle / 2)
      ctx.textAlign = "right"
      ctx.fillStyle = "#333333"
      ctx.font = "bold 13px Space Grotesk"
      ctx.fillText(val.toString(), radius - 15, 5)
      ctx.restore()
    })

    ctx.beginPath()
    ctx.arc(center, center, radius, 0, 2 * Math.PI)
    ctx.strokeStyle = '#333333'
    ctx.lineWidth = 8
    ctx.stroke()
  }, [currentWheelValues])

  const handleLuckySpin = async () => {
    if (!currentUser || !selectedBet || isSpinning || !firestore) return
    if (userCoins < selectedBet) {
      toast({ variant: "destructive", title: "Insufficient Coins", description: "Recharge to play!" })
      return
    }

    setIsSpinning(true)
    setGameResult(null)
    setPendingResult(null)

    try {
      const winnerIndex = Math.floor(Math.random() * 18)
      const winAmount = currentWheelValues[winnerIndex]

      await runTransaction(firestore, async (transaction) => {
        const snap = await transaction.get(meRef!);
        const currentData = snap.data();
        const currentBalance = currentData?.coinBalance || 0;
        
        if (currentBalance < selectedBet) throw new Error("INSUFFICIENT_COINS");

        const netChange = winAmount - selectedBet;
        
        // Gaining coins (+) grants EXP
        let expToGain = 0;
        if (winAmount > selectedBet) {
          expToGain = winAmount - selectedBet;
        }

        const currentExp = (currentData?.vipExp || 0) + expToGain;
        const newLevel = getVipLevelFromExp(currentExp);

        transaction.update(meRef!, { 
          coinBalance: firestoreIncrement(netChange),
          vipExp: firestoreIncrement(expToGain),
          vipLevel: newLevel,
          updatedAt: new Date().toISOString()
        });

        const txRef = doc(collection(meRef!, "transactions"));
        transaction.set(txRef, {
          id: txRef.id,
          type: "game_result",
          amount: netChange,
          bet: selectedBet,
          win: winAmount,
          transactionDate: new Date().toISOString(),
          description: `Lucky Spin: Won ${winAmount} coins (+${expToGain} EXP)`
        });
      });

      const extraSpins = 15 
      const segmentSize = 360 / 18
      const randomOffset = (Math.random() - 0.5) * (segmentSize * 0.7)
      const targetLandingAngle = 270 - (winnerIndex * segmentSize + (segmentSize / 2)) + randomOffset
      
      const currentRotation = rotation
      const nextRotation = currentRotation + (extraSpins * 360) + ((targetLandingAngle - (currentRotation % 360) + 360) % 360)
      
      setRotation(nextRotation)
      setPendingResult({ winner: winAmount > 0, pot: winAmount })

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

  return (
    <div className="flex flex-col h-svh bg-zinc-950 text-white overflow-hidden relative">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-transparent z-50 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-white/10 backdrop-blur-md rounded-full shadow-sm"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Games Center</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-2 pb-40 space-y-10 scroll-smooth">
        <section className="bg-[#3BC1A8] rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-20"><Gamepad2 className="w-32 h-32" /></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3"><Coins className="w-5 h-5 text-amber-400" /><span className="text-[10px] font-black uppercase tracking-widest">Available Coins</span></div>
            <span className="text-5xl font-black font-headline tracking-tighter">{userCoins.toLocaleString()}</span>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2"><Dice5 className="w-4 h-4 text-[#3BC1A8]" /><h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Lucky Spin Wheel</h2></div>
          </div>

          <div className="relative w-full aspect-square max-w-[320px] mx-auto">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-12 bg-[#3BC1A8] rounded-b-full z-20 shadow-xl border-4 border-zinc-950 flex items-center justify-center"><div className="w-2 h-6 bg-white rounded-full" /></div>
            <div onTransitionEnd={handleAnimationEnd} style={{ transform: `rotate(${rotation}deg)`, transitionTimingFunction: 'cubic-bezier(0.15, 0, 0.15, 1)' }} className="w-full h-full transition-transform duration-[6000ms] shadow-2xl rounded-full overflow-hidden"><canvas ref={canvasRef} width={400} height={400} className="w-full h-full" /></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-zinc-950 rounded-full flex items-center justify-center border-4 border-[#3BC1A8]/30 z-10 shadow-xl"><Trophy className={cn("w-6 h-6 text-[#3BC1A8]", isSpinning && "scale-110 animate-pulse")} /></div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {GAME_BETS.map((bet) => (<button key={bet} onClick={() => !isSpinning && setSelectedBet(bet)} className={cn("h-12 rounded-2xl flex items-center justify-center transition-all border-2 font-black text-[10px]", selectedBet === bet ? "bg-[#3BC1A8] border-[#3BC1A8] text-white" : "bg-white/5 border-white/5 text-zinc-500")}>{bet}</button>))}
          </div>

          <Button onClick={handleLuckySpin} disabled={!selectedBet || isSpinning || userCoins < (selectedBet || 0)} className={cn("w-full h-18 rounded-full text-white font-black text-lg shadow-2xl transition-all", selectedBet && userCoins >= selectedBet ? "bg-[#3BC1A8]" : "bg-white/5 text-zinc-700")}>
            {isSpinning ? "SPINNING..." : "PLACE BET"}
          </Button>
          <p className="text-[8px] font-black text-zinc-600 uppercase text-center tracking-widest">Winning coins are added to your balance and VIP EXP</p>
        </section>
      </main>

      {gameResult && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 text-center space-y-6">
          {gameResult.winner ? (<><div className="w-32 h-32 bg-[#3BC1A8]/20 rounded-full flex items-center justify-center mx-auto border-4 border-[#3BC1A8] animate-bounce"><Trophy className="w-16 h-16 text-[#3BC1A8]" /></div><div className="space-y-2"><h2 className="text-5xl font-black font-headline text-[#3BC1A8] uppercase">WON!</h2><p className="text-white font-bold text-xl">{gameResult.pot} COINS + EXP</p></div></>) : (<><div className="w-32 h-32 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border-4 border-red-500/20"><Dice5 className="w-16 h-16 text-red-500/40" /></div><h2 className="text-4xl font-black font-headline text-white/40 uppercase">LOST</h2></>)}
          <Button onClick={() => setGameResult(null)} className="mt-10 rounded-full bg-[#3BC1A8] text-white px-12 h-14 font-black uppercase text-xs tracking-widest">CONTINUE</Button>
        </div>
      )}
    </div>
  )
}
