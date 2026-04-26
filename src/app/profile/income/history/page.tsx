"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Gem, Loader2, History, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase } from "@/firebase/provider"
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export default function DiamondHistoryPage() {
  const router = useRouter()
  const { firestore } = useFirebase()
  const { user } = useSupabaseUser()
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const q = query(
      collection(firestore, `userProfiles/${user.id}/transactions`),
      orderBy('transactionDate', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const diamondRelated = all.filter((tx: any) => 
        ['diamond_exchange', 'diamond_received', 'gift_received', 'agency_withdrawal'].includes(tx.type)
      );
      setTransactions(diamondRelated);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, firestore])

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900 overflow-hidden font-body">
      <header className="px-4 py-8 flex items-center sticky top-0 bg-[#3BC1A8] z-50 shrink-0 text-white shadow-lg">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm"><ChevronLeft className="w-6 h-6" /></Button>
        <div className="ml-4">
          <h1 className="text-lg font-black font-headline tracking-widest uppercase">Diamond History</h1>
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Earnings & Conversions</p>
        </div>
      </header>

      <main className="flex-1 px-6 overflow-y-auto scroll-smooth">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Fetching records...</span>
          </div>
        ) : transactions.length > 0 ? (
          <div className="space-y-3 pb-20 pt-6">
            {transactions.map((tx: any) => {
              const amount = tx.amount || 0;
              const isAddition = amount > 0;
              
              return (
                <div key={tx.id} className="bg-gray-50 border border-gray-100 p-5 rounded-[2rem] flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner", 
                    isAddition ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {isAddition ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-black text-gray-900 truncate uppercase tracking-tight">
                      {tx.type === 'diamond_exchange' ? 'Converted to Coins' : (tx.description || 'Earnings')}
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">
                      {tx.transactionDate ? format(new Date(tx.transactionDate), "MMM d, yyyy • HH:mm") : "Recently"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "text-sm font-black flex items-center justify-end gap-1 font-headline", 
                      isAddition ? "text-green-500" : "text-red-500"
                    )}>
                      {isAddition ? "+" : ""}{Math.abs(amount).toLocaleString()}
                      <Gem className="w-3 h-3 opacity-40" />
                    </span>
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Diamonds</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 text-center space-y-4 opacity-30">
            <div className="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center border border-gray-100">
              <History className="w-8 h-8 text-gray-200" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-900 uppercase">No history found</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Your diamond activity will appear here</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
