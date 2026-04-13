
"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Check, History, Loader2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useFirebase, useDoc, useUser, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { initializePesaPalTransaction } from "@/app/actions/pesapal"

// Standard Pricing (Normal Users)
export const STANDARD_PACKAGES = [
  { amount: 500, priceKes: 70 },
  { amount: 1000, priceKes: 120 },
  { amount: 2000, priceKes: 240 },
  { amount: 5000, priceKes: 600 },
  { amount: 10000, priceKes: 1200 },
  { amount: 12500, priceKes: 1500 },
]

export const COUNTRY_CURRENCIES: Record<string, { code: string; symbol: string; rate: number }> = {
  "Burundi": { code: "BIF", symbol: "FBu", rate: 22.1 },
  "Comoros": { code: "KMF", symbol: "CF", rate: 3.5 },
  "Djibouti": { code: "DJF", symbol: "Fdj", rate: 1.37 },
  "Eritrea": { code: "ERN", symbol: "Nfk", rate: 0.115 },
  "Ethiopia": { code: "ETB", symbol: "Br", rate: 0.94 },
  "Kenya": { code: "KES", symbol: "Ksh", rate: 1.0 },
  "Madagascar": { code: "MGA", symbol: "Ar", rate: 35.2 },
  "Malawi": { code: "MWK", symbol: "MK", rate: 13.2 },
  "Mauritius": { code: "MUR", symbol: "₨", rate: 0.35 },
  "Mozambique": { code: "MZN", symbol: "MT", rate: 0.49 },
  "Nigeria": { code: "NGN", symbol: "₦", rate: 12.4 },
  "Rwanda": { code: "RWF", symbol: "FRw", rate: 10.1 },
  "Seychelles": { code: "SCR", symbol: "SR", rate: 0.105 },
  "Somalia": { code: "SOS", symbol: "Sh.So.", rate: 4.4 },
  "South Sudan": { code: "SSP", symbol: "£", rate: 1.0 },
  "Tanzania": { code: "TZS", symbol: "TSh", rate: 20.2 },
  "Uganda": { code: "UGX", symbol: "USh", rate: 28.6 },
  "Zambia": { code: "ZMW", symbol: "ZK", rate: 0.20 },
  "Zimbabwe": { code: "USD", symbol: "$", rate: 0.0077 }
};

function RechargeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const { firestore } = useFirebase()
  const { toast } = useToast()
  
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const meRef = useMemoFirebase(() => user ? doc(firestore, "userProfiles", user.uid) : null, [firestore, user])
  const { data: profile } = useDoc(meRef)

  const currencyInfo = COUNTRY_CURRENCIES[profile?.location || "Kenya"] || COUNTRY_CURRENCIES["Kenya"];
  const isKenyan = profile?.location === "Kenya";

  useEffect(() => {
    const status = searchParams?.get('status')
    if (status === 'success') {
      toast({ title: "Payment Successful", description: "Your balance has been updated." });
    } else if (status === 'error') {
      toast({ variant: "destructive", title: "Payment Failed" });
    }
  }, [searchParams, toast])

  const handlePay = async () => {
    if (!selectedPackage || !user || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const email = user.email || `guest_${user.uid.slice(0, 8)}@matchflow.app`
      const result = await initializePesaPalTransaction(email, selectedPackage.priceKes, {
        userId: user.uid,
        packageAmount: selectedPackage.amount
      })

      if (result.error) {
        toast({ variant: "destructive", title: "Payment Error", description: result.error })
        setIsProcessing(false)
        return
      }

      if (result.redirect_url) {
        window.location.href = result.redirect_url
      }
    } catch (error) {
      console.error("Payment initialization failed:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to connect to payment gateway." })
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900 overflow-hidden">
      <header className="px-4 py-4 flex items-center justify-between sticky top-0 bg-[#FF3737] z-10 shrink-0 shadow-lg text-white">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-9 w-9 bg-white/20 backdrop-blur-md rounded-full shadow-sm hover:bg-white/30"><ChevronLeft className="w-5 h-5" /></Button>
        <div className="flex flex-col items-center">
          <h1 className="text-base font-black font-headline tracking-widest uppercase">Wallet</h1>
          <p className="text-[7px] font-black text-white/60 uppercase tracking-widest">{currencyInfo.code} Region</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => router.push('/recharge/history')} className="text-white h-9 w-9 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30"><History className="w-4 h-4" /></Button>
      </header>

      <main className="flex-1 px-6 pt-6 pb-44 overflow-y-auto scroll-smooth">
        <section className="mb-6">
          <div className="flex items-center gap-4 bg-gray-50 p-5 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center"><span className="text-primary font-black text-xl italic">S</span></div>
            <div className="flex flex-col">
              <span className="text-3xl font-black font-headline tracking-tighter text-gray-900">{(profile?.coinBalance || 0).toLocaleString()}</span>
              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Available Coins</span>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-2">Select Package</h2>
          <div className="grid grid-cols-3 gap-3">
            {STANDARD_PACKAGES.map((pkg) => {
              const isSelected = selectedPackage?.amount === pkg.amount;
              const localPrice = Math.round(pkg.priceKes * currencyInfo.rate);
              
              return (
                <Card key={pkg.amount} onClick={() => setSelectedPackage(pkg)} className={cn("relative aspect-square flex flex-col items-center justify-center gap-1.5 border-2 transition-all cursor-pointer rounded-[1.5rem]", isSelected ? "border-primary bg-white shadow-xl scale-[1.05]" : "border-gray-50 bg-gray-50/50")}>
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isSelected ? "bg-primary" : "bg-primary/10")}><span className={cn("font-black text-xs italic", isSelected ? "text-white" : "text-primary")}>S</span></div>
                  <div className="text-center">
                    <p className={cn("text-xs font-black", isSelected ? "text-primary" : "text-gray-900")}>{pkg.amount.toLocaleString()}</p>
                    <p className="text-[8px] font-bold text-gray-400">
                      {currencyInfo.symbol} {localPrice.toLocaleString()}
                    </p>
                  </div>
                  {isSelected && (<div className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-lg"><Check className="w-2.5 h-2.5 text-white stroke-[4]" /></div>)}
                </Card>
              )
            })}
          </div>
        </section>

        {isKenyan && (
          <section className="mt-8 space-y-4 pb-10">
            <div className="flex items-center gap-2 px-2">
              <Users className="w-3.5 h-3.5 text-primary/40" />
              <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">P2P Coinsellers</h3>
            </div>
            <button 
              onClick={() => router.push(`/recharge/coinsellers?amount=${selectedPackage?.amount || ''}`)} 
              className="w-full h-14 rounded-[1.5rem] bg-gray-50 border border-gray-100 flex items-center justify-center gap-3 text-gray-900 active:scale-95 transition-all shadow-sm"
            >
              <Users className="w-4 h-4 text-primary opacity-60" />
              <span className="text-[10px] font-black uppercase tracking-widest">Contact Official Sellers</span>
            </button>
          </section>
        )}
      </main>

      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-white border-t border-gray-50 z-50">
        <Button 
          className="w-full h-14 rounded-full bg-primary text-white font-black text-base shadow-xl active:scale-95 transition-all" 
          onClick={handlePay} 
          disabled={!selectedPackage || isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : selectedPackage ? (
            `Pay ${currencyInfo.symbol} ${Math.round(selectedPackage.priceKes * currencyInfo.rate).toLocaleString()}`
          ) : (
            "Select a Package"
          )}
        </Button>
      </footer>
    </div>
  )
}

export default function RechargePage() {
  return (
    <Suspense fallback={<div className="flex h-svh items-center justify-center bg-white" />}>
      <RechargeContent />
    </Suspense>
  )
}
