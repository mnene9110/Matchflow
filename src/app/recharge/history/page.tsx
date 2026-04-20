
"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, ArrowUpRight, ArrowDownLeft, Coins, Gem } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit, where } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export default function CoinHistoryPage() {
  const router = useRouter()
  const { user } = useUser()
  const { firestore } = useFirebase()

  const historyQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // Show only coin-based transactions
    return query(
      collection(firestore, "userProfiles", user.uid, "transactions"),
      where("type", "in", ["recharge", "deduction", "game_result", "mystery_note", "party_creation", "profile_boost", "visitor_unlock", "award", "host_subscription", "diamond_exchange"]),
      orderBy("transactionDate", "desc"),
      limit(50)
    )
  }, [firestore, user])

  const { data: transactions, isLoading } = useCollection(historyQuery)

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900 overflow-hidden font-body">
      <header className="px-4 py-8 flex items-center justify-between sticky top-0 bg-[#3BC1A8] z-50 shrink-0 text-white shadow-lg">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm"><ChevronLeft className="w-6 h-6" /></Button>
          <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Coin History</h1>
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push('/profile/income/history')} 
          className="text-amber-400 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm hover:bg-white/30"
          title="Diamond History"
        >
          <Gem className="w-5 h-5 fill-current" />
        </Button>
      </header>

      <main className="flex-1 px-6 pb-20 overflow-y-auto scroll-smooth">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading history...</span>
          </div>
        ) : transactions && transactions.length > 0 ? (
          <div className="space-y-3 pb-10 pt-6">
            {transactions.map((tx: any) => {
              const amount = tx.amount || 0;
              const isAddition = amount > 0;
              
              return (
                <div key={tx.id} className="bg-gray-50 border border-gray-100 p-5 rounded-[2rem] flex items-center gap-4 shadow-sm">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner", 
                    isAddition ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {isAddition ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-black text-gray-900 truncate uppercase tracking-tight">
                      {tx.type === 'diamond_exchange' ? 'Exchange from Diamonds' : (tx.description || (isAddition ? "Credit" : "Service Payment"))}
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
                      {isAddition ? "+" : "-"}{Math.abs(amount).toLocaleString()}
                      <Coins className="w-3 h-3 opacity-40" />
                    </span>
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Coins</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center border border-gray-100 shadow-inner">
              <Coins className="w-8 h-8 text-gray-200" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-400 uppercase">No transactions yet</h3>
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Your coin activity will appear here</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
