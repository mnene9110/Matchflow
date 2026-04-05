"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Check, History, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { initializePesaPalTransaction } from "@/app/actions/pesapal"

const COIN_PACKAGES = [
  { amount: 500, price: 70, label: "70" },
  { amount: 1000, price: 120, label: "120" },
  { amount: 2000, price: 240, label: "240" },
  { amount: 5000, price: 600, label: "600" },
  { amount: 10000, price: 1200, label: "1,200" },
  { amount: 12500, price: 1500, label: "1,500" },
]

function RechargeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const { firestore } = useFirebase()
  const { toast } = useToast()
  
  const [selectedPackage, setSelectedPackage] = useState<typeof COIN_PACKAGES[0] | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const meRef = useMemoFirebase(() => user ? doc(firestore, "userProfiles", user.uid) : null, [firestore, user])
  const { data: profile } = useDoc(meRef)

  useEffect(() => {
    const status = searchParams?.get('status')
    if (status === 'success') {
      toast({ title: "Payment Successful", description: "Your balance has been updated." });
    } else if (status === 'error') {
      toast({ variant: "destructive", title: "Payment Failed" });
    }
  }, [searchParams, toast])

  const handlePayWithPesapal = async () => {
    if (!selectedPackage || !user) return;
    
    setIsProcessing(true)
    const email = user.email || `guest_${user.uid.slice(0, 8)}@matchflow.app`
    
    try {
      const result = await initializePesaPalTransaction(email, selectedPackage.price, {
        userId: user.uid,
        packageAmount: selectedPackage.amount
      })

      if (result.error) {
        setIsProcessing(false)
        toast({ variant: "destructive", title: "Gateway Error", description: result.error })
        return
      }

      if (result.redirect_url) {
        window.location.href = result.redirect_url
      }
    } catch (error) {
      setIsProcessing(false)
      toast({ variant: "destructive", title: "Error", description: "Failed to connect to PesaPal." })
    }
  }

  const darkMaroon = "bg-[#5A1010]";

  return (
    <div className="flex flex-col h-svh bg-transparent text-gray-900 overflow-hidden">
      <header className="px-4 py-6 flex items-center justify-between sticky top-0 bg-transparent z-10 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-gray-900 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="text-lg font-black font-headline tracking-widest uppercase text-white drop-shadow-md">Wallet</h1>
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

        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-3 ml-2 drop-shadow-sm">Select Package</h2>
          <div className="grid grid-cols-3 gap-3">
            {COIN_PACKAGES.map((pkg) => {
              const isSelected = selectedPackage?.amount === pkg.amount
              return (
                <Card key={pkg.amount} onClick={() => setSelectedPackage(pkg)} className={cn("relative aspect-square flex flex-col items-center justify-center gap-2 border-2 transition-all cursor-pointer rounded-[1.75rem]", isSelected ? "border-primary bg-white shadow-2xl scale-[1.05]" : "border-white/40 bg-white/20")}>
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", isSelected ? "bg-primary" : "bg-primary/10")}><span className={cn("font-black text-sm italic", isSelected ? "text-white" : "text-primary")}>S</span></div>
                  <div className="text-center"><p className={cn("text-sm font-black", isSelected ? "text-primary" : "text-gray-900")}>{pkg.amount.toLocaleString()}</p><p className="text-[9px] font-bold text-gray-400">{pkg.label} KES</p></div>
                  {isSelected && (<div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg"><Check className="w-3 h-3 text-white stroke-[4]" /></div>)}
                </Card>
              )
            })}
          </div>
        </section>

        <section className="mt-12 flex flex-col items-center pb-10">
          <button onClick={() => router.push(`/recharge/coinsellers`)} className="text-[10px] font-black text-white uppercase tracking-[0.3em] border-b border-white/30 pb-1.5 active:opacity-50">Contact Coinsellers</button>
        </section>
      </main>

      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50">
        <Button className={cn("w-full h-16 rounded-full text-white font-black text-lg shadow-2xl transition-all", darkMaroon)} onClick={handlePayWithPesapal} disabled={isProcessing || !selectedPackage}>
          {isProcessing ? (<div className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin" /><span>Connecting...</span></div>) : (`Pay ${selectedPackage ? `${selectedPackage.price} KES` : ""}`)}
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