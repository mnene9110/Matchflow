
"use client"

import { useState, useEffect, useRef, useMemo, Suspense } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Video, Send, Phone, Loader2, Gift, Ban, CheckCircle, UserX, Gamepad2, Trophy, Dice5 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, collection, setDoc, updateDoc as updateFirestoreDoc, increment as firestoreIncrement } from "firebase/firestore"
import { ref, push, onValue, serverTimestamp as rtdbTimestamp, update, set, increment, runTransaction as runRtdbTransaction, remove } from "firebase/database"
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

export const GAME_BETS = [20, 50, 100, 200, 500]

function ChatDetailContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const otherUserId = params?.id as string
  const initialMsg = searchParams?.get('msg')
  
  const { user: currentUser } = useUser()
  const { firestore, database } = useFirebase()
  const router = useRouter()
  const { toast } = useToast()
  
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const [mounted, setMounted] = useState(false)
  const [inputText, setInputText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [presence, setPresence] = useState<{ online: boolean; lastSeen?: number }>({ online: false })
  const [userCoins, setUserCoins] = useState(0)
  
  const [isGiftSheetOpen, setIsGiftSheetOpen] = useState(false)
  const [selectedGift, setSelectedGift] = useState<typeof GIFTS[0] | null>(null)
  const [isSendingGift, setIsSendingGift] = useState(false)

  // Game States
  const [activeGame, setActiveGame] = useState<any>(null)
  const [isSpinning, setIsGameSpinning] = useState(false)
  const [gameResult, setGameResult] = useState<any>(null)

  const chatId = currentUser && otherUserId ? [currentUser.uid, otherUserId].sort().join("_") : ""
  
  const otherUserRef = useMemoFirebase(() => otherUserId ? doc(firestore, "userProfiles", otherUserId) : null, [firestore, otherUserId])
  const { data: otherUser, isLoading: isOtherUserLoading } = useDoc(otherUserRef)

  const currentUserProfileRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: currentUserProfile } = useDoc(currentUserProfileRef)

  const myBlockRef = useMemoFirebase(() => currentUser && otherUserId ? doc(firestore, "userProfiles", currentUser.uid, "blockedUsers", otherUserId) : null, [firestore, currentUser, otherUserId])
  const { data: iBlockedThem } = useDoc(myBlockRef)

  const theirBlockRef = useMemoFirebase(() => currentUser && otherUserId ? doc(firestore, "userProfiles", otherUserId, "blockedUsers", currentUser.uid) : null, [firestore, currentUser, otherUserId])
  const { data: theyBlockedMe } = useDoc(theirBlockRef)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, []);

  useEffect(() => {
    if (!database || !currentUser) return
    const coinRef = ref(database, `users/${currentUser.uid}/coinBalance`)
    return onValue(coinRef, (snap) => setUserCoins(snap.val() || 0))
  }, [database, currentUser])

  // Game Duel Listener (Message-based duels)
  useEffect(() => {
    if (!database || !chatId) return
    const gameRef = ref(database, `chats/${chatId}/activeDuel`)
    return onValue(gameRef, (snap) => {
      const data = snap.val()
      setActiveGame(data)
      if (data?.status === 'spinning') {
        setIsGameSpinning(true)
        setGameResult(null)
      } else if (data?.status === 'finished') {
        setIsGameSpinning(false)
        setGameResult(data)
        setTimeout(() => {
          if (data.status === 'finished') setGameResult(null)
        }, 5000)
      } else {
        setIsGameSpinning(false)
      }
    })
  }, [database, chatId])

  useEffect(() => {
    if (initialMsg && currentUser && otherUserId && database && otherUser && !isSending) {
      const timer = setTimeout(() => {
        handleSendMessage(initialMsg);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [initialMsg, currentUser, otherUserId, database, !!otherUser]);

  useEffect(() => {
    if (!database || !currentUser || !otherUserId) return
    const unreadRef = ref(database, `users/${currentUser.uid}/chats/${otherUserId}/unreadCount`)
    set(unreadRef, 0)
  }, [database, currentUser, otherUserId])

  useEffect(() => {
    if (!database || !chatId || !currentUser || !messages.length) return
    
    const unreadMsgs = messages.filter(m => m.senderId !== currentUser.uid && m.status === 'sent')
    if (unreadMsgs.length > 0) {
      const updates: any = {}
      unreadMsgs.forEach(m => {
        updates[`/chats/${chatId}/messages/${m.id}/status`] = 'seen'
      })
      update(ref(database), updates)
    }
  }, [database, chatId, currentUser, messages])

  const presenceText = useMemo(() => {
    if (presence.online) return "Online";
    if (!presence.lastSeen) return "Offline";
    const date = new Date(presence.lastSeen);
    const now = new Date();
    const diffInDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (diffInDays > 2) return "Offline";
    return `Last seen ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [presence]);

  const handleInitiateCall = async (type: 'video' | 'audio') => {
    if (!database || !chatId || !currentUser || !currentUserProfile || !otherUser) return

    const costPerMin = type === 'video' ? 160 : 80;
    const isFree = currentUserProfile.isAdmin || 
                   currentUserProfile.isSupport || 
                   currentUserProfile.isCoinseller ||
                   otherUser.isSupport ||
                   otherUser.isCoinseller ||
                   (currentUserProfile.gender === 'female' && otherUser?.gender === 'male');

    if (!isFree && userCoins < costPerMin) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: `You need at least ${costPerMin} coins to start this call.`,
        duration: 3000,
        action: <Button onClick={() => router.push('/recharge')} size="sm" className="bg-white text-primary">Recharge</Button>
      });
      return;
    }

    try {
      const callRef = ref(database, `calls/${chatId}`);
      await set(callRef, { 
        callerId: currentUser.uid, 
        receiverId: otherUserId, 
        status: 'ringing', 
        callType: type, 
        timestamp: Date.now(),
        callerName: currentUserProfile.username || 'Someone',
        costPerMin: costPerMin,
        isFree: isFree
      });

      await set(ref(database, `users/${otherUserId}/incomingCallId`), chatId);
      await set(ref(database, `users/${currentUser.uid}/incomingCallId`), chatId);

    } catch (error: any) {
      toast({ variant: "destructive", title: "Call Failed", description: "Could not establish connection." });
    }
  }

  useEffect(() => {
    if (!database || !otherUserId) return
    return onValue(ref(database, `users/${otherUserId}/presence`), (snap) => setPresence(snap.val() || { online: false }))
  }, [database, otherUserId])

  useEffect(() => {
    if (!database || !chatId) return
    return onValue(ref(database, `chats/${chatId}/messages`), (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const msgList = Object.entries(data).map(([key, val]: [string, any]) => ({ id: key, ...val }))
        msgList.sort((a, b) => (a.sentAt || 0) - (b.sentAt || 0))
        setMessages(msgList)
      } else { setMessages([]) }
    })
  }, [database, chatId])

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSendMessage = async (textOverride?: string) => {
    const textToUse = textOverride || inputText;
    if (!textToUse.trim() || !currentUser || !chatId || !database || !otherUserId || !otherUser || isSending) return
    
    if (!currentUserProfile) {
      toast({ variant: "destructive", title: "Loading profile", description: "Please wait..." });
      return;
    }

    const isFree = currentUserProfile.isAdmin || 
                   currentUserProfile.isSupport || 
                   currentUserProfile.isCoinseller || 
                   otherUser.isSupport || 
                   otherUser.isCoinseller ||
                   currentUserProfile.gender?.toLowerCase() === 'female';

    const messageCost = isFree ? 0 : 15;
    
    setIsSending(true)
    try {
      if (messageCost > 0) {
        const userCoinRef = ref(database, `users/${currentUser.uid}/coinBalance`);
        const result = await runRtdbTransaction(userCoinRef, (current) => {
          if (current === null) return current; 
          if (current < messageCost) return undefined;
          return current - messageCost;
        });

        if (!result.committed) throw new Error("INSUFFICIENT_COINS");

        updateFirestoreDoc(doc(firestore, "userProfiles", currentUser.uid), {
          coinBalance: firestoreIncrement(-messageCost),
          updatedAt: new Date().toISOString()
        });

        const txRef = doc(collection(firestore, "userProfiles", currentUser.uid, "transactions"));
        setDoc(txRef, {
          id: txRef.id,
          type: "deduction",
          amount: -messageCost,
          transactionDate: new Date().toISOString(),
          description: `Message sent to ${otherUser?.username || 'user'}`
        });
      }

      const updates: any = {}
      const msgKey = push(ref(database, `chats/${chatId}/messages`)).key
      const msgData = { 
        messageText: textToUse, 
        senderId: currentUser.uid, 
        sentAt: rtdbTimestamp(),
        status: 'sent'
      }
      updates[`/chats/${chatId}/messages/${msgKey}`] = msgData
      updates[`/users/${currentUser.uid}/chats/${otherUserId}`] = { lastMessage: textToUse, timestamp: rtdbTimestamp(), otherUserId, chatId, unreadCount: 0, hidden: false }
      updates[`/users/${otherUserId}/chats/${currentUser.uid}/lastMessage`] = textToUse
      updates[`/users/${otherUserId}/chats/${currentUser.uid}/timestamp`] = rtdbTimestamp()
      updates[`/users/${otherUserId}/chats/${currentUser.uid}/otherUserId`] = currentUser.uid
      updates[`/users/${otherUserId}/chats/${currentUser.uid}/chatId`] = chatId
      updates[`/users/${otherUserId}/chats/${currentUser.uid}/unreadCount`] = increment(1)
      updates[`/users/${otherUserId}/chats/${currentUser.uid}/hidden`] = false
      await update(ref(database), updates)
      if (!textOverride) setInputText("")
    } catch (error: any) {
      if (error.message === "INSUFFICIENT_COINS") {
        toast({
          variant: "destructive",
          title: "Insufficient Coins",
          description: "Recharge to continue chatting.",
          duration: 3000,
          action: <Button onClick={() => router.push('/recharge')} size="sm" className="bg-white text-primary">Recharge</Button>
        });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Could not send message." });
      }
    } finally { setIsSending(false) }
  }

  const handleAcceptDuel = async (betAmount: number, duelId: string) => {
    if (!currentUser || !otherUserId || !database || isSending) return;
    if (userCoins < betAmount) {
      toast({ variant: "destructive", title: "Insufficient Coins", description: `You need ${betAmount} coins to join this duel.` });
      return;
    }

    setIsSending(true);
    try {
      const userRef = ref(database, `users/${currentUser.uid}/coinBalance`);
      const otherUserBalanceRef = ref(database, `users/${otherUserId}/coinBalance`);

      const myDeduction = await runRtdbTransaction(userRef, (curr) => {
        if (curr === null) return curr;
        if (curr < betAmount) return undefined;
        return curr - betAmount;
      });

      if (!myDeduction.committed) throw new Error("INSUFFICIENT_COINS");

      const otherDeduction = await runRtdbTransaction(otherUserBalanceRef, (curr) => {
        if (curr === null) return curr;
        if (curr < betAmount) return undefined;
        return curr - betAmount;
      });

      if (!otherDeduction.committed) {
        await runRtdbTransaction(userRef, (curr) => (curr || 0) + betAmount);
        throw new Error("CHALLENGER_FUNDS_EXPIRED");
      }

      [currentUser.uid, otherUserId].forEach(uid => {
        const pRef = doc(firestore, "userProfiles", uid);
        updateFirestoreDoc(pRef, { coinBalance: firestoreIncrement(-betAmount), updatedAt: new Date().toISOString() });
        const txRef = doc(collection(pRef, "transactions"));
        setDoc(txRef, {
          id: txRef.id,
          type: "game_bet",
          amount: -betAmount,
          transactionDate: new Date().toISOString(),
          description: `Bet ${betAmount} coins in 1v1 Spin Duel`
        });
      });

      const duelRef = ref(database, `chats/${chatId}/activeDuel`);
      await set(duelRef, {
        status: 'spinning',
        bet: betAmount,
        players: [currentUser.uid, otherUserId],
        startTime: Date.now()
      });

      setTimeout(async () => {
        const winnerId = Math.random() > 0.5 ? currentUser.uid : otherUserId;
        const totalPot = betAmount * 2;

        const winnerCoinRef = ref(database, `users/${winnerId}/coinBalance`);
        await runRtdbTransaction(winnerCoinRef, (curr) => (curr || 0) + totalPot);

        const winnerProfileRef = doc(firestore, "userProfiles", winnerId);
        updateFirestoreDoc(winnerProfileRef, { coinBalance: firestoreIncrement(totalPot), updatedAt: new Date().toISOString() });
        
        const winnerTxRef = doc(collection(winnerProfileRef, "transactions"));
        setDoc(winnerTxRef, {
          id: winnerTxRef.id,
          type: "game_win",
          amount: totalPot,
          transactionDate: new Date().toISOString(),
          description: `Won ${totalPot} coins in 1v1 Duel Spin!`
        });

        await update(duelRef, {
          status: 'finished',
          winner: winnerId,
          pot: totalPot
        });

        setTimeout(() => remove(duelRef), 6000);
      }, 3000);

    } catch (error: any) {
      toast({ variant: "destructive", title: "Duel Failed", description: error.message === "CHALLENGER_FUNDS_EXPIRED" ? "Challenger no longer has sufficient coins." : "An error occurred." });
    } finally {
      setIsSending(false);
    }
  }

  const handleSendGift = async (giftOverride?: typeof GIFTS[0]) => {
    const gift = giftOverride || selectedGift;
    if (!gift || !currentUser || !otherUserId || isSendingGift || !currentUserProfile || !database) return;
    
    setIsSendingGift(true);
    const giftPrice = gift.price;
    const diamondGain = Math.floor(giftPrice * 0.6);

    try {
      const senderCoinRef = ref(database, `users/${currentUser.uid}/coinBalance`);
      const result = await runRtdbTransaction(senderCoinRef, (current) => {
        if (current === null) return current;
        if (current < giftPrice) return undefined;
        return current - giftPrice;
      });

      if (!result.committed) throw new Error("INSUFFICIENT_COINS");

      const receiverDiamondRef = ref(database, `users/${otherUserId}/diamondBalance`);
      await runRtdbTransaction(receiverDiamondRef, (current) => (current || 0) + diamondGain);

      updateFirestoreDoc(doc(firestore, "userProfiles", currentUser.uid), {
        coinBalance: firestoreIncrement(-giftPrice),
        updatedAt: new Date().toISOString()
      });
      updateFirestoreDoc(doc(firestore, "userProfiles", otherUserId), {
        diamondBalance: firestoreIncrement(diamondGain),
        updatedAt: new Date().toISOString()
      });

      const targetTxRef = doc(collection(firestore, "userProfiles", otherUserId, "transactions"));
      setDoc(targetTxRef, {
        id: targetTxRef.id,
        type: "diamond_received",
        diamondAmount: diamondGain,
        transactionDate: new Date().toISOString(),
        description: `Received a ${gift.name} from ${currentUserProfile.username || 'user'}`
      });

      const giftMessage = `🎁 Sent a gift: ${gift.name}`;
      const updates: any = {}
      const msgKey = push(ref(database, `chats/${chatId}/messages`)).key
      const msgData = { 
        messageText: giftMessage, 
        senderId: currentUser.uid, 
        sentAt: rtdbTimestamp(), 
        isGift: true,
        giftId: gift.id,
        status: 'sent'
      }
      updates[`/chats/${chatId}/messages/${msgKey}`] = msgData
      updates[`/users/${currentUser.uid}/chats/${otherUserId}/lastMessage`] = giftMessage
      updates[`/users/${currentUser.uid}/chats/${otherUserId}/timestamp`] = rtdbTimestamp()
      updates[`/users/${otherUserId}/chats/${currentUser.uid}/unreadCount`] = increment(1)
      await update(ref(database), updates)

      toast({ title: "Gift Sent!", description: `You sent a ${gift.name}.` });
      setIsGiftSheetOpen(false);
      setSelectedGift(null);
    } catch (error: any) {
      if (error.message === "INSUFFICIENT_COINS") {
        toast({ variant: "destructive", title: "Insufficient Coins", description: "Please recharge to send this gift." });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Could not send gift." });
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
          <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-[240px] mx-auto">
            This account no longer exists or has been deactivated.
          </p>
        </div>
        <Button onClick={() => router.back()} className="h-14 w-full max-w-[200px] rounded-full bg-primary font-black uppercase text-xs tracking-widest shadow-xl">
          Go Back
        </Button>
      </div>
    )
  }

  const isOtherUserSupport = otherUser?.isSupport === true
  const isBlocked = !isOtherUserSupport && (!!iBlockedThem || !!theyBlockedMe)
  const otherUserImage = (otherUser?.profilePhotoUrls && otherUser.profilePhotoUrls[0]) || `https://picsum.photos/seed/${otherUserId}/200/200`
  const otherUserName = isOtherUserSupport ? "Customer Support" : (otherUser?.username || "User")
  const isOtherUserVerified = !!otherUser?.isVerified

  return (
    <div className="flex flex-col h-svh bg-white relative overflow-hidden text-gray-900">
      <header className="px-5 pt-8 pb-4 bg-white flex items-center justify-between sticky top-0 z-10 border-b border-gray-50">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-full bg-gray-50 text-gray-500"><ChevronLeft className="w-5 h-5" /></Button>
        <div 
          className={cn("flex items-center gap-3 transition-opacity flex-1 justify-center mr-10", isOtherUserSupport ? "cursor-default" : "cursor-pointer active:opacity-70")} 
          onClick={() => !isOtherUserSupport && router.push(`/profile/${otherUserId}`)}
        >
          <Avatar className="w-9 h-9 border border-gray-100 shadow-sm"><AvatarImage src={otherUserImage} className="object-cover" /><AvatarFallback>{otherUserName[0] || '?'}</AvatarFallback></Avatar>
          <div className="flex flex-col text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <h3 className={cn("font-bold text-[13px] leading-none h-3.5", otherUserName === "User logged out" ? "text-gray-400 font-medium italic" : "text-gray-900")}>
                {otherUserName}
              </h3>
              {isOtherUserVerified && <CheckCircle className="w-3 h-3 text-blue-500 fill-blue-500/10" />}
            </div>
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest", 
              presence.online ? "text-green-500" : "text-gray-400"
            )}>
              {presenceText}
            </span>
          </div>
        </div>
        <div className="w-10" />
      </header>

      <ScrollArea className="flex-1 px-4 py-4 bg-white">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.uid
            const isCallLog = msg.isCallLog === true
            const isGift = msg.isGift === true
            const isGameChallenge = msg.isGameChallenge === true
            const statusText = msg.status === 'seen' ? 'Seen' : 'Sent'
            
            return (
              <div key={msg.id} className="flex w-full flex-col">
                <div className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] px-4 py-3 text-[13px] font-medium leading-relaxed shadow-sm transition-all", 
                    isMe ? "bg-primary text-white rounded-[1.5rem] rounded-tr-none" : "bg-gray-100 text-gray-900 rounded-[1.5rem] rounded-tl-none",
                    (isGift || isGameChallenge) && "bg-white border border-gray-100 p-0 overflow-hidden rounded-2xl shadow-md min-w-[180px] text-gray-900",
                    isCallLog && "bg-transparent shadow-none border-none py-1 px-2 font-black text-[10px] tracking-widest text-gray-300 uppercase"
                  )}>
                    {isGift ? (
                      <div className="flex flex-col">
                        <div className="p-6 flex flex-col items-center justify-center bg-gray-50/50 relative">
                          <div className="text-5xl mb-2 drop-shadow-sm">{GIFTS.find(g => g.id === msg.giftId)?.emoji || '🎁'}</div>
                          <div className="absolute bottom-4 right-4 italic font-black text-sky-500 text-2xl">x 1</div>
                        </div>
                        {isMe && (
                          <button 
                            onClick={() => {
                              const gift = GIFTS.find(g => g.id === msg.giftId);
                              if (gift) handleSendGift(gift);
                            }}
                            disabled={isSendingGift}
                            className="w-full h-12 bg-[#00AEEF] hover:bg-[#009EDF] text-white font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isSendingGift ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send one more"}
                          </button>
                        )}
                      </div>
                    ) : isGameChallenge ? (
                      <div className="flex flex-col">
                        <div className="p-6 flex flex-col items-center justify-center bg-zinc-900 text-white relative">
                          <Dice5 className="w-12 h-12 text-primary mb-2 animate-bounce" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Spin Duel</span>
                          <span className="text-lg font-black font-headline mt-1">{msg.betAmount} COINS</span>
                          <p className="text-[8px] font-bold text-zinc-500 mt-2 uppercase tracking-tighter">Winner takes {msg.betAmount * 2} pot</p>
                        </div>
                        {!isMe && (
                          <button 
                            onClick={() => handleAcceptDuel(msg.betAmount, msg.duelId)}
                            disabled={isSending}
                            className="w-full h-12 bg-zinc-900 text-white font-black text-[10px] uppercase tracking-widest border-t border-zinc-800 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                          >
                            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : `Bet ${msg.betAmount} & Accept`}
                          </button>
                        )}
                        {isMe && (
                          <div className="w-full h-10 bg-zinc-800 flex items-center justify-center">
                             <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Waiting for {otherUser.username}</span>
                          </div>
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

      {(isSpinning || gameResult) && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="relative w-64 h-64 flex items-center justify-center">
            <div className={cn(
              "w-full h-full rounded-full border-8 border-primary/20 bg-zinc-900 relative flex items-center justify-center overflow-hidden",
              isSpinning && "animate-[spin_1s_linear_infinite]"
            )}>
              <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#B36666,#18181b,#B36666,#18181b)] opacity-50" />
              <Trophy className="w-20 h-20 text-primary relative z-10 drop-shadow-[0_0_20px_rgba(179,102,102,0.5)]" />
            </div>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-4 h-8 bg-white rounded-full z-20 shadow-xl" />
          </div>

          <div className="mt-12 text-center space-y-4">
            {isSpinning ? (
              <>
                <h2 className="text-3xl font-black font-headline text-white uppercase tracking-widest">Spinning Pot</h2>
                <p className="text-primary font-black text-xl italic">{activeGame?.bet * 2} COINS</p>
              </>
            ) : gameResult && (
              <div className="animate-in zoom-in-95 duration-500">
                {gameResult.winner === currentUser?.uid ? (
                  <div className="space-y-2">
                    <h2 className="text-5xl font-black font-headline text-green-500 uppercase tracking-tighter">YOU WIN!</h2>
                    <p className="text-white font-bold text-lg">+{gameResult.pot} Coins added</p>
                  </div>
                ) : (
                  <div className="space-y-2 opacity-70">
                    <h2 className="text-4xl font-black font-headline text-red-500 uppercase tracking-widest">YOU LOST</h2>
                    <p className="text-white/60 font-bold uppercase tracking-widest text-[10px]">Better luck next time</p>
                  </div>
                )}
                <Button onClick={() => setGameResult(null)} className="mt-8 rounded-full bg-white/10 text-white border border-white/20 px-10 h-14 uppercase font-black text-xs tracking-widest">Close</Button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="px-5 py-5 pb-8 space-y-4 bg-white border-t border-gray-50">
        {isBlocked ? (
          <div className="flex flex-col items-center justify-center py-4 gap-2">
            <Ban className="w-6 h-6 text-red-500" />
            <p className="text-[11px] font-black uppercase tracking-widest text-red-500">{iBlockedThem ? "User Blocked" : "Chat restricted"}</p>
          </div>
        ) : (
          <>
            <div className="relative group">
              <Input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Message..." className="rounded-full h-12 bg-gray-50 border-none px-6 text-[13px]" onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
              <Button size="icon" className={cn("absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full w-9 h-9", inputText.trim() && !isSending ? "bg-primary text-white" : "bg-gray-200 text-gray-400")} onClick={() => handleSendMessage()} disabled={!inputText.trim() || isSending}>
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            {!isOtherUserSupport && (
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
                    <SheetHeader className="px-6 pt-8 pb-4 shrink-0">
                      <SheetTitle className="text-xs font-black uppercase tracking-widest text-zinc-400">Select a Gift</SheetTitle>
                    </SheetHeader>
                    
                    <div className="flex-1 overflow-y-auto px-4 pb-32">
                      <div className="grid grid-cols-4 gap-2">
                        {GIFTS.map((gift) => (
                          <div 
                            key={gift.id}
                            onClick={() => setSelectedGift(gift)}
                            className={cn(
                              "flex flex-col items-center gap-2 p-2 rounded-2xl border transition-all cursor-pointer",
                              selectedGift?.id === gift.id ? "bg-primary/20 border-primary shadow-lg" : "bg-transparent border-transparent"
                            )}
                          >
                            <div className="w-14 h-14 flex items-center justify-center text-4xl">
                              {gift.emoji}
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center text-[6px] font-black text-zinc-900 italic">S</div>
                                <span className="text-[10px] font-black">{gift.price}</span>
                              </div>
                              <span className="text-[8px] font-bold text-zinc-400 text-center truncate w-full">{gift.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <footer className="absolute bottom-0 left-0 right-0 p-6 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800 flex items-center justify-between z-50">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-zinc-800 px-3 py-2 rounded-full border border-zinc-700">
                          <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-[8px] font-black text-zinc-900 italic">S</div>
                          <span className="text-xs font-black">{userCoins.toLocaleString()}</span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleSendGift()}
                        disabled={!selectedGift || isSendingGift}
                        className="h-12 px-10 rounded-full bg-primary text-white font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                      >
                        {isSendingGift ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                      </Button>
                    </footer>
                  </SheetContent>
                </Sheet>
              </div>
            )}
          </>
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
