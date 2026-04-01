"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Check, Loader2, ShieldCheck, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { initializePaystackTransaction } from "@/app/actions/paystack"

const COIN_PACKAGES = [
  { amount: 500, price: 50, label: "50" },
  { amount: 1000, price: 100, label: "100" },
  { amount: 2000, price: 200, label: "200" },
  { amount: 5000, price: 500, label: "500" },
  { amount: 10000, price: 1000, label: "1,000" },
  { amount: 20000, price: 2000, label: "2,000" },
  { amount: 50000, price: 5000, label: "5,000" },
  { amount: 100000, price: 10000, label: "10,000" },
  { amount: 150000, price: 15000, label: "15,000" },
]

function RechargeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  
  const [selectedPackage, setSelectedPackage] = useState<typeof COIN_PACKAGES[0] | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  useEffect(() => {
    setIsProcessing(false);
  }, []);

  const coinAccountRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "coinAccounts", user.uid);
  }, [firestore, user])
  
  const { data: coinAccount, isLoading } = useDoc(coinAccountRef)

  useEffect(() => {
    const status = searchParams?.get('status')
    if (status === 'success') {
      toast({
        title: "Payment Successful",
        description: "Balance updated.",
      })
    } else if (status === 'error') {
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: "Transaction failed.",
      })
    }
  }, [searchParams, toast])

  const handlePay = async () => {
    if (!user || !selectedPackage) return;

    setIsProcessing(true)
    const email = user.email || `guest_${user.uid.slice(0, 8)}@matchflow.app`
    const result = await initializePaystackTransaction(email, selectedPackage.price, {
      userId: user.uid,
      packageAmount: selectedPackage.amount,
      username: user.displayName || 'User'
    })

    if (result.error) {
      setIsProcessing(false)
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      })
      return
    }

    if (result.authorization_url) {
      window.location.href = result.authorization_url
    }
  }

  return (
    <div className="flex flex-col min-h-svh bg-transparent text-gray-900">
      <header className="px-4 py-6 flex items-center justify-between sticky top-0 bg-transparent z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-gray-900 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-black font-headline tracking-widest uppercase">Wallet</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push('/recharge/history')}
          className="text-gray-900 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full"
        >
          <History className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 px-6 pt-4 pb-32">
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-2">
            <h2 className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em]">Current Balance</h2>
          </div>
          <div className="flex items-center gap-4 bg-white/40 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/40 shadow-xl shadow-primary/5">
            <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center">
              <span className="text-primary font-black text-2xl italic">S</span>
            </div>
            <div className="flex flex-col">
              <span className="text-4xl font-black font-headline tracking-tighter text-gray-900">
                {isLoading ? "..." : (coinAccount?.balance || 0).toLocaleString()}
              </span>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Available Coins</span>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] mb-3 ml-2">Select Package</h2>
          <div className="grid grid-cols-3 gap-3">
            {COIN_PACKAGES.map((pkg) => {
              const isSelected = selectedPackage?.amount === pkg.amount
              return (
                <Card 
                  key={pkg.amount}
                  onClick={() => setSelectedPackage(pkg)}
                  className={cn(
                    "relative aspect-square flex flex-col items-center justify-center gap-2 border-2 transition-all cursor-pointer rounded-[1.75rem]",
                    isSelected 
                      ? "border-primary bg-white shadow-2xl shadow-primary/10 scale-[1.05] z-10" 
                      : "border-white/40 bg-white/20 hover:bg-white/40"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-colors", isSelected ? "bg-primary" : "bg-primary/10")}>
                    <span className={cn("font-black text-sm italic", isSelected ? "text-white" : "text-primary")}>S</span>
                  </div>
                  <div className="text-center">
                    <p className={cn("text-sm font-black transition-colors", isSelected ? "text-primary" : "text-gray-900")}>
                      {pkg.amount.toLocaleString()}
                    </p>
                    <p className="text-[9px] font-bold text-gray-400">{pkg.label}</p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg">
                      <Check className="w-3 h-3 text-white stroke-[4]" />
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50 flex flex-col gap-4">
        <div className="flex items-center justify-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
          <ShieldCheck className="w-3.5 h-3.5 text-green-500" /> Secure via Paystack
        </div>
        <Button 
          className="w-full h-16 rounded-full bg-primary text-white font-black text-lg shadow-2xl shadow-primary/20 active:scale-95 transition-all"
          onClick={handlePay}
          disabled={isProcessing || isLoading || !selectedPackage}
        >
          {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : selectedPackage ? `Pay ${selectedPackage.label}` : "Select a Package"}
        </Button>
      </footer>
    </div>
  )
}

export default function RechargePage() {
  return (
    <Suspense fallback={<div className="flex h-svh items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <RechargeContent />
    </Suspense>
  )
}
