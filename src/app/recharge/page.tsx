"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Check, Loader2, ShieldCheck } from "lucide-react"
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
  
  const [selectedPackage, setSelectedPackage] = useState(COIN_PACKAGES[1])
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
    if (!user) return;

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
    <div className="flex flex-col min-h-svh bg-black text-white">
      <header className="px-4 py-3 flex items-center justify-between sticky top-0 bg-black z-10 border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-8 w-8">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-bold font-headline">Wallet</h1>
        <div className="w-8" />
      </header>

      <main className="flex-1 px-5 pt-3 pb-24">
        <section className="mb-6">
          <h2 className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-2">Your Balance</h2>
          <div className="flex items-center gap-3 bg-white/[0.03] p-5 rounded-[1.75rem] border border-white/5">
            <div className="bg-primary/20 w-10 h-10 rounded-xl flex items-center justify-center">
              <span className="text-primary font-black text-xl italic">S</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-black font-headline tracking-tight">
                {isLoading ? "..." : (coinAccount?.balance || 0).toLocaleString()}
              </span>
              <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Available Coins</span>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-bold font-headline tracking-wide">Select Package</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {COIN_PACKAGES.map((pkg) => {
              const isSelected = selectedPackage.amount === pkg.amount
              return (
                <Card 
                  key={pkg.amount}
                  onClick={() => setSelectedPackage(pkg)}
                  className={cn(
                    "relative aspect-square flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer rounded-2xl",
                    isSelected 
                      ? "border-primary bg-primary/10 scale-[1.02] shadow-[0_0_15px_rgba(255,107,0,0.1)] z-10" 
                      : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                  )}
                >
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isSelected ? "bg-primary" : "bg-primary/10")}>
                    <span className={cn("font-black text-[11px] italic", isSelected ? "text-white" : "text-primary")}>S</span>
                  </div>
                  <div className="text-center">
                    <p className={cn("text-[12px] font-black", isSelected ? "text-primary" : "text-white")}>
                      {pkg.amount.toLocaleString()}
                    </p>
                    <p className="text-[8px] font-bold text-white/20">{pkg.label}</p>
                  </div>
                  {isSelected && <Check className="absolute top-1.5 right-1.5 w-3 h-3 text-primary stroke-[3]" />}
                </Card>
              )
            })}
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-5 bg-black/90 backdrop-blur-md border-t border-white/5 z-50 flex flex-col gap-3">
        <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-white/20 uppercase tracking-widest">
          <ShieldCheck className="w-3 h-3 text-green-500" /> Secure payment via Paystack
        </div>
        <Button 
          className="w-full h-14 rounded-[1.75rem] bg-primary text-white font-black text-base shadow-lg shadow-primary/20 active:scale-95 transition-all"
          onClick={handlePay}
          disabled={isProcessing || isLoading}
        >
          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pay ${selectedPackage.label}`}
        </Button>
      </footer>
    </div>
  )
}

export default function RechargePage() {
  return (
    <Suspense fallback={<div className="flex h-svh items-center justify-center bg-black"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <RechargeContent />
    </Suspense>
  )
}
