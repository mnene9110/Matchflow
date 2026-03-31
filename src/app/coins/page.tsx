
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, List, Coins, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useDoc, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase"
import { doc, collection } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const COIN_PACKAGES = [
  { amount: 1000, price: "$0.99" },
  { amount: 2000, price: "$1.99" },
  { amount: 5000, price: "$4.99" },
  { amount: 10000, price: "$9.99" },
  { amount: 20000, price: "$19.99" },
  { amount: 50000, price: "$49.99" },
  { amount: 100000, price: "$99.99" },
]

export default function WalletPage() {
  const router = useRouter()
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const [selectedPackage, setSelectedPackage] = useState(COIN_PACKAGES[0])
  const [isProcessing, setIsProcessing] = useState(false)
  
  const coinAccountRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid, "coinAccount", "primary");
  }, [firestore, user])
  
  const { data: coinAccount, isLoading } = useDoc(coinAccountRef)

  const handlePay = () => {
    if (!coinAccountRef || !coinAccount || !user || !firestore) return;

    setIsProcessing(true)
    const amount = selectedPackage.amount;
    const price = selectedPackage.price;
    const newBalance = (coinAccount.balance || 0) + amount;
    
    // Update balance
    updateDocumentNonBlocking(coinAccountRef, {
      balance: newBalance,
      updatedAt: new Date().toISOString()
    });

    // Log transaction
    const transactionsRef = collection(firestore, "users", user.uid, "coinAccount", "primary", "transactions");
    addDocumentNonBlocking(transactionsRef, {
      type: 'purchase',
      amount: amount,
      transactionDate: new Date().toISOString(),
      description: `Recharged ${amount} coins for ${price}`,
      coinAccountId: user.uid
    });

    setTimeout(() => {
      setIsProcessing(false)
      toast({
        title: "Recharge Successful",
        description: `Successfully added ${amount} coins to your wallet.`,
      });
    }, 1000)
  }

  return (
    <div className="flex flex-col min-h-svh bg-white text-gray-900">
      {/* Header */}
      <header className="px-4 py-6 flex items-center justify-between sticky top-0 bg-white z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-gray-900"
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
        <h1 className="text-xl font-bold font-headline">Wallet</h1>
        <Button variant="ghost" size="icon">
          <List className="w-6 h-6" />
        </Button>
      </header>

      <main className="flex-1 px-6 pt-4 pb-32">
        {/* Balance Section */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-6">My Balance</h2>
          <div className="flex items-center gap-4">
            <div className="bg-amber-400 p-2 rounded-full shadow-sm">
              <span className="text-white font-black text-2xl italic">S</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black font-headline">
                {isLoading ? "..." : (coinAccount?.balance || 0)}
              </span>
            </div>
          </div>
        </section>

        {/* Packages Grid Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">My Balance</h2>
            <div className="bg-black text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
              <div className="w-2 h-2 rounded-full border border-white flex items-center justify-center">
                <div className="w-1 h-1 bg-green-400 rounded-full" />
              </div>
              Kenya
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {COIN_PACKAGES.map((pkg) => {
              const isSelected = selectedPackage.amount === pkg.amount
              return (
                <Card 
                  key={pkg.amount}
                  onClick={() => setSelectedPackage(pkg)}
                  className={cn(
                    "relative aspect-square flex flex-col items-center justify-center gap-2 border-2 transition-all cursor-pointer rounded-2xl",
                    isSelected 
                      ? "border-sky-400 bg-sky-50/10 shadow-md" 
                      : "border-gray-100 bg-white"
                  )}
                >
                  <div className="bg-amber-400 p-1.5 rounded-full shadow-sm">
                    <span className="text-white font-black text-sm italic">S</span>
                  </div>
                  <span className={cn("text-sm font-black", isSelected ? "text-sky-400" : "text-gray-600")}>
                    {pkg.amount}
                  </span>
                  
                  {isSelected && (
                    <div className="absolute -bottom-1 -right-1 bg-sky-400 text-white p-0.5 rounded-tl-xl rounded-br-2xl">
                      <Check className="w-3 h-3 stroke-[4]" />
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </section>
      </main>

      {/* Sticky Bottom Pay Button */}
      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 z-50">
        <Button 
          className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl active:scale-95 transition-all"
          onClick={handlePay}
          disabled={isProcessing || isLoading}
        >
          {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : `Pay ${selectedPackage.price}`}
        </Button>
      </footer>
    </div>
  )
}
