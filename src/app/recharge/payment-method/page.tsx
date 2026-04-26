"use client"

import { useState, useEffect, use, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Users, Zap, Loader2, ShieldCheck, MessageCircle, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { initializePesaPalTransaction } from "@/app/actions/pesapal"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { COUNTRY_CURRENCIES } from "../page"

function PaymentMethodContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useSupabaseUser()
  const { toast } = useToast()

  const amount = Number(searchParams?.get('amount'))
  const localPrice = Number(searchParams?.get('price'))
  const currencyCode = searchParams?.get('currency') || "KES"

  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [coinsellers, setCoinsellers] = useState<any[]>([])
  const [isSellersLoading, setIsSellersLoading] = useState(true)

  const currencyInfo = COUNTRY_CURRENCIES[profile?.location || "Kenya"] || COUNTRY_CURRENCIES["Kenya"];
  const isKenyan = profile?.location === "Kenya";

  useEffect(() => {
    const fetchSellers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_coinseller', true);
      setCoinsellers(data || []);
      setIsSellersLoading(false);
    };
    fetchSellers();
  }, []);

  const handlePesapal = async () => {
    if (!profile || !amount || !localPrice) return
    setIsProcessing('pesapal')

    const priceKes = Math.round(localPrice / currencyInfo.rate);
    const email = profile.email || `guest_${profile.id.slice(0, 8)}@matchflow.app`
    
    const result = await initializePesaPalTransaction(email, priceKes, {
      userId: profile.id,
      packageAmount: amount
    })

    if (result.error) {
      setIsProcessing(null)
      toast({ variant: "destructive", title: "Error", description: result.error })
      return
    }

    if (result.redirect_url) {
      window.location.href = result.redirect_url
    }
  }

  return (
    <div className="flex flex-col min-h-svh bg-white text-gray-900">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-[#3BC1A8] z-10 text-white shadow-lg">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Select Payment</h1>
      </header>

      <main className="flex-1 px-6 pt-6 pb-20 space-y-8">
        <section className="bg-gray-50 border border-gray-100 rounded-[2.5rem] p-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Package Selected</p>
              <h2 className="text-2xl font-black font-headline text-gray-900">{amount.toLocaleString()} Coins</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Cost</p>
              <h2 className="text-2xl font-black font-headline text-primary">
                {currencyInfo.symbol} {localPrice.toLocaleString()}
              </h2>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Digital Gateway</h3>
          
          <button 
            onClick={handlePesapal}
            disabled={!!isProcessing}
            className="w-full flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[2rem] transition-all active:scale-[0.98] group shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/5">
                {isProcessing === 'pesapal' ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : <ShieldCheck className="w-6 h-6 text-blue-500" />}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[13px] font-bold text-gray-900">PesaPal Gateway</span>
                <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest mt-1">Live Payments</span>
              </div>
            </div>
            <Zap className="w-4 h-4 text-amber-400 fill-current opacity-30 group-hover:opacity-100 transition-opacity" />
          </button>
        </section>

        {isKenyan && (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Official Coinsellers</h3>
              <Users className="w-3.5 h-3.5 text-gray-300" />
            </div>

            <div className="space-y-3">
              {isSellersLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
              ) : coinsellers.length > 0 ? (
                coinsellers.map((seller: any) => (
                  <div 
                    key={seller.id}
                    className="w-full flex items-center justify-between p-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-white shadow-sm">
                        <AvatarImage src={seller.profile_photo_urls?.[0]} className="object-cover" />
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
                      onClick={() => router.push(`/chat/${seller.id}?msg=${encodeURIComponent(`I want to buy ${amount} coins for ${currencyInfo.symbol} ${localPrice}`)}`)}
                      className="h-10 px-4 rounded-full bg-primary/5 text-primary hover:bg-primary/10 font-black text-[9px] uppercase tracking-widest gap-2"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Buy via Chat
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-gray-50 rounded-[2rem] border border-gray-100 border-dashed">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No sellers online</p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default function PaymentMethodPage() {
  return (
    <Suspense fallback={<div className="flex h-svh items-center justify-center bg-white" />}>
      <PaymentMethodContent />
    </Suspense>
  )
}