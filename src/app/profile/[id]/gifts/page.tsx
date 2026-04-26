"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Loader2, 
  Gift as GiftIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { GIFTS } from "@/app/chat/[id]/page"

export default function UserGiftsPage() {
  const { id } = useParams()
  const router = useRouter()
  
  const [userProfile, setUserProfile] = useState<any>(null)
  const [giftTransactions, setGiftTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', id)
        .single();
      
      setUserProfile(profile);

      // Fetch Gifts
      const { data: gifts } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', id)
        .eq('type', 'gift_received');
      
      setGiftTransactions(gifts || []);
      setIsLoading(false);
    };

    fetchData();
  }, [id]);

  const groupedGifts = useMemo(() => {
    if (!giftTransactions) return []
    const map = new Map<string, { giftId: string; count: number }>()
    
    giftTransactions.forEach((tx: any) => {
      const gId = tx.gift_id || tx.giftId;
      if (!gId) return
      const existing = map.get(gId) || { giftId: gId, count: 0 }
      map.set(gId, { giftId: gId, count: existing.count + 1 })
    })
    
    return Array.from(map.values())
      .map(g => ({
        ...g,
        info: GIFTS.find(gd => gd.id === g.giftId)
      }))
      .filter(g => g.info)
      .sort((a, b) => b.count - a.count)
  }, [giftTransactions])

  if (isLoading) return <div className="flex h-svh items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900 font-body overflow-hidden">
      <header className="px-4 py-8 flex items-center sticky top-0 bg-[#3BC1A8] z-50 shrink-0 text-white shadow-lg">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm"><ChevronLeft className="w-6 h-6" /></Button>
        <div className="ml-4">
          <h1 className="text-lg font-black font-headline tracking-widest uppercase">Gift Wall</h1>
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{userProfile?.username}'s collection</p>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto scroll-smooth">
        {groupedGifts.length > 0 ? (
          <div className="grid grid-cols-3 gap-4 pb-20">
            {groupedGifts.map((gift) => (
              <div key={gift.giftId} className="flex flex-col items-center space-y-2 animate-in zoom-in duration-300">
                <div className="relative aspect-square w-full bg-gray-50 border border-gray-100 rounded-[2rem] flex items-center justify-center shadow-sm overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent opacity-50" />
                  {gift.info?.image ? (
                    <img src={gift.info.image} alt={gift.info.name} className="w-12 h-12 object-contain drop-shadow-sm group-hover:scale-110 transition-transform" />
                  ) : (
                    <span className="text-4xl group-hover:scale-110 transition-transform">{gift.info?.emoji || '🎁'}</span>
                  )}
                  <div className="absolute bottom-2 right-3">
                    <span className="text-lg font-black text-primary italic drop-shadow-sm">x{gift.count}</span>
                  </div>
                </div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate w-full text-center">
                  {gift.info?.name}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 text-center opacity-30">
            <div className="w-24 h-24 bg-gray-50 rounded-[3rem] flex items-center justify-center border-2 border-dashed border-gray-200 mb-6">
              <GiftIcon className="w-10 h-10 text-gray-200" />
            </div>
            <h3 className="text-sm font-black text-gray-900 uppercase">Empty Wall</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">No gifts have been received yet</p>
          </div>
        )}
      </main>
    </div>
  )
}