"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, List, Check, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { initializePaystackTransaction } from "@/app/actions/paystack"

const COIN_PACKAGES = [
  { amount: 500, price: 50, label: "KES 50" },
  { amount: 1000, price: 100, label: "KES 100" },
  { amount: 2000, price: 200, label: "KES 200" },
  { amount: 5000, price: 500, label: "KES 500" },
  { amount: 10000, price: 1000, label: "KES 1,000" },
  { amount: 20000, price: 2000, label: "KES 2,000" },
  { amount: 50000, price: 5000, label: "KES 5,000" },
  { amount: 100000, price: 10000, label: "KES 10,000" },
  { amount: 150000, price: 15000, label: "KES 15,000" },
]

function WalletContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  
  const [selectedPackage, setSelectedPackage] = useState(COIN_PACKAGES[1])
  const [isProcessing, setIsProcessing] = useState(false)
  
  const coinAccountRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // Path corrected to match backend.json: /users/{userId}/coinAccount (Document)
    return doc(firestore, "users", user.uid, "coinAccount");
  }, [firestore, user])
  
  const { data: coinAccount, isLoading } = useDoc(coinAccountRef)

  useEffect(() => {
    if (searchParams?.get('status') === 'success') {
      toast({
        title: "Payment Successful!",
        description: "Your coins will be added to your account shortly.",
      })
    }
  }, [searchParams, toast])

  const handlePay = async () => {
    if (!user?.email && !user?.isAnonymous) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please bind an email to your account to make purchases.",
      })
      return
    }

    setIsProcessing(true)
    
    const email = user?.email || `guest_${user?.uid.slice(0, 8)}@matchflow.app`
    
    const result = await initializePaystackTransaction(email, selectedPackage.price, {
      userId: user?.uid,
      packageAmount: selectedPackage.amount
    })

    if (result.error) {
      setIsProcessing(false)
      toast({
        variant: "destructive",
        title: "Payment Initialization Failed",
        description: result.error,
      })
      return
    }

    if (result.authorization_url) {
      window.location.href = result.authorization_url
    }
  }

  return (
    <div className="flex flex-col min-h-svh bg-white text-gray-900">
      <header className="px-4 py-6 flex items-center justify-between sticky top-0 bg-white z-10">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-gray-900">
          <ChevronLeft className="w-8 h-8" />
        </Button>
        <h1 className="text-xl font-bold font-headline">Wallet</h1>
        <Button variant="ghost" size="icon">
          <List className="w-6 h-6" />
        </Button>
      </header>

      <main className="flex-1 px-6 pt-4 pb-32">
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-6 text-gray-400 uppercase tracking-widest text-[10px]">Current Balance</h2>
          <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-[2.5rem] border border-gray-100 shadow-inner">
            <div className="bg-amber-400 w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center">
              <span className="text-white font-black text-2xl italic">S</span>
            </div>
            <div className="flex flex-col">
              <span className="text-5xl font-black font-headline tracking-tight">
                {isLoading ? "..." : (coinAccount?.balance || 0).toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase mt-1">Available Coins</span>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-headline">Recharge Packages</h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {COIN_PACKAGES.map((pkg) => {
              const isSelected = selectedPackage.amount === pkg.amount
              return (
                <Card 
                  key={pkg.amount}
                  onClick={() => setSelectedPackage(pkg)}
                  className={cn(
                    "relative aspect-square flex flex-col items-center justify-center gap-2 border-2 transition-all cursor-pointer rounded-[2rem]",
                    isSelected 
                      ? "border-primary bg-primary/5 shadow-xl scale-105 z-10" 
                      : "border-gray-100 bg-white hover:border-primary/20"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-xl shadow-sm flex items-center justify-center", isSelected ? "bg-primary" : "bg-amber-400")}>
                    <span className="text-white font-black text-xs italic">S</span>
                  </div>
                  <div className="text-center">
                    <p className={cn("text-xs font-black", isSelected ? "text-primary" : "text-gray-900")}>
                      {pkg.amount.toLocaleString()}
                    </p>
                    <p className="text-[9px] font-bold text-gray-400 mt-0.5">{pkg.label}</p>
                  </div>
                  
                  {isSelected && (
                    <div className="absolute top-2 right-2 text-primary">
                      <Check className="w-4 h-4 stroke-[4]" />
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 z-50 flex flex-col gap-4">
        <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
          <ShieldCheck className="w-3 h-3 text-green-500" />
          Secure checkout by Paystack
        </div>
        <Button 
          className="w-full h-16 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-2xl active:scale-95 transition-all"
          onClick={handlePay}
          disabled={isProcessing || isLoading}
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Connecting...</span>
            </div>
          ) : `Pay ${selectedPackage.label}`}
        </Button>
      </footer>
    </div>
  )
}

export default function WalletPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-svh bg-white items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Wallet...</p>
      </div>
    }>
      <WalletContent />
    </Suspense>
  )
}
