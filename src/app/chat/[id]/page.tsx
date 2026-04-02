
"use client"

import { useState, useEffect, useRef, useMemo, Suspense } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Video, Send, Phone, Loader2, Gift, PhoneOff, Ban, CheckCircle, UserX, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, collection, setDoc, updateDoc as updateFirestoreDoc, increment as firestoreIncrement } from "firebase/firestore"
import { ref, push, onValue, serverTimestamp as rtdbTimestamp, update, set, increment, runTransaction as runRtdbTransaction, remove, get } from "firebase/database"
import { cn } from "@/lib/utils"
import { getZegoConfig } from "@/app/actions/zego"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import Image from "next/image"

let ZegoUIKitPrebuilt: any = null;

const GIFTS = [
  { id: 'mask', name: 'Party mask', price: 20, image: 'https://picsum.photos/seed/mask/200/200' },
  { id: 'handbag', name: 'Luxury Handbag', price: 800, image: 'https://picsum.photos/seed/bag/200/200' },
  { id: 'tea', name: 'Strong Tea', price: 100, image: 'https://picsum.photos/seed/tea/200/200' },
  { id: 'duck', name: 'Cute duck', price: 20, image: 'https://picsum.photos/seed/duck/200/200' },
  { id: 'treasure', name: 'Pearl treasure', price: 500, image: 'https://picsum.photos/seed/treasure/200/200' },
  { id: 'puppy', name: 'Puppy', price: 150, image: 'https://picsum.photos/seed/puppy/200/200' },
  { id: 'castle', name: 'Moon castle', price: 800, image: 'https://picsum.photos/seed/castle/200/200' },
  { id: 'rabbit', name: 'Rabbit', price: 150, image: 'https://picsum.photos/seed/rabbit/200/200' },
  { id: 'cat', name: 'Cat', price: 150, image: 'https://picsum.photos/seed/cat/200/200' },
  { id: 'balloon', name: 'Balloon', price: 20, image: 'https://picsum.photos/seed/balloon/200/200' },
  { id: 'soulmate', name: 'Soul mate', price: 30, image: 'https://picsum.photos/seed/hearts/200/200' },
  { id: 'ufo', name: 'UFO', price: 1990, image: 'https://picsum.photos/seed/ufo/200/200' },
]

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
  const zegoContainerRef = useRef<HTMLDivElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const ringtoneRef = useRef<HTMLAudioElement | null>(null)
  const zegoInitializingRef = useRef(false)
  
  // Call History Refs
  const callStatusRef = useRef<'idle' | 'ringing' | 'calling' | 'incoming' | 'ongoing'>('idle')
  const callDurationRef = useRef(0)
  const wasCallAcceptedRef = useRef(false)
  const isInitiatorRef = useRef(false)

  const [mounted, setMounted] = useState(false)
  const [inputText, setInputText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'calling' | 'incoming' | 'ongoing'>('idle')
  const [callType, setCallType] = useState<'video' | 'audio'>('video')
  const [zegoInstance, setZegoInstance] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [presence, setPresence] = useState<{ online: boolean; lastSeen?: number }>({ online: false })
  const [callDuration, setCallDuration] = useState(0)
  const [localPreviewStream, setLocalPreviewStream] = useState<MediaStream | null>(null)
  const [userCoins, setUserCoins] = useState(0)
  
  // Gift State
  const [isGiftSheetOpen, setIsGiftSheetOpen] = useState(false)
  const [selectedGift, setSelectedGift] = useState<typeof GIFTS[0] | null>(null)
  const [isSendingGift, setIsSendingGift] = useState(false)

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
    callStatusRef.current = callStatus
  }, [callStatus])

  useEffect(() => {
    callDurationRef.current = callDuration
  }, [callDuration])

  const presenceText = useMemo(() => {
    if (presence.online) return "Online";
    if (!presence.lastSeen) return "Offline";
    const date = new Date(presence.lastSeen);
    const now = new Date();
    const diffInDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (diffInDays > 2) return "Offline";
    return `Last seen ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [presence]);

  useEffect(() => {
    setMounted(true)
    if (typeof window !== "undefined") {
      import('@zegocloud/zego-uikit-prebuilt').then((module) => {
        ZegoUIKitPrebuilt = module.ZegoUIKitPrebuilt;
      });
      ringtoneRef.current = new Audio("/ringtone.mp3");
      ringtoneRef.current.loop = true;
    }
    return () => {
      setMounted(false)
      stopAllMedia();
    }
  }, []);

  useEffect(() => {
    if (!database || !currentUser) return
    const coinRef = ref(database, `users/${currentUser.uid}/coinBalance`)
    return onValue(coinRef, (snap) => setUserCoins(snap.val() || 0))
  }, [database, currentUser])

  useEffect(() => {
    if (previewVideoRef.current && localPreviewStream) {
      previewVideoRef.current.srcObject = localPreviewStream;
    }
  }, [localPreviewStream]);

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
    let interval: NodeJS.Timeout;
    if (callStatus === 'ongoing') {
      interval = setInterval(() => {
        if (!mounted) return;
        setCallDuration((prev) => {
          const nextVal = prev + 1;
          if (nextVal === 11) {
            handleRecurringDeduction();
          } else if (nextVal > 11 && nextVal % 60 === 0) {
            handleRecurringDeduction();
          }
          return nextVal;
        });
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callStatus, mounted, callType]);

  const handleRecurringDeduction = async () => {
    if (!currentUser || !firestore || !chatId || !currentUserProfile || !database) return;
    const isFree = currentUserProfile.isAdmin || 
                   currentUserProfile.isSupport || 
                   currentUserProfile.isCoinseller ||
                   (currentUserProfile.gender === 'female' && otherUser?.gender === 'male');
    if (isFree) return;
    
    const costPerMin = callType === 'video' ? 160 : 80;
    const userCoinRef = ref(database, `users/${currentUser.uid}/coinBalance`);

    try {
      const result = await runRtdbTransaction(userCoinRef, (current) => {
        if (current === null) return 0;
        if (current < costPerMin) return undefined;
        return current - costPerMin;
      });

      if (!result.committed) {
        handleEndCall();
        return;
      }

      // Backup Sync to Firestore
      updateFirestoreDoc(doc(firestore, "userProfiles", currentUser.uid), {
        coinBalance: firestoreIncrement(-costPerMin),
        updatedAt: new Date().toISOString()
      });

      const txRef = doc(collection(firestore, "userProfiles", currentUser.uid, "transactions"));
      setDoc(txRef, {
        id: txRef.id,
        type: "deduction",
        amount: -costPerMin,
        transactionDate: new Date().toISOString(),
        description: `Call in progress with ${otherUser?.username || 'user'}`
      });
    } catch (error) {
      handleEndCall();
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      try { 
        ringtoneRef.current.pause(); 
        ringtoneRef.current.currentTime = 0; 
      } catch (e) {}
    }
  };

  const playRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.play().catch(() => {});
    }
  };

  const stopAllMedia = () => {
    stopRingtone();
    if (previewVideoRef.current) previewVideoRef.current.srcObject = null;
    if (localPreviewStream) {
      localPreviewStream.getTracks().forEach(track => track.stop());
      setLocalPreviewStream(null);
    }
    if (zegoInstance) {
      try { zegoInstance.destroy(); } catch (e) {}
      setZegoInstance(null);
    }
    zegoInitializingRef.current = false;
  };

  const logCallEndToChat = async (finalDuration: number, finalWasAccepted: boolean) => {
    // Only the initiator logs the message to avoid duplicates
    if (!isInitiatorRef.current || !database || !chatId || !currentUser) return;

    let logMessage = "[cancelled]";
    if (finalWasAccepted) {
      const mins = Math.floor(finalDuration / 60);
      const secs = finalDuration % 60;
      logMessage = `[${mins}:${secs.toString().padStart(2, '0')}]`;
    }

    const updates: any = {}
    const msgKey = push(ref(database, `chats/${chatId}/messages`)).key
    const msgData = { 
      messageText: logMessage, 
      senderId: currentUser.uid, 
      sentAt: rtdbTimestamp(),
      isCallLog: true 
    }
    
    updates[`/chats/${chatId}/messages/${msgKey}`] = msgData
    updates[`/users/${currentUser.uid}/chats/${otherUserId}/lastMessage`] = logMessage
    updates[`/users/${currentUser.uid}/chats/${otherUserId}/timestamp`] = rtdbTimestamp()
    updates[`/users/${otherUserId}/chats/${currentUser.uid}/lastMessage`] = logMessage
    updates[`/users/${otherUserId}/chats/${currentUser.uid}/timestamp`] = rtdbTimestamp()
    
    await update(ref(database), updates);
  }

  const initiateZegoCall = async (roomID: string) => {
    if (!ZegoUIKitPrebuilt || !currentUser || !zegoContainerRef.current || zegoInitializingRef.current) return;
    zegoInitializingRef.current = true;
    
    if (localPreviewStream) {
      localPreviewStream.getTracks().forEach(t => t.stop());
      setLocalPreviewStream(null);
    }

    const { appID, serverSecret } = await getZegoConfig();
    if (!appID || !serverSecret) { handleEndCall(); return; }
    try {
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID, 
        serverSecret, 
        roomID, 
        currentUser.uid, 
        currentUser.displayName || `User_${currentUser.uid.slice(0, 5)}`
      );
      const zp = ZegoUIKitPrebuilt.create(kitToken);
      setZegoInstance(zp);
      zp.joinRoom({
        container: zegoContainerRef.current,
        showPreJoinView: false,
        turnOnMicrophoneWhenJoining: true,
        turnOnCameraWhenJoining: callType === 'video',
        showMyCameraToggleButton: false,
        showMyMicrophoneToggleButton: false,
        showAudioVideoSettingsButton: false,
        showScreenSharingButton: false,
        showTextChat: false,
        showUserList: false,
        maxUsers: 2,
        layout: "Auto",
        showLayoutButton: false,
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
          config: { role: "Host" },
        },
        onLeaveRoom: () => handleEndCall(),
      });
    } catch (error) {
      handleEndCall();
    }
  };

  useEffect(() => {
    if (!database || !chatId || !currentUser || !otherUser || (otherUser.isSupport && !currentUserProfile?.isAdmin)) return
    const callRef = ref(database, `calls/${chatId}`);
    
    const unsubscribe = onValue(callRef, (snap) => {
      const data = snap.val()
      
      // If call data was removed (null), check if we need to log the end
      if (!data) {
        if (callStatusRef.current !== 'idle') {
          // Log to chat before resetting
          logCallEndToChat(callDurationRef.current, wasCallAcceptedRef.current);
          
          stopAllMedia(); 
          setCallStatus('idle');
          wasCallAcceptedRef.current = false;
          isInitiatorRef.current = false;
        }
        return
      }

      setCallType(data.callType || 'video')
      
      if (data.status === 'ringing') {
        playRingtone();
        const nextStatus = data.callerId === currentUser.uid ? 'calling' : 'incoming';
        setCallStatus(nextStatus);
        if (data.callerId === currentUser.uid) {
          isInitiatorRef.current = true;
        }
      } else if (data.status === 'accepted') {
        stopRingtone();
        wasCallAcceptedRef.current = true;
        if (callStatusRef.current !== 'ongoing') {
          setCallStatus('ongoing')
          initiateZegoCall(chatId);
        }
      }
    });
    return () => unsubscribe();
  }, [database, chatId, currentUser, !!otherUser]);

  const handleInitiateCall = async (type: 'video' | 'audio') => {
    if (!database || !chatId || !currentUser || !currentUserProfile || !otherUser) return

    const costPerMin = type === 'video' ? 160 : 80;
    const isFree = currentUserProfile.isAdmin || 
                   currentUserProfile.isSupport || 
                   currentUserProfile.isCoinseller ||
                   (currentUserProfile.gender === 'female' && otherUser?.gender === 'male');

    if (!isFree && userCoins < costPerMin) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: "Recharge to start this call.",
        duration: 3000,
        action: <Button onClick={() => router.push('/recharge')} size="sm" className="bg-white text-primary">Recharge</Button>
      });
      return;
    }

    if (type === 'video') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setLocalPreviewStream(stream);
      } catch (e) {
        console.error("Camera preview failed", e);
      }
    }

    try {
      const callRef = ref(database, `calls/${chatId}`);
      isInitiatorRef.current = true;
      await set(callRef, { 
        callerId: currentUser.uid, 
        receiverId: otherUserId, 
        status: 'ringing', 
        callType: type, 
        timestamp: Date.now(),
        callerName: currentUserProfile.username || 'Someone'
      });
    } catch (error: any) {
      stopAllMedia();
      isInitiatorRef.current = false;
      toast({ variant: "destructive", title: "Call Failed", description: "Could not establish connection." });
    }
  }

  const handleAcceptCall = async () => {
    if (!database || !chatId) return
    const callRef = ref(database, `calls/${chatId}`);
    await update(callRef, { status: 'accepted' });
  }

  const handleDeclineCall = async () => {
    if (!database || !chatId) return
    const callRef = ref(database, `calls/${chatId}`);
    await remove(callRef);
    // onValue will trigger the log
  }

  const handleEndCall = async () => {
    if (!database || !chatId) return
    const callRef = ref(database, `calls/${chatId}`);
    await remove(callRef);
    // onValue will trigger the log
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
    if (!textToUse.trim() || !currentUser || !chatId || !database || !otherUserId || !otherUser || !currentUserProfile || isSending) return
    
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
          if (current === null) return 0;
          if (current < messageCost) return undefined;
          return current - messageCost;
        });

        if (!result.committed) throw new Error("INSUFFICIENT_COINS");

        // Sync to Firestore Backup
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
      const msgData = { messageText: textToUse, senderId: currentUser.uid, sentAt: rtdbTimestamp() }
      updates[`/chats/${chatId}/messages/${msgKey}`] = msgData
      updates[`/users/${currentUser.uid}/chats/${otherUserId}`] = { lastMessage: textToUse, timestamp: rtdbTimestamp(), otherUserId, chatId, unreadCount: 0 }
      updates[`/users/${otherUserId}/chats/${currentUser.uid}/lastMessage`] = textToUse
      updates[`/users/${otherUserId}/chats/${currentUser.uid}/timestamp`] = rtdbTimestamp()
      updates[`/users/${otherUserId}/chats/${currentUser.uid}/otherUserId`] = currentUser.uid
      updates[`/users/${otherUserId}/chats/${currentUser.uid}/chatId`] = chatId
      updates[`/users/${otherUserId}/chats/${currentUser.uid}/unreadCount`] = increment(1)
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

  const handleSendGift = async () => {
    if (!selectedGift || !currentUser || !otherUserId || isSendingGift || !currentUserProfile || !database) return;
    
    setIsSendingGift(true);
    const giftPrice = selectedGift.price;
    const diamondGain = Math.floor(giftPrice * 0.6);

    try {
      const senderCoinRef = ref(database, `users/${currentUser.uid}/coinBalance`);
      const result = await runRtdbTransaction(senderCoinRef, (current) => {
        if (current === null) return 0;
        if (current < giftPrice) return undefined;
        return current - giftPrice;
      });

      if (!result.committed) throw new Error("INSUFFICIENT_COINS");

      const receiverDiamondRef = ref(database, `users/${otherUserId}/diamondBalance`);
      await runRtdbTransaction(receiverDiamondRef, (current) => (current || 0) + diamondGain);

      // Firestore Backup Sync
      updateFirestoreDoc(doc(firestore, "userProfiles", currentUser.uid), {
        coinBalance: firestoreIncrement(-giftPrice),
        updatedAt: new Date().toISOString()
      });
      updateFirestoreDoc(doc(firestore, "userProfiles", otherUserId), {
        diamondBalance: firestoreIncrement(diamondGain),
        updatedAt: new Date().toISOString()
      });

      const senderTxRef = doc(collection(firestore, "userProfiles", currentUser.uid, "transactions"));
      setDoc(senderTxRef, {
        id: senderTxRef.id,
        type: "gift_sent",
        amount: -giftPrice,
        transactionDate: new Date().toISOString(),
        description: `Sent ${selectedGift.name} to ${otherUser?.username || 'User'}`
      });

      const receiverTxRef = doc(collection(firestore, "userProfiles", otherUserId, "transactions"));
      setDoc(receiverTxRef, {
        id: receiverTxRef.id,
        type: "gift_received",
        amount: diamondGain,
        transactionDate: new Date().toISOString(),
        description: `Received ${selectedGift.name} (Diamond value)`
      });

      const giftMessage = `🎁 Sent a gift: ${selectedGift.name}`;
      const updates: any = {}
      const msgKey = push(ref(database, `chats/${chatId}/messages`)).key
      const msgData = { messageText: giftMessage, senderId: currentUser.uid, sentAt: rtdbTimestamp(), isGift: true }
      updates[`/chats/${chatId}/messages/${msgKey}`] = msgData
      updates[`/users/${currentUser.uid}/chats/${otherUserId}/lastMessage`] = giftMessage
      updates[`/users/${currentUser.uid}/chats/${otherUserId}/timestamp`] = rtdbTimestamp()
      updates[`/users/${otherUserId}/chats/${currentUser.uid}/lastMessage`] = giftMessage
      updates[`/users/${otherUserId}/chats/${currentUser.uid}/timestamp`] = rtdbTimestamp()
      updates[`/users/${otherUserId}/chats/${currentUser.uid}/unreadCount`] = increment(1)
      await update(ref(database), updates)

      toast({ title: "Gift Sent!", description: `You sent a ${selectedGift.name}.` });
      setIsGiftSheetOpen(false);
      setSelectedGift(null);
    } catch (error: any) {
      if (error.message === "INSUFFICIENT_COINS") {
        toast({ variant: "destructive", title: "Insufficient Coins", description: "Please recharge to send this gift." });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Could not send gift." });
      }
    } finally {
      setIsSendingGift(false);
    }
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
      {(callStatus === 'calling' || callStatus === 'incoming') && (
        <div className="absolute inset-0 z-[300] bg-zinc-950 flex flex-col items-center justify-between py-24 px-8 text-white animate-in fade-in duration-500">
          <div className="absolute inset-0 z-0 overflow-hidden">
             {callType === 'video' && localPreviewStream ? (
               <video 
                 ref={previewVideoRef} 
                 autoPlay 
                 muted 
                 playsInline 
                 className="w-full h-full object-cover scale-x-[-1] opacity-40 blur-[2px]" 
               />
             ) : (
               <div className="w-full h-full bg-zinc-900" />
             )}
             <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-zinc-950/60" />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-10 mt-12 w-full">
            <div className="relative">
              <div className="absolute -inset-8 bg-primary/20 rounded-full animate-ping opacity-20" />
              <Avatar className="w-44 h-44 border-[10px] border-white/5 shadow-2xl">
                <AvatarImage src={otherUserImage} className="object-cover" />
                <AvatarFallback className="text-5xl bg-zinc-800">{otherUserName[0] || '?'}</AvatarFallback>
              </Avatar>
            </div>
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-4xl font-black font-headline tracking-tight text-white">{otherUserName}</h2>
                {isOtherUserVerified && <CheckCircle className="w-8 h-8 text-blue-400 fill-blue-400/20" />}
              </div>
              <div className="px-4 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2 mx-auto w-fit">
                {callType === 'video' ? <Video className="w-4 h-4 text-primary" /> : <Phone className="w-4 h-4 text-primary" />}
                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] animate-pulse">
                  {callStatus === 'calling' ? 'Calling...' : `Incoming call`}
                </p>
              </div>
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-16 mb-12">
            {callStatus === 'incoming' ? (
              <>
                <button onClick={handleDeclineCall} className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center shadow-2xl active:scale-90 transition-all"><PhoneOff className="w-10 h-10 text-white" /></button>
                <button onClick={handleAcceptCall} className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-2xl active:scale-90 transition-all animate-bounce"><Phone className="w-10 h-10 text-white" /></button>
              </>
            ) : (
              <button onClick={handleEndCall} className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shadow-2xl active:scale-90 transition-all hover:bg-red-500"><PhoneOff className="w-10 h-10 text-white" /></button>
            )}
          </div>
        </div>
      )}

      <div ref={zegoContainerRef} className={cn("absolute inset-0 z-[200] bg-black transition-opacity duration-700", callStatus === 'ongoing' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')}>
        {callStatus === 'ongoing' && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[210] px-5 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/20">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
               <span className="text-white font-black text-sm tracking-[0.2em]">{Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
        )}
      </div>

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
            return (
              <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] px-4 py-3 text-[13px] font-medium leading-relaxed shadow-sm", 
                  isMe ? "bg-primary text-white rounded-[1.5rem] rounded-tr-none" : "bg-gray-100 text-gray-900 rounded-[1.5rem] rounded-tl-none",
                  msg.isGift && "border-2 border-amber-400/30 bg-gradient-to-br from-amber-50 to-white text-amber-900 shadow-amber-100",
                  isCallLog && "bg-transparent shadow-none border-none py-1 px-2 font-black text-[10px] tracking-widest text-gray-300 uppercase"
                )}>
                  <p className="whitespace-pre-wrap">{msg.messageText}</p>
                </div>
              </div>
            )
          })}
          <div ref={scrollRef} className="h-4" />
        </div>
      </ScrollArea>

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
              <div className="grid grid-cols-3 gap-3">
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
                      <SheetTitle className="sr-only">Send a Gift</SheetTitle>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-6">
                          <button className="text-xs font-black uppercase tracking-widest border-b-2 border-primary pb-2">Gift</button>
                          <button className="text-xs font-black uppercase tracking-widest text-zinc-500 pb-2">Privilege</button>
                        </div>
                        <button onClick={() => setIsGiftSheetOpen(false)} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"><X className="w-4 h-4" /></button>
                      </div>
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
                            <div className="relative w-14 h-14">
                              <Image src={gift.image} alt={gift.name} fill className="object-contain" />
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
                        onClick={handleSendGift}
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
