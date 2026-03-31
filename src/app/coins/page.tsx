"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, List, Check, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useDoc, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase"
import { doc, collection } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { initiatePesaPalPayment } from "@/app/actions/pesapal"

const COIN_PACKAGES = [
  { amount: 1000, price: 100, label: "KES 100" },
  { amount: 2000, price: 200, label: "KES 200" },
  { amount: 5000, price: 500, label: "KES 500" },
  { amount: 10000, price: 1000, label: "KES 1,000" },
  { amount: 20000, price: 2000, label: "KES 2,000" },
  { amount: 50000, price: 5000, label: "KES 5,000" },
  { amount: 100000, price: 10000, label: "KES 10,000" },
]

export default function WalletPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
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

  useEffect(() => {
    const status = searchParams.get('status')
    if (status === 'success') {
      toast({
        title: "Payment Received",
        description: "Your balance will be updated once the transaction is processed.",
      })
    }
  }, [searchParams, toast])

  const handlePay = async () => {
    if (!coinAccountRef || !coinAccount || !user || !firestore) return;

    setIsProcessing(true)
    
    try {
      const result = await initiatePesaPalPayment(
        selectedPackage.price, 
        user.email || `${user.uid}@matchflow.app`, 
        user.uid
      );

      if (result.error) {
        setIsProcessing(false);
        toast({
          variant: "destructive",
          title: "Payment Error",
          description: result.error,
        });
      } else if (result.redirect_url) {
        // Redirect to live PesaPal checkout
        window.location.href = result.redirect_url;
      }
    } catch (e) {
      setIsProcessing(false);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Could not connect to payment server.",
      });
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

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Select Package</h2>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100">
              <ShieldCheck className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider">PesaPal Live</span>
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
                      ? "border-primary bg-primary/5 shadow-md" 
                      : "border-gray-100 bg-white"
                  )}
                >
                  <div className="bg-amber-400 p-1.5 rounded-full shadow-sm">
                    <span className="text-white font-black text-xs italic">S</span>
                  </div>
                  <span className={cn("text-xs font-black", isSelected ? "text-primary" : "text-gray-600")}>
                    {pkg.amount}
                  </span>
                  
                  {isSelected && (
                    <div className="absolute -bottom-1 -right-1 bg-primary text-white p-0.5 rounded-tl-xl rounded-br-2xl">
                      <Check className="w-3 h-3 stroke-[4]" />
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 z-50">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-center gap-2 opacity-40">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">
              Secured by PesaPal V3 Production Gateway
            </p>
          </div>
          <Button 
            className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl active:scale-95 transition-all"
            onClick={handlePay}
            disabled={isProcessing || isLoading}
          >
            {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : `Pay ${selectedPackage.label}`}
          </Button>
        </div>
      </footer>
    </div>
  )
}
