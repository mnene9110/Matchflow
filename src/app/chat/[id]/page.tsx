
"use client"

import { useState, useEffect, useRef, useMemo, Suspense } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Video, Send, Phone, Loader2, Gift, CheckCircle, UserX, ArrowUp, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase"
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  increment, 
  runTransaction,
  where,
  getDoc,
  getDocs,
  setDoc
} from "firebase/firestore"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export const GIFTS = [
  { id: 'mask', name: 'Party mask 🎭', emoji: '🎭', price: 20 },
  { id: 'handbag', name: 'Luxury Bag 👜', emoji: '👜', price: 800 },
  { id: 'tea', name: 'Strong Tea 🍵', emoji: '🍵', price: 100 },
  { id: 'duck', name: 'Cute duck 🦆', emoji: '🦆', price: 20 },
  { id: 'treasure', name: 'Treasure 💎', emoji: '💎', price: 500 },
  { id: 'puppy', name: 'Puppy 🐶', emoji: '🐶', price: 150 },
  { id: 'castle', name: 'Moon castle 🏰', emoji: '🏰', price: 800 },
  { id: 'rabbit', name: 'Rabbit 🐰', emoji: '🐰', price: 150 },
  { id: 'cat', name: 'Cat 🐱', emoji: '🐱', price: 150 },
  { id: 'balloon', name: 'Balloon 🎈', emoji: '🎈', price: 20 },
  { id: 'soulmate', name: 'Soul mate 💖', emoji: '💖', price: 30 },
  { id: 'ufo', name: 'UFO 🛸', emoji: '🛸', price: 1990 },
]

function ChatDetailContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const otherUserId = params?.id as string
  const initialMsg = searchParams?.get('msg')
  
  const { user: currentUser } = useUser()
  const { firestore } = useFirebase()
  const router = useRouter()
  const { toast } = useToast()
  
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const [inputText, setInputText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  
  // PAGINATION
  const [msgLimit, setMsgLimit] = useState(30)
  const [hasMore, setHasMore] = useState(true)

  const [isGiftSheetOpen, setIsGiftSheetOpen] = useState(false)
  const [selectedGift, setSelectedGift] = useState<typeof GIFTS[0] | null>(null)
  const [isSendingGift, setIsSendingGift] = useState(false)

  const chatId = useMemo(() => {
    if (!currentUser || !otherUserId) return ""
    return [currentUser.uid, otherUserId].sort().join("_")
  }, [currentUser?.uid, otherUserId])

  const otherUserRef = useMemoFirebase(() => otherUserId ? doc(firestore, "userProfiles", otherUserId) : null, [firestore, otherUserId])
  const { data: otherUser, isLoading: isOtherUserLoading } = useDoc(otherUserRef)

  const meRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser?.uid])
  const { data: currentUserProfile } = useDoc(meRef)

  useEffect(() => {
    if (!firestore || !chatId) return
    const msgQuery = query(
      collection(firestore, "chats", chatId, "messages"),
      orderBy("sentAt", "desc"),
      limit(msgLimit)
    )

    return onSnapshot(msgQuery, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      list.sort((a: any, b: any) => (a.sentAt?.seconds || 0) - (b.sentAt?.seconds || 0))
      setMessages(list)
      setHasMore(snapshot.docs.length >= msgLimit)
    })
  }, [firestore, chatId, msgLimit])

  useEffect(() => {
    if (initialMsg && currentUser && otherUserId && otherUser && !isSending) {
      const timer = setTimeout(() => {
        handleSendMessage(initialMsg);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [initialMsg, !!currentUser, otherUserId, !!otherUser]);

  useEffect(() => {
    if (!firestore || !currentUser || !chatId) return
    const chatRef = doc(firestore, "chats", chatId)
    updateDoc(chatRef, { [`unreadCount_${currentUser.uid}`]: 0 }).catch(() => {})
  }, [firestore, currentUser, chatId, messages.length])

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleInitiateCall = async (type: 'video' | 'audio') => {
    if (!firestore || !chatId || !currentUser || !currentUserProfile || !otherUser) return

    if (otherUser.inCall) {
      toast({ variant: "destructive", title: "User Busy", description: "This user is currently on another call." });
      return;
    }

    const dndKey = type === 'video' ? 'dndVideo' : 'dndVoice';
    if (otherUser.settings?.[dndKey]) {
      toast({ variant: "destructive", title: "Do Not Disturb", description: `This user has enabled DND for ${type} calls.` });
      return;
    }

    const costPerMin = type === 'video' ? 160 : 80;
    const userCoins = currentUserProfile.coinBalance || 0;
    const isFree = currentUserProfile.isAdmin || currentUserProfile.isSupport || currentUserProfile.isCoinseller || otherUser.isSupport || otherUser.isCoinseller;

    if (!isFree && userCoins < costPerMin) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: `You need at least ${costPerMin} coins to start this call.`,
        action: <Button onClick={() => router.push('/recharge')} size="sm" className="bg-white text-primary">Recharge</Button>
      });
      return;
    }

    const callRef = doc(firestore, "calls", chatId);
    await setDoc(callRef, { 
      callerId: currentUser.uid, 
      receiverId: otherUserId, 
      status: 'ringing', 
      callType: type, 
      timestamp: Date.now(),
      callerName: currentUserProfile.username || 'Someone',
      costPerMin: costPerMin,
      isFree: isFree
    });

    await updateDoc(doc(firestore, "userProfiles", otherUserId), { incomingCallId: chatId });
    await updateDoc(doc(firestore, "userProfiles", currentUser.uid), { incomingCallId: chatId });
  }

  const handleSendMessage = async (textOverride?: string) => {
    const textToUse = textOverride || inputText;
    if (!textToUse.trim() || !currentUser || !chatId || !firestore || !otherUserId || !otherUser || isSending || !currentUserProfile) return
    
    const isMemberOfMyAgency = currentUserProfile.agencyId && otherUser.memberOfAgencyId === currentUserProfile.agencyId;
    const isMyAgent = currentUserProfile.memberOfAgencyId && otherUser.agencyId === currentUserProfile.memberOfAgencyId;
    
    // Messaging is free for females, or between agents and their members
    const isFree = currentUserProfile.isAdmin || 
                   currentUserProfile.isSupport || 
                   currentUserProfile.isCoinseller || 
                   otherUser.isSupport || 
                   otherUser.isCoinseller || 
                   currentUserProfile.gender?.toLowerCase() === 'female' || 
                   isMemberOfMyAgency || 
                   isMyAgent;

    const messageCost = isFree ? 0 : 15;
    
    setIsSending(true)
    try {
      await runTransaction(firestore, async (transaction) => {
        if (messageCost > 0) {
          const myProfileSnap = await transaction.get(meRef!);
          const myBalance = myProfileSnap.data()?.coinBalance || 0;
          if (myBalance < messageCost) throw new Error("INSUFFICIENT_COINS");
          
          transaction.update(meRef!, { coinBalance: increment(-messageCost) });
          
          const logRef = doc(collection(firestore, "userProfiles", currentUser.uid, "transactions"));
          transaction.set(logRef, {
            id: logRef.id,
            type: "deduction",
            amount: -messageCost,
            transactionDate: new Date().toISOString(),
            description: `Message to ${otherUser.username}`
          });
        }

        const msgRef = doc(collection(firestore, "chats", chatId, "messages"));
        transaction.set(msgRef, {
          messageText: textToUse,
          senderId: currentUser.uid,
          sentAt: serverTimestamp(),
          status: 'sent'
        });

        const chatMetaRef = doc(firestore, "chats", chatId);
        transaction.set(chatMetaRef, {
          lastMessage: textToUse,
          timestamp: serverTimestamp(),
          participants: [currentUser.uid, otherUserId],
          [`unreadCount_${otherUserId}`]: increment(1),
          [`userHasSent_${currentUser.uid}`]: true
        }, { merge: true });
      });

      if (!textOverride) setInputText("")
    } catch (error: any) {
      if (error.message === "INSUFFICIENT_COINS") {
        toast({ variant: "destructive", title: "Insufficient Coins", description: "Recharge to continue chatting.", action: <Button onClick={() => router.push('/recharge')} size="sm" className="bg-white text-primary">Recharge</Button> });
      } else {
        toast({ variant: "destructive", title: "Send Failed", description: "Check your connection." });
      }
    } finally { setIsSending(false) }
  }

  const handleSendPackages = () => {
    const packageMsg = `Hello! Here are our available coin packages:\n\n• 500 Coins\n- 1,000 Coins\n- 2,000 Coins\n- 5,000 Coins\n- 10,000 Coins\n- 12,500 Coins\n\nPlease let me know which one you would like to purchase!`;
    handleSendMessage(packageMsg);
  }

  const handleSendGift = async (giftOverride?: typeof GIFTS[0]) => {
    const gift = giftOverride || selectedGift;
    if (!gift || !currentUser || !otherUserId || isSendingGift || !currentUserProfile || !firestore || !otherUser) return;
    
    setIsSendingGift(true);
    const giftPrice = gift.price;
    const diamondGain = Math.floor(giftPrice * 0.6);

    try {
      await runTransaction(firestore, async (transaction) => {
        const myProfileSnap = await transaction.get(meRef!);
        const myBalance = myProfileSnap.data()?.coinBalance || 0;
        if (myBalance < giftPrice) throw new Error("INSUFFICIENT_COINS");

        transaction.update(meRef!, { coinBalance: increment(-giftPrice) });
        transaction.update(otherUserRef!, { diamondBalance: increment(diamondGain) });

        const senderLogRef = doc(collection(firestore, "userProfiles", currentUser.uid, "transactions"));
        transaction.set(senderLogRef, { id: senderLogRef.id, type: "gift_sent", amount: -giftPrice, transactionDate: new Date().toISOString(), description: `Sent ${gift.name} to ${otherUser.username}` });

        const receiverLogRef = doc(collection(firestore, "userProfiles", otherUserId, "transactions"));
        transaction.set(receiverLogRef, { id: receiverLogRef.id, type: "gift_received", amount: diamondGain, transactionDate: new Date().toISOString(), description: `Received ${gift.name} from ${currentUserProfile.username}` });

        const giftMessage = `🎁 Sent a gift: ${gift.name}`;
        const msgRef = doc(collection(firestore, "chats", chatId, "messages"));
        transaction.set(msgRef, { messageText: giftMessage, senderId: currentUser.uid, sentAt: serverTimestamp(), isGift: true, giftId: gift.id, status: 'sent' });

        const chatMetaRef = doc(firestore, "chats", chatId);
        transaction.set(chatMetaRef, {
          lastMessage: giftMessage,
          timestamp: serverTimestamp(),
          participants: [currentUser.uid, otherUserId],
          [`unreadCount_${otherUserId}`]: increment(1),
          [`userHasSent_${currentUser.uid}`]: true
        }, { merge: true });
      });

      toast({ title: "Gift Sent!", description: `You sent a ${gift.name}.` });
      setIsGiftSheetOpen(false);
      setSelectedGift(null);
    } catch (error: any) {
      if (error.message === "INSUFFICIENT_COINS") {
        toast({ variant: "destructive", title: "Insufficient Coins", description: "Please recharge to send this gift." });
      } else {
        toast({ variant: "destructive", title: "Gift Failed", description: "Could not deliver gift." });
      }
    } finally { setIsSendingGift(false) }
  }

  if (isOtherUserLoading) {
    return <div className="flex h-svh items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  if (!otherUser) {
    return (
      <div className="flex flex-col items-center justify-center h-svh bg-white p-6 text-center space-y-6">
        <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center border border-gray-100">
          <UserX className="w-12 h-12 text-gray-300" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black font-headline text-gray-900 tracking-tight">User logged out</h2>
          <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-[240px] mx-auto">This account no longer exists or has been deactivated.</p>
        </div>
        <Button onClick={() => router.back()} className="h-14 w-full max-w-[200px] rounded-full bg-primary font-black uppercase text-xs tracking-widest shadow-xl">Go Back</Button>
      </div>
    )
  }

  const otherUserImage = (otherUser.profilePhotoUrls && otherUser.profilePhotoUrls[0]) || `https://picsum.photos/seed/${otherUserId}/200/200`
  const otherUserName = otherUser.isSupport ? "Customer Support" : (otherUser.username || "User")
  const presenceText = otherUser.isOnline ? "Online" : "Offline"

  return (
    <div className="flex flex-col h-svh bg-white relative overflow-hidden text-gray-900">
      <header className="px-5 pt-8 pb-4 bg-white flex items-center justify-between sticky top-0 z-10 border-b border-gray-50">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-full bg-gray-50 text-gray-500"><ChevronLeft className="w-5 h-5" /></Button>
        <div className={cn("flex items-center gap-3 transition-opacity flex-1 justify-center", otherUser.isSupport ? "cursor-default" : "cursor-pointer active:opacity-70")} onClick={() => !otherUser.isSupport && router.push(`/profile/${otherUserId}`)}>
          <Avatar className="w-9 h-9 border border-gray-100 shadow-sm"><AvatarImage src={otherUserImage} className="object-cover" /><AvatarFallback>{otherUserName[0] || '?'}</AvatarFallback></Avatar>
          <div className="flex flex-col text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <h3 className="font-bold text-[13px] leading-none h-3.5">{otherUserName}</h3>
              {otherUser.isVerified && <CheckCircle className="w-3 h-3 text-blue-500 fill-blue-500/10" />}
            </div>
            <span className={cn("text-[9px] font-black uppercase tracking-widest", otherUser.isOnline ? "text-green-500" : "text-gray-400")}>{presenceText}</span>
          </div>
        </div>
        <div className="flex items-center">
          {currentUserProfile?.isCoinseller && (
            <Button variant="ghost" size="icon" onClick={handleSendPackages} className="h-10 w-10 rounded-full bg-amber-50 text-amber-600 border border-amber-100 shadow-sm animate-in fade-in zoom-in">
              <Zap className="w-5 h-5 fill-current" />
            </Button>
          )}
          <div className={cn(!currentUserProfile?.isCoinseller && "w-10")} />
        </div>
      </header>

      <ScrollArea className="flex-1 px-4 py-4 bg-white">
        <div className="flex flex-col gap-4">
          {hasMore && (
            <button onClick={() => setMsgLimit(prev => prev + 30)} className="py-4 flex flex-col items-center gap-1 group active:opacity-50 transition-all">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors"><ArrowUp className="w-4 h-4 text-gray-400" /></div>
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Load Earlier</span>
            </button>
          )}

          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.uid
            const isCallLog = msg.isCallLog === true
            const isGift = msg.isGift === true
            const statusText = msg.status === 'seen' ? 'Seen' : 'Sent'
            
            return (
              <div key={msg.id} className="flex w-full flex-col">
                <div className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] px-4 py-3 text-[13px] font-medium leading-relaxed shadow-sm transition-all", 
                    isMe ? "bg-primary text-white rounded-[1.5rem] rounded-tr-none" : "bg-gray-100 text-gray-900 rounded-[1.5rem] rounded-tl-none",
                    isGift && "bg-white border border-gray-100 p-0 overflow-hidden rounded-2xl shadow-md min-w-[180px] text-gray-900",
                    isCallLog && "bg-transparent shadow-none border-none py-1 px-2 font-black text-[10px] tracking-widest text-gray-300 uppercase"
                  )}>
                    {isGift ? (
                      <div className="flex flex-col">
                        <div className="p-6 flex flex-col items-center justify-center bg-gray-50/50 relative">
                          <div className="text-5xl mb-2 drop-shadow-sm">{GIFTS.find(g => g.id === msg.giftId)?.emoji || '🎁'}</div>
                          <div className="absolute bottom-4 right-4 italic font-black text-sky-500 text-2xl">x 1</div>
                        </div>
                        {isMe && (
                          <button onClick={() => { const gift = GIFTS.find(g => g.id === msg.giftId); if (gift) handleSendGift(gift); }} disabled={isSendingGift} className="w-full h-12 bg-[#00AEEF] hover:bg-[#009EDF] text-white font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                            {isSendingGift ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send one more"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.messageText}</p>
                    )}
                  </div>
                </div>
                {isMe && !isCallLog && (
                  <div className="flex justify-end pr-2 mt-1">
                    <span className="text-[8px] font-black uppercase text-gray-300 tracking-widest">{statusText}</span>
                  </div>
                )}
              </div>
            )
          })}
          <div ref={scrollRef} className="h-4" />
        </div>
      </ScrollArea>

      <footer className="px-5 py-5 pb-8 space-y-4 bg-white border-t border-gray-50">
        <div className="relative group">
          <Input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Message..." className="rounded-full h-12 bg-gray-50 border-none px-6 text-[13px]" onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
          <Button size="icon" className={cn("absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full w-9 h-9", inputText.trim() && !isSending ? "bg-primary text-white" : "bg-gray-200 text-gray-400")} onClick={() => handleSendMessage()} disabled={!inputText.trim() || isSending}>
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        {!otherUser.isSupport && (
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => handleInitiateCall('audio')} className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 h-16 rounded-2xl border border-gray-100 active:bg-gray-100 shadow-sm"><Phone className="w-4 h-4 text-gray-500" /><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Voice</span></button>
            <button onClick={() => handleInitiateCall('video')} className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 h-16 rounded-2xl border border-gray-100 active:bg-gray-100 shadow-sm"><Video className="w-4 h-4 text-gray-500" /><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Video</span></button>
            <Sheet open={isGiftSheetOpen} onOpenChange={setIsGiftSheetOpen}>
              <SheetTrigger asChild>
                <button className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 h-16 rounded-2xl border border-gray-100 active:bg-gray-100 shadow-sm">
                  <Gift className="w-4 h-4 text-primary" />
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Gift</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-[3rem] h-[75svh] p-0 border-none bg-zinc-900 text-white overflow-hidden flex flex-col">
                <SheetHeader className="px-6 pt-8 pb-4 shrink-0"><SheetTitle className="text-xs font-black uppercase tracking-widest text-zinc-400">Select a Gift</SheetTitle></SheetHeader>
                <div className="flex-1 overflow-y-auto px-4 pb-32">
                  <div className="grid grid-cols-4 gap-2">
                    {GIFTS.map((gift) => (
                      <div key={gift.id} onClick={() => setSelectedGift(gift)} className={cn("flex flex-col items-center gap-2 p-2 rounded-2xl border transition-all cursor-pointer", selectedGift?.id === gift.id ? "bg-primary/20 border-primary shadow-lg" : "bg-transparent border-transparent")}>
                        <div className="w-14 h-14 flex items-center justify-center text-4xl">{gift.emoji}</div>
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center text-[6px] font-black text-zinc-900 italic">S</div><span className="text-[10px] font-black">{gift.price}</span></div>
                          <span className="text-[8px] font-bold text-zinc-400 text-center truncate w-full">{gift.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <footer className="absolute bottom-0 left-0 right-0 p-6 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800 flex items-center justify-between z-50">
                  <div className="flex items-center gap-3"><div className="flex items-center gap-1.5 bg-zinc-800 px-3 py-2 rounded-full border border-zinc-700"><div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-[8px] font-black text-zinc-900 italic">S</div><span className="text-xs font-black">{(currentUserProfile?.coinBalance || 0).toLocaleString()}</span></div></div>
                  <Button onClick={() => handleSendGift()} disabled={!selectedGift || isSendingGift} className="h-12 px-10 rounded-full bg-primary text-white font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">
                    {isSendingGift ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                  </Button>
                </footer>
              </SheetContent>
            </Sheet>
          </div>
        )}
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
