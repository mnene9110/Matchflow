
"use client"

import { useState, use, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, CreditCard, Users, Zap, Loader2, ShieldCheck, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { initializePaystackTransaction } from "@/app/actions/paystack"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function PaymentMethodContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const { firestore } = useFirebase()
  const { toast } = useToast()

  const amount = Number(searchParams?.get('amount'))
  const price = Number(searchParams?.get('price'))

  const [isProcessing, setIsProcessing] = useState(false)

  // Fetch verified coinsellers
  const coinsellersQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, "userProfiles"), where("isCoinseller", "==", true))
  }, [firestore])

  const { data: coinsellers, isLoading: isSellersLoading } = useCollection(coinsellersQuery)

  const handlePaystack = async () => {
    if (!user || !amount || !price) return
    setIsProcessing(true)
    
    const email = user.email || `guest_${user.uid.slice(0, 8)}@matchflow.app`
    const result = await initializePaystackTransaction(email, price, {
      userId: user.uid,
      packageAmount: amount,
      username: user.displayName || 'User'
    })

    if (result.error) {
      setIsProcessing(false)
      toast({ variant: "destructive", title: "Error", description: result.error })
      return
    }

    if (result.authorization_url) {
      window.location.href = result.authorization_url
    }
  }

  const handlePesapal = () => {
    toast({
      title: "PesaPal Selected",
      description: "Redirecting to PesaPal payment gateway...",
    })
    // PesaPal integration logic would go here
  }

  const darkMaroon = "bg-[#5A1010]";

  return (
    <div className="flex flex-col min-h-svh bg-transparent text-gray-900">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-transparent z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-gray-900 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Select Payment</h1>
      </header>

      <main className="flex-1 px-6 pt-4 pb-20 space-y-8">
        <section className="bg-white/40 backdrop-blur-md border border-white/40 rounded-[2.5rem] p-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Package Selected</p>
              <h2 className="text-2xl font-black font-headline text-gray-900">{amount.toLocaleString()} Coins</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Cost</p>
              <h2 className="text-2xl font-black font-headline text-primary">{price} KES</h2>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] ml-2">Digital Payments</h3>
          
          <button 
            onClick={handlePaystack}
            disabled={isProcessing}
            className="w-full flex items-center justify-between p-5 bg-white/60 backdrop-blur-md border border-white rounded-[2rem] transition-all active:scale-[0.98] group shadow-sm hover:bg-white"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/5">
                {isProcessing ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <CreditCard className="w-6 h-6 text-primary" />}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[13px] font-bold text-gray-900">Paystack Checkout</span>
                <span className="text-[9px] font-black uppercase text-green-500 tracking-widest mt-1">Instant Activation</span>
              </div>
            </div>
            <Zap className="w-4 h-4 text-amber-400 fill-current opacity-30 group-hover:opacity-100 transition-opacity" />
          </button>

          <button 
            onClick={handlePesapal}
            className="w-full flex items-center justify-between p-5 bg-white/60 backdrop-blur-md border border-white rounded-[2rem] transition-all active:scale-[0.98] group shadow-sm hover:bg-white"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/5">
                <ShieldCheck className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[13px] font-bold text-gray-900">PesaPal Gateway</span>
                <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest mt-1">Secure Transaction</span>
              </div>
            </div>
          </button>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em]">Official Coinsellers</h3>
            <Users className="w-3.5 h-3.5 text-gray-300" />
          </div>

          <div className="space-y-3">
            {isSellersLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
            ) : coinsellers && coinsellers.length > 0 ? (
              coinsellers.map((seller: any) => (
                <div 
                  key={seller.id}
                  className="w-full flex items-center justify-between p-4 bg-white/40 backdrop-blur-md border border-white/30 rounded-[2rem] shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-white shadow-sm">
                      <AvatarImage src={seller.profilePhotoUrls?.[0] || `https://picsum.photos/seed/${seller.id}/100/100`} className="object-cover" />
                      <AvatarFallback className="bg-primary text-white text-[10px] font-black">{seller.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-gray-900">{seller.username}</span>
                      <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Available Now</span>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(`/chat/${seller.id}`)}
                    className="h-10 px-4 rounded-full bg-white/50 text-primary hover:bg-white font-black text-[9px] uppercase tracking-widest gap-2"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Buy via Chat
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-white/20 rounded-[2rem] border border-white/30 border-dashed">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No sellers online</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 flex flex-col items-center gap-2">
        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Payments are encrypted and secure</p>
      </footer>
    </div>
  )
}

export default function PaymentMethodPage() {
  return (
    <Suspense fallback={<div className="flex h-svh items-center justify-center bg-transparent" />}>
      <PaymentMethodContent />
    </Suspense>
  )
}
