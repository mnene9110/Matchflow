"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, MessageCircle, Users, Loader2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { useToast } from "@/hooks/use-toast"
import { COUNTRY_CURRENCIES, STANDARD_PACKAGES } from "../page"

function CoinsellersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useSupabaseUser()
  const { toast } = useToast()

  const selectedAmount = Number(searchParams?.get('amount'))
  const [coinsellers, setCoinsellers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const currencyInfo = COUNTRY_CURRENCIES[profile?.location || "Kenya"] || COUNTRY_CURRENCIES["Kenya"];

  useEffect(() => {
    const fetchSellers = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_coinseller', true);
      
      setCoinsellers(data || []);
      setIsLoading(false);
    };

    fetchSellers();
  }, []);

  const handleChatWithSeller = (sellerId: string) => {
    const pkg = STANDARD_PACKAGES.find(p => p.amount === selectedAmount);
    const localPrice = pkg ? Math.round(pkg.priceKes * currencyInfo.rate) : 0;

    const message = selectedAmount 
      ? `I want to buy ${selectedAmount} coins for ${currencyInfo.symbol} ${localPrice}` 
      : "I want to buy coins"
    
    router.push(`/chat/${sellerId}?msg=${encodeURIComponent(message)}`)
  }

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    toast({ title: "ID Copied", description: "Coinseller ID copied to clipboard." })
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
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Official Sellers</h1>
      </header>

      <main className="flex-1 px-6 pb-20 space-y-4 pt-6">
        <div className="flex items-center gap-2 mb-2">
           <Users className="w-4 h-4 text-primary/40" />
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select a seller to purchase coins in {currencyInfo.code}</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading sellers...</span>
          </div>
        ) : coinsellers && coinsellers.length > 0 ? (
          <div className="space-y-3">
            {coinsellers.map((seller: any) => (
              <div 
                key={seller.id}
                className="w-full flex items-center justify-between p-5 bg-gray-50 border border-gray-100 rounded-[2.5rem] shadow-sm hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12 border border-white shadow-sm">
                    <AvatarImage src={seller.profile_photo_urls?.[0]} className="object-cover" />
                    <AvatarFallback className="bg-primary text-white text-xs font-black">{seller.username?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-gray-900 leading-tight">{seller.username}</span>
                    <button 
                      onClick={() => copyId(seller.numeric_id?.toString() || "")}
                      className="flex items-center gap-1 mt-0.5 text-[9px] font-bold text-green-500 uppercase tracking-widest active:scale-95 transition-transform"
                    >
                      ID: {seller.numeric_id || "---"}
                      <Copy className="w-2.5 h-2.5 opacity-50" />
                    </button>
                  </div>
                </div>
                <Button 
                  size="icon"
                  onClick={() => handleChatWithSeller(seller.id)}
                  className="w-12 h-12 rounded-2xl bg-zinc-900 text-white shadow-lg active:scale-90 transition-transform"
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center border border-gray-100">
              <Users className="w-8 h-8 text-gray-200" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-900 uppercase">No Sellers Online</h3>
              <p className="text-[10px] font-bold text-gray-400 max-w-[180px] mx-auto uppercase tracking-tighter">
                Please try again later or use the digital payment gateway.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function CoinsellersPage() {
  return (
    <Suspense fallback={<div className="flex h-svh items-center justify-center bg-white" />}>
      <CoinsellersContent />
    </Suspense>
  )
}