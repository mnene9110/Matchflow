
"use client"

import { useState, useEffect, useRef, useMemo, Suspense } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { 
  ChevronLeft, 
  Send, 
  Loader2, 
  CheckCircle, 
  Gift, 
  Phone, 
  Video,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export const GIFTS = [
  { id: 'butterfly', name: 'Butterfly', image: '/butterfly.png', price: 300 },
  { id: 'roses', name: 'Rose Bouquet', image: '/bouquet.png', price: 500 },
  { id: 'ring', name: 'Diamond Ring', emoji: '💍', price: 1000 },
  { id: 'champagne', name: 'Champagne', image: '/champagne.png', price: 1200 },
  { id: 'trophy', name: 'Gold Trophy', image: '/trophy.png', price: 1500 },
  { id: 'fireworks', name: 'Fireworks', image: '/fireworks.png', price: 2000 },
  { id: 'goldbar', name: 'Gold Bar', image: '/goldbar.png', price: 2500 },
  { id: 'crown', name: 'Royal Crown', image: '/crown.png', price: 3000 },
  { id: 'lamp', name: 'Magic Lamp', image: '/magiclamp.png', price: 4000 },
  { id: 'car', name: 'Sport Car', image: '/sportcar.png', price: 5000 },
  { id: 'crystal', name: 'Crystal Ball', image: '/crystalball.png', price: 6000 },
  { id: 'map', name: 'Treasure Map', image: '/treasuremap.png', price: 8500 },
  { id: 'scroll', name: 'Ancient Scroll', image: '/scroll.png', price: 12000 },
  { id: 'yacht', name: 'Luxury Yacht', image: '/yatch.png', price: 20000 },
  { id: 'phoenix', name: 'Phoenix', image: '/phonix.png', price: 35000 },
  { id: 'jet', name: 'Private Jet', image: '/privatejet.png', price: 50000 },
  { id: 'dragon', name: 'Flying Dragon', image: '/dragon.png', price: 75000 },
  { id: 'supernova', name: 'Supernova', image: '/supernova.png', price: 100000 },
  { id: 'galaxy', name: 'Galaxy', image: '/galaxy.png', price: 250000 },
  { id: 'timemachine', name: 'Time Machine', image: '/timemachine.png', price: 450000 },
  { id: 'universe', name: 'Universe Core', image: '/universe.png', price: 500000 },
]

function ChatDetailContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const otherUserId = params?.id as string
  
  const { user: currentUser, profile: currentUserProfile, isLoading: isUserLoading } = useSupabaseUser()
  const router = useRouter()
  const { toast } = useToast()
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const [inputText, setInputText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [otherUser, setOtherUser] = useState<any>(null)
  const [isLoadingMessages, setIsLoadingLoadingMessages] = useState(true)
  
  const [isGiftSheetOpen, setIsGiftSheetOpen] = useState(false)
  const [isCalling, setIsCalling] = useState(false)

  const chatId = useMemo(() => {
    if (!currentUser || !otherUserId) return ""
    return [currentUser.id, otherUserId].sort().join("_")
  }, [currentUser?.id, otherUserId])

  // Fetch Other User Profile
  useEffect(() => {
    if (!otherUserId) return;
    const fetchOther = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', otherUserId).single();
      setOtherUser(data);
    };
    fetchOther();
  }, [otherUserId]);

  // Fetch Messages and Subscribe
  useEffect(() => {
    if (!chatId || !currentUser) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(50);
      setMessages(data || []);
      setIsLoadingLoadingMessages(false);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `chat_id=eq.${chatId}` 
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, currentUser]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textOverride?: string) => {
    const textToUse = textOverride || inputText;
    if (!textToUse.trim() || !currentUser || !chatId || isSending) return
    
    setIsSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: currentUser.id,
        message_text: textToUse
      });

      if (error) throw error;
      
      await supabase.from('chats').upsert({
        id: chatId,
        participants: [currentUser.id, otherUserId],
        last_message: textToUse,
        last_message_at: new Date().toISOString()
      }, { onConflict: 'id' });

      if (!textOverride) setInputText("");
    } catch (e) {
      toast({ variant: "destructive", title: "Send Failed" });
    } finally {
      setIsSending(false);
    }
  }

  const handleInitiateCall = async (type: 'video' | 'audio') => {
    if (!currentUser || !otherUser || isCalling) return;
    
    const cost = type === 'video' ? 160 : 80;
    if ((currentUserProfile?.coin_balance || 0) < cost) {
      toast({ 
        variant: "destructive", 
        title: "Insufficient Coins", 
        description: `You need at least ${cost} coins to call.`,
        action: <Button variant="outline" size="sm" onClick={() => router.push('/recharge')}>Recharge</Button>
      });
      return;
    }

    setIsCalling(true);
    try {
      // 1. Create call record
      const { error: callError } = await supabase.from('calls').insert({
        id: chatId,
        caller_id: currentUser.id,
        receiver_id: otherUserId,
        caller_name: currentUserProfile?.username || "Someone",
        call_type: type,
        status: 'ringing',
        cost_per_min: cost,
        timestamp: Date.now()
      });

      if (callError) throw callError;

      // 2. Signal the receiver
      await supabase.from('profiles').update({ incoming_call_id: chatId }).eq('id', otherUserId);
      
      // GlobalCallOverlay will handle the UI from here
    } catch (error) {
      toast({ variant: "destructive", title: "Call Failed", description: "Could not start call." });
    } finally {
      setIsCalling(false);
    }
  }

  const handleSendGift = async (gift: typeof GIFTS[0]) => {
    if (!currentUser || !otherUser || isSending) return;
    if ((currentUserProfile?.coin_balance || 0) < gift.price) {
      toast({ variant: "destructive", title: "Insufficient Coins" });
      return;
    }

    setIsSending(true);
    try {
      // 1. Deduct from sender
      await supabase.from('profiles').update({ 
        coin_balance: currentUserProfile.coin_balance - gift.price 
      }).eq('id', currentUser.id);

      // 2. Add diamonds to receiver
      await supabase.from('profiles').update({ 
        diamond_balance: (otherUser.diamond_balance || 0) + gift.price 
      }).eq('id', otherUserId);

      // 3. Log transactions
      await supabase.from('transactions').insert([
        { user_id: currentUser.id, type: 'gift_sent', amount: -gift.price, description: `Sent ${gift.name}`, gift_id: gift.id },
        { user_id: otherUserId, type: 'gift_received', amount: gift.price, description: `Received ${gift.name}`, gift_id: gift.id }
      ]);

      // 4. Send message
      await handleSendMessage(`🎁 Sent a ${gift.name}!`);
      setIsGiftSheetOpen(false);
      toast({ title: "Gift Sent!" });
    } catch (e) {
      toast({ variant: "destructive", title: "Gift Failed" });
    } finally {
      setIsSending(false);
    }
  }

  if (isUserLoading || isLoadingMessages) {
    return <div className="flex h-svh items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  const otherUserName = otherUser?.username || "User";
  const otherUserImage = (otherUser?.profile_photo_urls && otherUser.profile_photo_urls[0]) || `https://picsum.photos/seed/${otherUserId}/200/200`;

  return (
    <div className="flex flex-col h-svh bg-white relative overflow-hidden text-gray-900">
      <header className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 bg-[#3BC1A8] flex items-center justify-between sticky top-0 z-10 shadow-lg text-white">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-md text-white"><ChevronLeft className="w-5 h-5" /></Button>
        
        <div className="flex items-center gap-2.5 transition-opacity flex-1 justify-center cursor-pointer active:opacity-70 px-2 min-w-0" onClick={() => router.push(`/profile/${otherUserId}`)}>
          <Avatar className="w-8 h-8 border border-white/20 shadow-sm shrink-0">
            <AvatarImage src={otherUserImage} className="object-cover" />
            <AvatarFallback>{otherUserName[0] || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col truncate">
            <div className="flex items-center gap-1">
              <h3 className="font-black text-[12px] leading-tight truncate">{otherUserName}</h3>
              {otherUser?.is_verified && <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-current" />}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleInitiateCall('audio')} className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-md text-white"><Phone className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleInitiateCall('video')} className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-md text-white"><Video className="w-4 h-4" /></Button>
        </div>
      </header>

      <ScrollArea className="flex-1 px-4 py-4 bg-white">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] px-4 py-3 text-[13px] font-medium leading-relaxed shadow-sm transition-all", 
                  isMe ? "bg-primary text-white rounded-[1.5rem] rounded-tr-none" : "bg-gray-100 text-gray-900 rounded-[1.5rem] rounded-tl-none"
                )}>
                  <p className="whitespace-pre-wrap">{msg.message_text}</p>
                </div>
              </div>
            )
          })}
          <div ref={scrollRef} className="h-4" />
        </div>
      </ScrollArea>

      <footer className="px-5 py-5 pb-8 bg-white border-t border-gray-50 flex items-center gap-3">
        <Sheet open={isGiftSheetOpen} onOpenChange={setIsGiftSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-amber-50 text-amber-500 shrink-0"><Gift className="w-6 h-6" /></Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-[2.5rem] p-6 pb-12 max-h-[70svh]">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-xl font-black font-headline text-center uppercase tracking-widest">Send a Gift</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-4 overflow-y-auto no-scrollbar pb-10">
              {GIFTS.map((gift) => (
                <button key={gift.id} onClick={() => handleSendGift(gift)} className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 transition-colors active:scale-95">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner overflow-hidden">
                    {gift.image ? <img src={gift.image} className="w-10 h-10 object-contain" /> : gift.emoji}
                  </div>
                  <span className="text-[10px] font-black uppercase text-gray-400 truncate w-full text-center">{gift.name}</span>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded-full">
                    <span className="text-[9px] font-black text-primary">{gift.price}</span>
                  </div>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        <div className="relative flex-1 group">
          <Input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Message..." className="rounded-full h-12 bg-gray-50 border-none px-6 text-[13px] pr-12" onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
          <Button size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full w-9 h-9" onClick={() => handleSendMessage()} disabled={!inputText.trim() || isSending}>
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </footer>
    </div>
  )
}

export default function ChatDetailPage() {
  return (
    <Suspense fallback={<div className="flex h-svh items-center justify-center bg-white" />}>
      <ChatDetailContent />
    </Suspense>
  )
}
