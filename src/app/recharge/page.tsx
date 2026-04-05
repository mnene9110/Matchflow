
"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Check, History, Loader2, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useFirebase, useDoc, useUser, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// Standard Pricing (Normal Users)
const STANDARD_PACKAGES = [
  { amount: 500, priceKes: 70 },
  { amount: 1000, priceKes: 120 },
  { amount: 2000, priceKes: 240 },
  { amount: 5000, priceKes: 600 },
  { amount: 10000, priceKes: 1200 },
  { amount: 12500, priceKes: 1500 },
]

// Wholesale Pricing (Coinsellers)
const COINSELLER_PACKAGES = [
  { amount: 500, priceKes: 40 },
  { amount: 1000, priceKes: 75 },
  { amount: 2000, priceKes: 140 },
  { amount: 5000, priceKes: 350 },
  { amount: 10000, priceKes: 680 },
  { amount: 12500, priceKes: 850 },
]

export const COUNTRY_CURRENCIES: Record<string, { code: string; symbol: string; rate: number }> = {
  "Burundi": { code: "BIF", symbol: "FBu", rate: 22.1 },
  "Comoros": { code: "KMF", symbol: "CF", rate: 3.5 },
  "Djibouti": { code: "DJF", symbol: "Fdj", rate: 1.37 },
  "Eritrea": { code: "ERN", symbol: "Nfk", rate: 0.115 },
  "Ethiopia": { code: "ETB", symbol: "Br", rate: 0.94 },
  "Kenya": { code: "KES", symbol: "KES", rate: 1.0 },
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

  const meRef = useMemoFirebase(() => user ? doc(firestore, "userProfiles", user.uid) : null, [firestore, user])
  const { data: profile } = useDoc(meRef)

  const isCoinseller = profile?.isCoinseller === true;
  const packages = isCoinseller ? COINSELLER_PACKAGES : STANDARD_PACKAGES;
  const currencyInfo = COUNTRY_CURRENCIES[profile?.location || "Kenya"] || COUNTRY_CURRENCIES["Kenya"];

  useEffect(() => {
    const status = searchParams?.get('status')
    if (status === 'success') {
      toast({ title: "Payment Successful", description: "Your balance has been updated." });
    } else if (status === 'error') {
      toast({ variant: "destructive", title: "Payment Failed" });
    }
  }, [searchParams, toast])

  const handleNext = () => {
    if (!selectedPackage) return;
    const localPrice = Math.round(selectedPackage.priceKes * currencyInfo.rate);
    router.push(`/recharge/payment-method?amount=${selectedPackage.amount}&price=${localPrice}&currency=${currencyInfo.code}`);
  }

  const darkMaroon = "bg-[#5A1010]";

  return (
    <div className="flex flex-col h-svh bg-transparent text-gray-900 overflow-hidden">
      <header className="px-4 py-6 flex items-center justify-between sticky top-0 bg-transparent z-10 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-gray-900 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm"><ChevronLeft className="w-6 h-6" /></Button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-black font-headline tracking-widest uppercase text-white drop-shadow-md">Wallet</h1>
          <p className="text-[8px] font-black text-white/60 uppercase tracking-widest">{currencyInfo.code} Region</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => router.push('/recharge/history')} className="text-gray-900 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full"><History className="w-5 h-5" /></Button>
      </header>

      <main className="flex-1 px-6 pt-4 pb-44 overflow-y-auto scroll-smooth">
        <section className="mb-8">
          <div className="flex items-center gap-4 bg-white/40 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/40 shadow-xl">
            <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center"><span className="text-primary font-black text-2xl italic">S</span></div>
            <div className="flex flex-col">
              <span className="text-4xl font-black font-headline tracking-tighter text-gray-900">{(profile?.coinBalance || 0).toLocaleString()}</span>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Available Coins</span>
            </div>
          </div>
        </section>

        {isCoinseller && (
          <div className="mx-2 mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-600 fill-current" />
            <div className="flex-1">
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-none">Coinseller Wholesale Access</p>
              <p className="text-[8px] font-bold text-amber-600 uppercase tracking-tighter mt-1">Special bulk rates applied automatically</p>
            </div>
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-3 ml-2 drop-shadow-sm">Select Package</h2>
          <div className="grid grid-cols-3 gap-3">
            {packages.map((pkg) => {
              const isSelected = selectedPackage?.amount === pkg.amount;
              const localPrice = Math.round(pkg.priceKes * currencyInfo.rate);
              
              return (
                <Card key={pkg.amount} onClick={() => setSelectedPackage(pkg)} className={cn("relative aspect-square flex flex-col items-center justify-center gap-2 border-2 transition-all cursor-pointer rounded-[1.75rem]", isSelected ? "border-primary bg-white shadow-2xl scale-[1.05]" : "border-white/40 bg-white/20")}>
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", isSelected ? "bg-primary" : "bg-primary/10")}><span className={cn("font-black text-sm italic", isSelected ? "text-white" : "text-primary")}>S</span></div>
                  <div className="text-center">
                    <p className={cn("text-sm font-black", isSelected ? "text-primary" : "text-gray-900")}>{pkg.amount.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-gray-400">
                      {currencyInfo.symbol} {localPrice.toLocaleString()}
                    </p>
                  </div>
                  {isSelected && (<div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg"><Check className="w-3 h-3 text-white stroke-[4]" /></div>)}
                </Card>
              )
            })}
          </div>
        </section>

        {!isCoinseller && (
          <section className="mt-12 flex flex-col items-center pb-10">
            <button onClick={() => router.push(`/recharge/coinsellers`)} className="text-[10px] font-black text-white uppercase tracking-[0.3em] border-b border-white/30 pb-1.5 active:opacity-50">Contact Coinsellers</button>
          </section>
        )}
      </main>

      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50">
        <Button className={cn("w-full h-16 rounded-full text-white font-black text-lg shadow-2xl transition-all", darkMaroon)} onClick={handleNext} disabled={!selectedPackage}>
          {selectedPackage ? `Pay ${currencyInfo.symbol} ${Math.round(selectedPackage.priceKes * currencyInfo.rate).toLocaleString()}` : "Select a Package"}
        </Button>
      </footer>
    </div>
  )
}

export default function RechargePage() {
  return (
    <Suspense fallback={<div className="flex h-svh items-center justify-center bg-transparent" />}>
      <RechargeContent />
    </Suspense>
  )
}
