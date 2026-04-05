
"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, ArrowUpRight, ArrowDownLeft, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCollection, useFirebase, useUser, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export default function CoinHistoryPage() {
  const router = useRouter()
  const { user } = useUser()
  const { firestore } = useFirebase()

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    // ECONOMY: Only fetch latest 20 transactions initially to keep audit log lightweight
    return query(
      collection(firestore, "userProfiles", user.uid, "transactions"),
      orderBy("transactionDate", "desc"),
      limit(20)
    )
  }, [firestore, user])

  const { data: transactions, isLoading } = useCollection(transactionsQuery)

  return (
    <div className="flex flex-col h-svh bg-transparent text-gray-900 overflow-hidden">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-transparent z-10 shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-gray-900 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase text-gray-900">Coin History</h1>
      </header>

      <main className="flex-1 px-6 pb-20 overflow-y-auto scroll-smooth">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading history...</span>
          </div>
        ) : transactions && transactions.length > 0 ? (
          <div className="space-y-3 pb-10">
            {transactions.map((tx: any) => {
              const isAddition = tx.amount > 0
              
              return (
                <div 
                  key={tx.id} 
                  className="bg-white/40 backdrop-blur-md border border-white/40 p-5 rounded-[2rem] flex items-center gap-4 shadow-sm"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                    isAddition ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {isAddition ? (
                      <ArrowUpRight className="w-6 h-6" />
                    ) : (
                      <ArrowDownLeft className="w-6 h-6" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-black text-gray-900 truncate uppercase tracking-tight">
                      {tx.description || (isAddition ? "Credit" : "Service Payment")}
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
                      {isAddition ? "+" : "-"}{Math.abs(tx.amount).toLocaleString()}
                      <Coins className="w-3 h-3 opacity-40" />
                    </span>
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Coins</span>
                  </div>
                </div>
              )
            })}
            <div className="py-10 text-center">
               <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">End of recent history</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center border border-white/30">
              <Coins className="w-8 h-8 text-gray-200" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-900 uppercase">No transactions yet</h3>
              <p className="text-[10px] font-bold text-gray-400 max-w-[180px] mx-auto uppercase tracking-tighter">
                Your coin history will appear here once you start using MatchFlow.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
