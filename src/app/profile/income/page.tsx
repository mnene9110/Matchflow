
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Gem, Coins, ArrowRightLeft, Loader2, Info, ArrowUpRight, History, ArrowDownLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser, useMemoFirebase, useFirebase, useCollection, useDoc } from "@/firebase"
import { doc, increment as firestoreIncrement, collection, query, where, orderBy, limit, runTransaction } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { getVipLevelFromExp } from "@/app/profile/vip/page"

export default function IncomePage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore } = useFirebase()
  const { toast } = useToast()
  
  const [isExchanging, setIsExchanging] = useState(false)

  const meRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: profile, isLoading: isProfileLoading } = useDoc(meRef)

  const diamondBalance = profile?.diamondBalance || 0

  const historyQuery = useMemoFirebase(() => {
    if (!firestore || !currentUser) return null
    return query(
      collection(firestore, "userProfiles", currentUser.uid, "transactions"),
      where("type", "in", ["diamond_exchange", "diamond_received", "gift_received"]),
      orderBy("transactionDate", "desc"),
      limit(20)
    )
  }, [firestore, currentUser])

  const { data: transactions, isLoading: isHistoryLoading } = useCollection(historyQuery)

  const canExchange = diamondBalance >= 500

  const handleExchange = async () => {
    if (!currentUser || !firestore || isExchanging || !canExchange) return
    setIsExchanging(true)

    const blocks = Math.floor(diamondBalance / 500)
    const diamondsToDeduct = blocks * 500
    const coinsToGain = blocks * 150
    const expToGain = coinsToGain // + Coin gains grant EXP

    try {
      await runTransaction(firestore, async (transaction) => {
        const snap = await transaction.get(meRef!);
        const currentData = snap.data();
        const currentDiamonds = currentData?.diamondBalance || 0;
        const currentExp = (currentData?.vipExp || 0) + expToGain;
        
        if (currentDiamonds < diamondsToDeduct) {
          throw new Error("Insufficient diamond balance");
        }

        const newLevel = getVipLevelFromExp(currentExp);

        transaction.update(meRef!, {
          diamondBalance: firestoreIncrement(-diamondsToDeduct),
          coinBalance: firestoreIncrement(coinsToGain),
          vipExp: firestoreIncrement(expToGain),
          vipLevel: newLevel,
          updatedAt: new Date().toISOString()
        });

        const txRef = doc(collection(meRef!, "transactions"));
        transaction.set(txRef, {
          id: txRef.id,
          type: "diamond_exchange",
          amount: coinsToGain,
          diamondAmount: -diamondsToDeduct,
          transactionDate: new Date().toISOString(),
          description: `Exchanged ${diamondsToDeduct} diamonds for ${coinsToGain} coins (+EXP)`
        });
      });

      toast({ title: "Exchange Successful!", description: `Received ${coinsToGain} coins & EXP.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Exchange Failed", description: error.message || "Error occurred." });
    } finally {
      setIsExchanging(false)
    }
  }

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900 overflow-hidden">
      <header className="px-4 py-8 flex items-center sticky top-0 bg-[#3BC1A8] z-10 shrink-0 text-white">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Income Center</h1>
      </header>

      <main className="flex-1 px-6 pb-20 space-y-8 overflow-y-auto scroll-smooth">
        <section className="bg-zinc-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden shrink-0 mt-4">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Gem className="w-32 h-32" /></div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center"><Gem className="w-5 h-5 text-blue-400" /></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Total Diamonds</span>
            </div>
            <div className="flex flex-col">
              <span className="text-6xl font-black font-headline tracking-tighter text-white">
                {isProfileLoading ? "..." : diamondBalance.toLocaleString()}
              </span>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-2">Earned from gifts and rewards</p>
            </div>
          </div>
        </section>

        <section className="bg-gray-50 border border-gray-100 rounded-[2.5rem] p-8 space-y-8 shadow-sm shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3BC1A8]">Conversion Rate</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-gray-100"><Info className="w-3 h-3 text-gray-400" /><span className="text-[9px] font-bold text-gray-500">Fixed Rate</span></div>
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="w-16 h-16 rounded-[1.5rem] bg-blue-500/10 flex items-center justify-center border border-blue-500/5 shadow-inner"><Gem className="w-8 h-8 text-blue-500" /></div>
              <span className="text-lg font-black font-headline text-gray-900">500</span>
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Diamonds</span>
            </div>
            <ArrowRightLeft className="w-6 h-6 text-[#3BC1A8]/30" />
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="w-16 h-16 rounded-[1.5rem] bg-[#3BC1A8]/10 flex items-center justify-center border border-[#3BC1A8]/5 shadow-inner"><Coins className="w-8 h-8 text-[#3BC1A8]" /></div>
              <span className="text-lg font-black font-headline text-gray-900">150</span>
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Coins</span>
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleExchange} disabled={isExchanging || !canExchange} className={cn("w-full h-18 rounded-full text-white font-black text-lg shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3", canExchange ? "bg-zinc-900" : "bg-gray-200 text-gray-400 cursor-not-allowed")}>
              {isExchanging ? <Loader2 className="w-6 h-6 animate-spin" /> : <><span className="text-sm font-black uppercase tracking-widest">Exchange Now</span><ArrowUpRight className="w-5 h-5" /></>}
            </Button>
            {!canExchange && !isProfileLoading && (
              <p className="text-[9px] text-center text-gray-400 mt-4 font-bold uppercase tracking-widest">Minimum 500 diamonds required to exchange</p>
            )}
          </div>
        </section>

        <section className="space-y-4 pb-10">
          <div className="flex items-center gap-2 px-2">
            <History className="w-4 h-4 text-[#3BC1A8]/40" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Activity History</h2>
          </div>

          <div className="space-y-3">
            {isHistoryLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-[#3BC1A8]/20" />
              </div>
            ) : transactions && transactions.length > 0 ? (
              transactions.map((tx: any) => {
                const isGain = tx.type === "diamond_received" || tx.type === "gift_received"
                const amount = Math.abs(tx.diamondAmount || (isGain ? Math.floor((tx.amount || 0) / 0.6) : 0))
                
                return (
                  <div key={tx.id} className="bg-white border border-gray-100 p-5 rounded-[2rem] flex items-center gap-4 shadow-sm">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                      isGain ? "bg-blue-500/10 text-blue-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {isGain ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-black text-gray-900 truncate uppercase tracking-tight">{tx.description || "Diamond Activity"}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">
                        {tx.transactionDate ? format(new Date(tx.transactionDate), "MMM d, HH:mm") : "Recently"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "flex items-center justify-end gap-1 text-sm font-black font-headline",
                        isGain ? "text-blue-500" : "text-red-500"
                      )}>
                        {isGain ? "+" : "-"}{amount.toLocaleString()}
                        <Gem className="w-3 h-3 opacity-40" />
                      </div>
                      <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Diamonds</span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 opacity-30 text-center space-y-2">
                <History className="w-8 h-8" />
                <p className="text-[10px] font-black uppercase tracking-widest">No transactions yet</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
