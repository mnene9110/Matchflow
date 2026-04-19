"use client"

import { useState, useEffect, useRef, useMemo, Suspense } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { 
  ChevronLeft, 
  Send, 
  Loader2, 
  CheckCircle, 
  ArrowUp, 
  Gift, 
  Phone, 
  Video,
  ShieldAlert
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { 
  collection, 
  doc, 
  updateDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  increment, 
  runTransaction,
  setDoc,
  where,
  getDocs,
  getDoc
} from "firebase/firestore"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

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
  const initialMsg = searchParams?.get('msg')
  
  const { user: currentUser } = useUser()
  const { firestore } = useFirebase()
  const router = useRouter()
  const { toast } = useToast()
  
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const [inputText, setInputText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  
  // Blocking State
  const [isBlockedByOther, setIsBlockedByOther] = useState(false)
  const [haveIBlockedOther, setHaveIBlockedOther] = useState(false)
  const [isCheckingBlock, setIsCheckingBlock] = useState(true)
  
  const [msgLimit, setMsgLimit] = useState(30)
  const [hasMore, setHasMore] = useState(true)

  const [isGiftSheetOpen, setIsGiftSheetOpen] = useState(false)
  const [selectedGift, setSelectedGift] = useState<typeof GIFTS[0] | null>(null)
  const [isSendingGift, setIsSendingGift] = useState(false)

  const [resolvedOtherUserId, setResolvedOtherUserId] = useState<string | null>(null)
  const [isResolvingId, setIsResolvingId] = useState(false)

  useEffect(() => {
    if (otherUserId === 'customer_support' || otherUserId === 'support_agent') {
      setIsResolvingId(true)
      const q = query(collection(firestore, "userProfiles"), where("isSupport", "==", true), limit(1));
      getDocs(q).then(snap => {
        if (!snap.empty) {
          setResolvedOtherUserId(snap.docs[0].id)
        } else {
          setResolvedOtherUserId(otherUserId)
        }
      }).finally(() => setIsResolvingId(false))
    } else {
      setResolvedOtherUserId(otherUserId)
    }
  }, [otherUserId, firestore])

  // Check block status (both directions)
  useEffect(() => {
    if (!firestore || !currentUser || !resolvedOtherUserId) return
    
    // Check if other user blocked me
    const blockedMeRef = doc(firestore, "userProfiles", resolvedOtherUserId, "blockedUsers", currentUser.uid)
    const unsubMe = onSnapshot(blockedMeRef, (snap) => {
      setIsBlockedByOther(snap.exists())
      setIsCheckingBlock(false)
    })

    // Check if I blocked other user
    const iBlockedRef = doc(firestore, "userProfiles", currentUser.uid, "blockedUsers", resolvedOtherUserId)
    const unsubThem = onSnapshot(iBlockedRef, (snap) => {
      setHaveIBlockedOther(snap.exists())
    })

    return () => {
      unsubMe();
      unsubThem();
    }
  }, [firestore, currentUser, resolvedOtherUserId])

  const chatId = useMemo(() => {
    if (!currentUser || !resolvedOtherUserId) return ""
    return [currentUser.uid, resolvedOtherUserId].sort().join("_")
  }, [currentUser?.uid, resolvedOtherUserId])

  const otherUserRef = useMemoFirebase(() => resolvedOtherUserId ? doc(firestore, "userProfiles", resolvedOtherUserId) : null, [firestore, resolvedOtherUserId])
  const { data: otherUser, isLoading: isOtherUserLoading } = useDoc(otherUserRef)

  const meRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser?.uid])
  const { data: currentUserProfile } = useDoc(meRef)

  useEffect(() => {
    if (!firestore || !chatId || (isBlockedByOther || haveIBlockedOther)) return
    const msgQuery = query(
      collection(firestore, "chats", chatId, "messages"),
      orderBy("sentAt", "desc"),
      limit(msgLimit)
    )

    const unsubscribe = onSnapshot(msgQuery, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      list.sort((a: any, b: any) => (a.sentAt?.seconds || 0) - (b.sentAt?.seconds || 0))
      setMessages(list)
      setHasMore(snapshot.docs.length >= msgLimit)
    }, async (error) => {
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `chats/${chatId}/messages`,
          operation: 'list'
        }));
      }
    })

    return () => unsubscribe()
  }, [firestore, chatId, msgLimit, isBlockedByOther, haveIBlockedOther])

  useEffect(() => {
    if (initialMsg && currentUser && resolvedOtherUserId && otherUser && !isSending && !isBlockedByOther && !haveIBlockedOther) {
      const timer = setTimeout(() => {
        handleSendMessage(initialMsg);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [initialMsg, !!currentUser, resolvedOtherUserId, !!otherUser, isBlockedByOther, haveIBlockedOther]);

  useEffect(() => {
    if (!firestore || !currentUser || !chatId || (isBlockedByOther || haveIBlockedOther)) return
    const chatRef = doc(firestore, "chats", chatId)
    updateDoc(chatRef, { [`unreadCount_${currentUser.uid}`]: 0 }).catch(() => {})
  }, [firestore, currentUser, chatId, messages.length, isBlockedByOther, haveIBlockedOther])

  useEffect(() => { 
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } 
  }, [messages])

  const handleSendMessage = async (textOverride?: string) => {
    const textToUse = textOverride || inputText;
    if (!textToUse.trim() || !currentUser || !chatId || !firestore || !resolvedOtherUserId || !otherUser || isSending || !currentUserProfile || isBlockedByOther || haveIBlockedOther) return
    
    const isFree = currentUserProfile.isAdmin || 
                   currentUserProfile.isSupport || 
                   currentUserProfile.isCoinseller || 
                   otherUser.isAdmin ||
                   otherUser.isSupport || 
                   otherUser.isCoinseller || 
                   currentUserProfile.gender?.toLowerCase() === 'female';

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
          participants: [currentUser.uid, resolvedOtherUserId],
          [`unreadCount_${resolvedOtherUserId}`]: increment(1),
          [`userHasSent_${currentUser.uid}`]: true,
          [`hidden_${currentUser.uid}`]: false,
          [`hidden_${resolvedOtherUserId}`]: false
        }, { merge: true });
      });

      if (!textOverride) setInputText("")
    } catch (error: any) {
      if (error.message === "INSUFFICIENT_COINS") {
        toast({ variant: "destructive", title: "Insufficient Coins", description: "Recharge to continue chatting.", action: <Button onClick={() => router.push('/recharge')} size="sm" className="bg-white text-primary">Recharge</Button> });
      } else {
        toast({ variant: "destructive", title: "Send Failed" });
      }
    } finally { setIsSending(false) }
  }

  const handleSendGift = async (giftOverride?: typeof GIFTS[0]) => {
    const gift = giftOverride || selectedGift;
    if (!gift || !currentUser || !resolvedOtherUserId || isSendingGift || !currentUserProfile || !firestore || !otherUser || isBlockedByOther || haveIBlockedOther) return;
    
    setIsSendingGift(true);
    const finalPrice = gift.price;
    const diamondGain = Math.floor(gift.price * 0.6);

    try {
      await runTransaction(firestore, async (transaction) => {
        const myProfileSnap = await transaction.get(meRef!);
        const myBalance = myProfileSnap.data()?.coinBalance || 0;
        if (myBalance < finalPrice) throw new Error("INSUFFICIENT_COINS");

        transaction.update(meRef!, { coinBalance: increment(-finalPrice) });
        transaction.update(otherUserRef!, { diamondBalance: increment(diamondGain) });

        const senderLogRef = doc(collection(firestore, "userProfiles", currentUser.uid, "transactions"));
        transaction.set(senderLogRef, { id: senderLogRef.id, type: "gift_sent", amount: -finalPrice, transactionDate: new Date().toISOString(), description: `Sent ${gift.name}` });

        const receiverLogRef = doc(collection(firestore, "userProfiles", resolvedOtherUserId, "transactions"));
        transaction.set(receiverLogRef, { id: receiverLogRef.id, type: "gift_received", amount: diamondGain, transactionDate: new Date().toISOString(), description: `Received ${gift.name} from ${currentUserProfile.username}` });

        const giftMessage = `🎁 Sent a ${gift.name}`;
        const msgRef = doc(collection(firestore, "chats", chatId, "messages"));
        transaction.set(msgRef, { messageText: giftMessage, senderId: currentUser.uid, sentAt: serverTimestamp(), isGift: true, giftId: gift.id, status: 'sent' });

        const chatMetaRef = doc(firestore, "chats", chatId);
        transaction.set(chatMetaRef, {
          lastMessage: giftMessage,
          timestamp: serverTimestamp(),
          participants: [currentUser.uid, resolvedOtherUserId],
          [`unreadCount_${resolvedOtherUserId}`]: increment(1),
          [`userHasSent_${currentUser.uid}`]: true,
          [`hidden_${currentUser.uid}`]: false,
          [`hidden_${resolvedOtherUserId}`]: false
        }, { merge: true });
      });

      toast({ title: "Gift Sent!", description: `Sent for ${finalPrice} coins.` });
      setIsGiftSheetOpen(false);
      setSelectedGift(null);
    } catch (error: any) {
      if (error.message === "INSUFFICIENT_COINS") {
        toast({ variant: "destructive", title: "Insufficient Coins" });
      } else {
        toast({ variant: "destructive", title: "Gift Failed" });
      }
    } finally { setIsSendingGift(false) }
  }

  const handleInitiateCall = async (type: 'audio' | 'video') => {
    if (!currentUser || !resolvedOtherUserId || !firestore || !currentUserProfile || isBlockedByOther || haveIBlockedOther) return;
    
    const cost = type === 'video' ? 160 : 80;
    const isFree = currentUserProfile.isAdmin === true;

    if (!isFree && (currentUserProfile.coinBalance || 0) < cost) {
      toast({ variant: "destructive", title: "Insufficient Coins", description: `You need at least ${cost} coins to start a ${type} call.` });
      return;
    }

    try {
      const callData = {
        callerId: currentUser.uid,
        callerName: currentUserProfile.username,
        receiverId: resolvedOtherUserId,
        status: 'ringing',
        callType: type,
        timestamp: Date.now(),
        costPerMin: cost,
        isFree: isFree
      };

      await setDoc(doc(firestore, "calls", chatId), callData);
      await updateDoc(doc(firestore, "userProfiles", resolvedOtherUserId), { incomingCallId: chatId });
      await updateDoc(doc(firestore, "userProfiles", currentUser.uid), { incomingCallId: chatId });
      
    } catch (e) {
      toast({ variant: "destructive", title: "Call Failed" });
    }
  }

  if (isOtherUserLoading || isResolvingId || isCheckingBlock) {
    return <div className="flex h-svh items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  const otherUserImage = (otherUser?.profilePhotoUrls && otherUser.profilePhotoUrls[0]) || `https://picsum.photos/seed/${resolvedOtherUserId}/200/200`
  const otherUserName = otherUser?.isSupport ? "Customer Support" : (otherUser?.username || "User")
  
  const isRestricted = isBlockedByOther || haveIBlockedOther;

  return (
    <div className="flex flex-col h-svh bg-white relative overflow-hidden text-gray-900">
      <header className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 bg-[#3BC1A8] flex items-center justify-between sticky top-0 z-10 shadow-lg text-white">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-md text-white"><ChevronLeft className="w-5 h-5" /></Button>
        <div className="flex items-center gap-2.5 transition-opacity flex-1 justify-center cursor-pointer active:opacity-70 px-2 min-w-0" onClick={() => router.push(`/profile/${resolvedOtherUserId}`)}>
          <Avatar className="w-8 h-8 border border-white/20 shadow-sm shrink-0">
            <AvatarImage src={otherUserImage} className="object-cover" />
            <AvatarFallback>{otherUserName[0] || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col truncate">
            <div className="flex items-center gap-1">
              <h3 className="font-black text-[12px] leading-tight truncate">{otherUserName}</h3>
              {otherUser?.isVerified && (
                <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                  <CheckCircle className="w-2.5 h-2.5 text-white fill-current" />
                </div>
              )}
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-white/40">{otherUser?.isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>

        {!otherUser?.isSupport && !isRestricted ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleInitiateCall('audio')} className="h-9 w-9 rounded-full bg-white/20 text-white active:scale-90 transition-transform"><Phone className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => handleInitiateCall('video')} className="h-9 w-9 rounded-full bg-white/20 text-white active:scale-90 transition-transform"><Video className="w-4 h-4" /></Button>
          </div>
        ) : <div className="w-9" />}
      </header>

      <ScrollArea className="flex-1 px-4 py-4 bg-white">
        <div className="flex flex-col gap-4">
          {hasMore && !isRestricted && (
            <button onClick={() => setMsgLimit(prev => prev + 30)} className="py-4 flex flex-col items-center gap-1 group active:opacity-50 transition-all">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"><ArrowUp className="w-4 h-4 text-gray-400" /></div>
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Load Earlier</span>
            </button>
          )}

          {isRestricted ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 rounded-[2.5rem] flex items-center justify-center border-4 border-red-100">
                <ShieldAlert className="w-10 h-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black font-headline text-gray-900">Communication Restricted</h3>
                <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-[200px] mx-auto">
                  {haveIBlockedOther ? "You have blocked this user. Unblock them to continue chatting." : "This user has restricted communication with you."}
                </p>
              </div>
              {haveIBlockedOther && (
                <Button onClick={() => router.push('/settings/blocked')} className="h-10 px-6 rounded-full bg-zinc-900 text-white font-black text-[10px] uppercase tracking-widest">Manage Blocked List</Button>
              )}
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUser?.uid
              const isGift = msg.isGift === true
              
              return (
                <div key={msg.id} className="flex w-full flex-col">
                  <div className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[80%] px-4 py-3 text-[13px] font-medium leading-relaxed shadow-sm transition-all", 
                      isMe ? "bg-primary text-white rounded-[1.5rem] rounded-tr-none" : "bg-gray-100 text-gray-900 rounded-[1.5rem] rounded-tl-none",
                      isGift && "bg-white border border-gray-100 p-0 overflow-hidden rounded-2xl shadow-md min-w-[180px] text-gray-900"
                    )}>
                      {isGift ? (
                        <div className="flex flex-col">
                          <div className="p-6 flex flex-col items-center justify-center bg-gray-50/50 relative">
                            <div className="flex flex-col items-center gap-3">
                              <div className="text-xs font-black uppercase text-gray-400 tracking-widest text-center mb-1">
                                {msg.messageText}
                              </div>
                              <div className="drop-shadow-sm">
                                {(() => {
                                  const gift = GIFTS.find(g => g.id === msg.giftId);
                                  if (gift?.image) return <img src={gift.image} alt={gift.name} className="w-20 h-20 object-contain" />;
                                  return <span className="text-5xl">{gift?.emoji || '🎁'}</span>;
                                })()}
                              </div>
                            </div>
                            <div className="absolute bottom-3 right-4 italic font-black text-primary text-xl">x1</div>
                          </div>
                          {isMe && (
                            <button onClick={() => { const gift = GIFTS.find(g => g.id === msg.giftId); if (gift) handleSendGift(gift); }} disabled={isSendingGift} className="w-full h-11 bg-primary/10 text-primary font-black text-[10px] uppercase tracking-widest border-t border-primary/5">
                              Send another
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.messageText}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={scrollRef} className="h-4" />
        </div>
      </ScrollArea>

      {!isRestricted && (
        <footer className="px-5 py-5 pb-8 bg-white border-t border-gray-50 flex items-center gap-3">
          {!otherUser?.isSupport && (
            <Sheet open={isGiftSheetOpen} onOpenChange={setIsGiftSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-gray-50 text-amber-500 border border-gray-100 shrink-0 shadow-sm active:scale-90 transition-transform">
                  <Gift className="w-6 h-6 fill-current" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-[3rem] h-[75svh] p-0 border-none bg-zinc-900 text-white overflow-hidden flex flex-col">
                <SheetHeader className="px-6 pt-8 pb-4 shrink-0"><SheetTitle className="text-xs font-black uppercase tracking-widest text-zinc-400">Select a Gift</SheetTitle></SheetHeader>
                <div className="flex-1 overflow-y-auto px-4 pb-32">
                  <div className="grid grid-cols-4 gap-2">
                    {GIFTS.map((gift) => {
                      return (
                        <div key={gift.id} onClick={() => setSelectedGift(gift)} className={cn("flex flex-col items-center gap-2 p-2 rounded-2xl border transition-all cursor-pointer", selectedGift?.id === gift.id ? "bg-primary/20 border-primary" : "bg-transparent border-transparent")}>
                          <div className="text-4xl flex items-center justify-center h-12">
                            {gift.image ? (
                              <img src={gift.image} alt={gift.name} className="w-10 h-10 object-contain" />
                            ) : (
                              gift.emoji
                            )}
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-black text-amber-400">{gift.price}</span>
                            </div>
                            <span className="text-[8px] font-bold text-zinc-400 truncate w-full text-center">{gift.name}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <footer className="absolute bottom-0 left-0 right-0 p-6 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800 flex items-center justify-between z-50">
                  <div className="flex items-center gap-1.5 bg-zinc-800 px-3 py-2 rounded-full border border-zinc-700">
                    <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-[8px] font-black text-zinc-900 italic">S</div>
                    <span className="text-xs font-black">{(currentUserProfile?.coinBalance || 0).toLocaleString()}</span>
                  </div>
                  <Button onClick={() => handleSendGift()} disabled={!selectedGift || isSendingGift} className="h-12 px-10 rounded-full bg-primary text-white font-black uppercase text-xs tracking-widest shadow-xl">
                    {isSendingGift ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                  </Button>
                </footer>
              </SheetContent>
            </Sheet>
          )}
          <div className="relative flex-1 group">
            <Input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Message..." className="rounded-full h-12 bg-gray-50 border-none px-6 text-[13px] pr-12" onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
            <Button size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full w-9 h-9" onClick={() => handleSendMessage()} disabled={!inputText.trim() || isSending}>
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </footer>
      )}
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
