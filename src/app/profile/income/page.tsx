"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Gem, Coins, ArrowRightLeft, Loader2, Info, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase } from "@/firebase/provider"
import { doc, runTransaction, collection, serverTimestamp } from "firebase/firestore"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function IncomePage() {
  const router = useRouter()
  const { firestore } = useFirebase()
  const { user: currentUser, profile, isLoading: isProfileLoading } = useSupabaseUser()
  const { toast } = useToast()
  const [isExchanging, setIsExchanging] = useState(false)

  const diamondBalance = profile?.diamondBalance || 0
  const canExchange = diamondBalance >= 500

  const handleExchange = async () => {
    if (!currentUser || isExchanging || !canExchange || !profile) return
    setIsExchanging(true)
    
    const blocks = Math.floor(diamondBalance / 500)
    const diamondsToDeduct = blocks * 500
    const coinsToGain = blocks * 80 // 500 diamonds = 80 coins
    
    try {
      await runTransaction(firestore, async (transaction) => {
        const profileRef = doc(firestore, "userProfiles", currentUser.id);
        const profDoc = await transaction.get(profileRef);
        if (!profDoc.exists()) throw new Error("Profile not found");

        const curDiamonds = profDoc.data().diamondBalance || 0;
        const curCoins = profDoc.data().coinBalance || 0;

        if (curDiamonds < diamondsToDeduct) throw new Error("INSUFFICIENT_DIAMONDS");

        transaction.update(profileRef, {
          diamondBalance: curDiamonds - diamondsToDeduct,
          coinBalance: curCoins + coinsToGain,
          updatedAt: serverTimestamp()
        });

        const logRef = doc(collection(firestore, `userProfiles/${currentUser.id}/transactions`));
        transaction.set(logRef, {
          type: "diamond_exchange",
          amount: coinsToGain,
          description: `Exchanged ${diamondsToDeduct} diamonds for ${coinsToGain} coins`,
          transactionDate: new Date().toISOString()
        });
      });

      toast({ title: "Exchange Successful!", description: `Received ${coinsToGain} coins.` });
      router.refresh();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Exchange Failed" });
    } finally {
      setIsExchanging(false)
    }
  }

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900 overflow-hidden font-body">
      <header className="px-4 py-8 flex items-center justify-between sticky top-0 bg-[#3BC1A8] z-50 shrink-0 text-white shadow-lg">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm"><ChevronLeft className="w-6 h-6" /></Button>
          <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Income Center</h1>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push('/profile/income/history')} 
          className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm"
        >
          <History className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 px-6 pb-20 space-y-8 overflow-y-auto scroll-smooth">
        <section className="bg-zinc-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden shrink-0 mt-6">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Gem className="w-32 h-32" /></div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/10">
                <Gem className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Total Diamonds</span>
            </div>
            <div className="flex flex-col">
              <span className="text-6xl font-black font-headline tracking-tighter text-white">
                {isProfileLoading ? "..." : diamondBalance.toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        <section className="bg-gray-50 border border-gray-100 rounded-[2.5rem] p-8 space-y-8 shadow-sm shrink-0">
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="w-16 h-16 rounded-[1.5rem] bg-blue-500/10 flex items-center justify-center shadow-inner">
                <Gem className="w-8 h-8 text-blue-500" />
              </div>
              <span className="text-lg font-black font-headline text-gray-900 leading-none">500</span>
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Diamonds</span>
            </div>
            <ArrowRightLeft className="w-6 h-6 text-[#3BC1A8]/30 shrink-0" />
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="w-16 h-16 rounded-[1.5rem] bg-[#3BC1A8]/10 flex items-center justify-center shadow-inner">
                <Coins className="w-8 h-8 text-[#3BC1A8]" />
              </div>
              <span className="text-lg font-black font-headline text-gray-900 leading-none">80</span>
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Coins</span>
            </div>
          </div>
          <Button 
            onClick={handleExchange} 
            disabled={isExchanging || !canExchange} 
            className={cn(
              "w-full h-18 rounded-full text-white font-black text-lg shadow-2xl transition-all active:scale-95", 
              canExchange ? "bg-zinc-900" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {isExchanging ? <Loader2 className="w-6 h-6 animate-spin" /> : "Exchange Diamonds"}
          </Button>
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <Info className="w-3.5 h-3.5" />
            <p className="text-[9px] font-bold uppercase tracking-widest leading-none">Conversion requires min. 500 💎</p>
          </div>
        </section>
      </main>
    </div>
  )
}
