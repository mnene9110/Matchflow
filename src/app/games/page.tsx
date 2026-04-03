
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Gamepad2, Coins, Trophy, Loader2, Star, Sparkles, Dice5 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, updateDoc, increment as firestoreIncrement, setDoc, collection } from "firebase/firestore"
import { ref, onValue, runTransaction as runRtdbTransaction } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const GAME_BETS = [20, 50, 100, 200, 500]

export default function GamesCenterPage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore, database } = useFirebase()
  const { toast } = useToast()

  const [userCoins, setUserCoins] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedBet, setSelectedBet] = useState<number | null>(null)
  const [gameResult, setGameResult] = useState<{ winner: boolean; pot: number; multiplier: number } | null>(null)

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

    try {
      // 1. Atomic deduction
      const userRef = ref(database, `users/${currentUser.uid}/coinBalance`)
      const result = await runRtdbTransaction(userRef, (curr) => {
        if (curr === null) return curr
        if (curr < selectedBet) return undefined
        return curr - selectedBet
      })

      if (!result.committed) throw new Error("INSUFFICIENT_COINS")

      // 2. Sync Firestore deduction
      const pRef = doc(firestore, "userProfiles", currentUser.uid)
      updateDoc(pRef, { coinBalance: firestoreIncrement(-selectedBet), updatedAt: new Date().toISOString() })
      
      const txRef = doc(collection(pRef, "transactions"))
      setDoc(txRef, {
        id: txRef.id,
        type: "game_bet",
        amount: -selectedBet,
        transactionDate: new Date().toISOString(),
        description: `Bet ${selectedBet} coins in Lucky Spin`
      })

      // 3. Simulation Delay
      setTimeout(async () => {
        const rand = Math.random()
        let multiplier = 0
        let won = false

        if (rand > 0.55) { // 45% chance to win
          won = true
          multiplier = rand > 0.95 ? 5 : 2 // 5% chance for 5x, otherwise 2x
        }

        const pot = Math.floor(selectedBet * multiplier)

        if (won) {
          // Reward user
          await runRtdbTransaction(userRef, (curr) => (curr || 0) + pot)
          updateDoc(pRef, { coinBalance: firestoreIncrement(pot), updatedAt: new Date().toISOString() })
          
          const winTxRef = doc(collection(pRef, "transactions"))
          setDoc(winTxRef, {
            id: winTxRef.id,
            type: "game_win",
            amount: pot,
            transactionDate: new Date().toISOString(),
            description: `Won ${pot} coins in Lucky Spin (${multiplier}x)!`
          })
        }

        setGameResult({ winner: won, pot, multiplier })
        setIsSpinning(false)
      }, 3000)

    } catch (e: any) {
      toast({ variant: "destructive", title: "Game Error", description: e.message })
      setIsSpinning(false)
    }
  }

  const darkMaroon = "bg-[#5A1010]";

  return (
    <div className="flex flex-col min-h-svh bg-transparent text-gray-900 overflow-hidden">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-transparent z-50">
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

      <main className="flex-1 px-6 pb-20 space-y-10 overflow-y-auto scroll-smooth">
        <section className="bg-zinc-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10"><Gamepad2 className="w-32 h-32" /></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center"><Coins className="w-5 h-5 text-amber-500" /></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Your Wallet</span>
            </div>
            <div className="flex flex-col">
              <span className="text-5xl font-black font-headline tracking-tighter">{userCoins.toLocaleString()}</span>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Available for betting</p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Dice5 className="w-4 h-4 text-purple-500" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Lucky Spin</h2>
            </div>
            <div className="px-3 py-1 bg-green-50 rounded-full border border-green-100">
              <span className="text-[8px] font-black text-green-600 uppercase tracking-widest">Up to 5x Wins</span>
            </div>
          </div>

          <div className="relative w-full aspect-square max-w-[300px] mx-auto group">
            <div className={cn(
              "w-full h-full rounded-full border-[12px] border-zinc-900 relative flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.1)] transition-transform duration-[3000ms] ease-[cubic-bezier(0.15,0,0.15,1)]",
              isSpinning && "rotate-[1800deg]"
            )}>
              <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#5A1010,#18181b,#5A1010,#18181b,#5A1010,#18181b)] rounded-full opacity-20" />
              <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center border-4 border-amber-500/30 z-10">
                {isSpinning ? <Loader2 className="w-8 h-8 text-amber-500 animate-spin" /> : <Trophy className="w-8 h-8 text-amber-500" />}
              </div>
              
              {/* Markers */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <div key={deg} className="absolute inset-0 flex justify-center py-4" style={{ transform: `rotate(${deg}deg)` }}>
                  <Star className={cn("w-4 h-4", deg % 90 === 0 ? "text-amber-500" : "text-zinc-800")} fill="currentColor" />
                </div>
              ))}
            </div>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-8 bg-zinc-900 rounded-full z-20 shadow-xl border-2 border-white" />
          </div>

          <div className="space-y-4">
            <p className="text-[9px] font-black text-center text-gray-400 uppercase tracking-widest">Select Bet Amount</p>
            <div className="grid grid-cols-5 gap-2">
              {GAME_BETS.map((bet) => (
                <button
                  key={bet}
                  onClick={() => !isSpinning && setSelectedBet(bet)}
                  disabled={isSpinning}
                  className={cn(
                    "h-12 rounded-2xl flex flex-col items-center justify-center transition-all border-2",
                    selectedBet === bet 
                      ? "bg-purple-600 border-purple-400 text-white shadow-lg scale-105" 
                      : "bg-white border-gray-100 text-gray-400"
                  )}
                >
                  <span className="text-[10px] font-black">{bet}</span>
                </button>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleLuckySpin}
            disabled={!selectedBet || isSpinning || userCoins < (selectedBet || 0)}
            className={cn(
              "w-full h-18 rounded-full text-white font-black text-lg shadow-2xl active:scale-95 transition-all gap-3",
              selectedBet && userCoins >= selectedBet ? darkMaroon : "bg-gray-200 text-gray-400"
            )}
          >
            {isSpinning ? "SPINNING..." : "PLACE BET & SPIN"}
          </Button>
        </section>

        <section className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 space-y-2 opacity-60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-blue-500" />
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">How it works</p>
          </div>
          <p className="text-[10px] font-medium text-blue-400 leading-relaxed">
            Place a bet using your coins. If the wheel lands on a multiplier, your bet is multiplied! landing on a blank star results in a loss. 
          </p>
        </section>
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
                  <h2 className="text-5xl font-black font-headline text-green-500 uppercase tracking-tighter">YOU WON!</h2>
                  <p className="text-white font-bold text-xl">{gameResult.pot} COINS</p>
                  <div className="px-4 py-1 bg-white/10 rounded-full inline-block">
                    <span className="text-amber-500 font-black text-xs uppercase tracking-[0.2em]">{gameResult.multiplier}X MULTIPLIER</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-32 h-32 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border-4 border-red-500/20">
                  <Dice5 className="w-16 h-16 text-red-500/40" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-black font-headline text-white/40 uppercase tracking-widest">BET LOST</h2>
                  <p className="text-white/20 font-bold uppercase tracking-widest">Better luck next time</p>
                </div>
              </>
            )}
            
            <Button 
              onClick={() => setGameResult(null)}
              className="mt-10 rounded-full bg-white text-zinc-900 px-12 h-14 font-black uppercase text-xs tracking-widest shadow-xl active:scale-95"
            >
              CLOSE
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
