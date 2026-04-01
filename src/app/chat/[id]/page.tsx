"use client"

import { useState, useEffect, useRef, useMemo, Suspense } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Video, Send, Phone, Loader2, Gift, PhoneOff, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, runTransaction, collection, onSnapshot, setDoc, updateDoc, deleteDoc } from "firebase/firestore"
import { ref, push, onValue, serverTimestamp as rtdbTimestamp, update, set, increment } from "firebase/database"
import { cn } from "@/lib/utils"
import { getZegoConfig } from "@/app/actions/zego"

let ZegoUIKitPrebuilt: any = null;

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
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const ringtoneRef = useRef<HTMLAudioElement | null>(null)
  const zegoInitializingRef = useRef(false)
  const [mounted, setMounted] = useState(false)
  
  const [inputText, setInputText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'calling' | 'ongoing' | 'incoming'>('idle')
  const [callType, setCallType] = useState<'video' | 'audio'>('video')
  const [zegoInstance, setZegoInstance] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [presence, setPresence] = useState<{ online: boolean; lastSeen?: number }>({ online: false })
  const [callDuration, setCallDuration] = useState(0)
  
  const chatId = currentUser && otherUserId ? [currentUser.uid, otherUserId].sort().join("_") : ""
  
  const otherUserRef = useMemoFirebase(() => otherUserId ? doc(firestore, "userProfiles", otherUserId) : null, [firestore, otherUserId])
  const { data: otherUser, isLoading: isOtherUserLoading } = useDoc(otherUserRef)

  const currentUserProfileRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: currentUserProfile } = useDoc(currentUserProfileRef)

  const myBlockRef = useMemoFirebase(() => currentUser && otherUserId ? doc(firestore, "userProfiles", currentUser.uid, "blockedUsers", otherUserId) : null, [firestore, currentUser, otherUserId])
  const { data: iBlockedThem } = useDoc(myBlockRef)

  const theirBlockRef = useMemoFirebase(() => currentUser && otherUserId ? doc(firestore, "userProfiles", otherUserId, "blockedUsers", currentUser.uid) : null, [firestore, currentUser, otherUserId])
  const { data: theyBlockedMe } = useDoc(theirBlockRef)

  const isBlocked = !!iBlockedThem || !!theyBlockedMe

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

  // Handle initial auto-message
  useEffect(() => {
    if (initialMsg && currentUser && otherUserId && database && otherUser && !isSending) {
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        handleSendMessage(initialMsg);
        // Clear param from URL without refreshing
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [initialMsg, currentUser, otherUserId, database, !!otherUser]);

  useEffect(() => {
    if ((callStatus === 'calling' || callStatus === 'ringing') && callType === 'video' && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [callStatus, callType]);

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
    if (!currentUser || !firestore || !chatId || !currentUserProfile) return;
    const isFree = currentUserProfile.isAdmin || 
                   currentUserProfile.isSupport || 
                   currentUserProfile.isCoinseller ||
                   (currentUserProfile.gender === 'female' && otherUser?.gender === 'male');
    if (isFree) return;
    const costPerMin = callType === 'video' ? 160 : 80;
    try {
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(doc(firestore, "userProfiles", currentUser.uid));
        if (!userDoc.exists()) throw new Error("Profile not found");
        const currentBalance = userDoc.data().coinBalance || 0;
        if (currentBalance < costPerMin) throw new Error("INSUFFICIENT_COINS");
        transaction.update(doc(firestore, "userProfiles", currentUser.uid), {
          coinBalance: currentBalance - costPerMin,
          updatedAt: new Date().toISOString()
        });
        const txRef = doc(collection(firestore, "userProfiles", currentUser.uid, "transactions"));
        transaction.set(txRef, {
          id: txRef.id,
          type: "deduction",
          amount: -costPerMin,
          transactionDate: new Date().toISOString(),
          description: `Call in progress with ${otherUser?.username || 'user'}`
        });
      });
    } catch (error: any) {
      if (error.message === "INSUFFICIENT_COINS") {
        handleEndCall();
      }
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
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (zegoInstance) {
      try { zegoInstance.destroy(); } catch (e) {}
      setZegoInstance(null);
    }
    zegoInitializingRef.current = false;
  };

  const initiateZegoCall = async (roomID: string) => {
    if (!ZegoUIKitPrebuilt || !currentUser || !zegoContainerRef.current || zegoInitializingRef.current) return;
    zegoInitializingRef.current = true;
    if (!localStreamRef.current) {
      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({
          video: callType === 'video',
          audio: true
        });
      } catch (error) {
        handleEndCall();
        return;
      }
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
    if (!firestore || !chatId || !currentUser || isBlocked) return
    const callDocRef = doc(firestore, "calls", chatId);
    const unsubscribe = onSnapshot(callDocRef, (snap) => {
      const data = snap.data()
      if (!data) {
        if (callStatus !== 'idle') { 
          stopAllMedia(); 
          setCallStatus('idle'); 
        }
        return
      }
      setCallType(data.callType || 'video')
      if (data.status === 'ringing') {
        playRingtone();
        setCallStatus(data.callerId === currentUser.uid ? 'calling' : 'incoming')
      } else if (data.status === 'accepted') {
        stopRingtone();
        if (callStatus !== 'ongoing') {
          setCallStatus('ongoing')
          initiateZegoCall(chatId);
        }
      }
    });
    return () => unsubscribe();
  }, [firestore, chatId, currentUser, callStatus, callType, isBlocked]);

  const handleInitiateCall = async (type: 'video' | 'audio') => {
    if (!firestore || !chatId || !currentUser || !currentUserProfile || isBlocked) return
    const costPerMin = type === 'video' ? 160 : 80;
    const isFree = currentUserProfile.isAdmin || 
                   currentUserProfile.isSupport || 
                   currentUserProfile.isCoinseller ||
                   (currentUserProfile.gender === 'female' && otherUser?.gender === 'male');
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Camera Error", description: "Please allow camera access." });
      return;
    }
    try {
      if (!isFree && (currentUserProfile.coinBalance || 0) < costPerMin) {
        throw new Error("INSUFFICIENT_COINS");
      }
      const callDocRef = doc(firestore, "calls", chatId);
      await setDoc(callDocRef, { 
        callerId: currentUser.uid, 
        receiverId: otherUserId, 
        status: 'ringing', 
        callType: type, 
        timestamp: Date.now(),
        callerName: currentUser.displayName || 'Someone'
      });
    } catch (error: any) {
      stopAllMedia();
      if (error.message === "INSUFFICIENT_COINS") {
        toast({
          variant: "destructive",
          title: "Insufficient Balance",
          description: "Recharge to start this call.",
          duration: 3000,
          action: <Button onClick={() => router.push('/recharge')} size="sm" className="bg-white text-primary">Recharge</Button>
        });
      }
    }
  }

  const handleAcceptCall = async () => {
    if (!firestore || !chatId) return
    const callDocRef = doc(firestore, "calls", chatId);
    await updateDoc(callDocRef, { status: 'accepted' });
  }

  const handleDeclineCall = async () => {
    if (!firestore || !chatId) return
    const callDocRef = doc(firestore, "calls", chatId);
    await deleteDoc(callDocRef);
    setCallStatus('idle')
    stopAllMedia();
  }

  const handleEndCall = async () => {
    if (!firestore || !chatId) return
    const callDocRef = doc(firestore, "calls", chatId);
    await deleteDoc(callDocRef);
    stopAllMedia(); 
    setCallStatus('idle')
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
    if (!textToUse.trim() || !currentUser || !chatId || !database || !otherUserId || !otherUser || !currentUserProfile || isSending || isBlocked) return
    setIsSending(true)
    const senderGender = currentUserProfile.gender?.toLowerCase() || 'male';
    const receiverGender = otherUser.gender?.toLowerCase() || 'female';
    let isFree = currentUserProfile.isAdmin || 
                 currentUserProfile.isSupport || 
                 currentUserProfile.isCoinseller || 
                 otherUser.isSupport || 
                 otherUser.isCoinseller ||
                 (senderGender === 'female' && receiverGender === 'male');
    const messageCost = isFree ? 0 : 15;
    try {
      if (messageCost > 0) {
        await runTransaction(firestore, async (transaction) => {
          const userDoc = await transaction.get(doc(firestore, "userProfiles", currentUser.uid));
          if (!userDoc.exists()) throw new Error("Profile not found");
          const currentBalance = userDoc.data().coinBalance || 0;
          if (currentBalance < messageCost) throw new Error("INSUFFICIENT_COINS");
          transaction.update(doc(firestore, "userProfiles", currentUser.uid), {
            coinBalance: currentBalance - messageCost,
            updatedAt: new Date().toISOString()
          });
          const txRef = doc(collection(firestore, "userProfiles", currentUser.uid, "transactions"));
          transaction.set(txRef, {
            id: txRef.id,
            type: "deduction",
            amount: -messageCost,
            transactionDate: new Date().toISOString(),
            description: `Message sent`
          });
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
      }
    } finally { setIsSending(false) }
  }

  const otherUserImage = (otherUser?.profilePhotoUrls && otherUser.profilePhotoUrls[0]) || `https://picsum.photos/seed/${otherUserId}/200/200`
  const otherUserName = otherUser?.username || "User"

  const presenceText = useMemo(() => {
    if (presence.online) return "Online";
    if (!presence.lastSeen) return "Offline";
    const date = new Date(presence.lastSeen);
    const now = new Date();
    const diffInDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (diffInDays > 2) return "Offline";
    return `Last seen ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [presence]);

  return (
    <div className="flex flex-col h-svh bg-white relative overflow-hidden text-gray-900">
      {(callStatus === 'calling' || callStatus === 'incoming') && (
        <div className="absolute inset-0 z-[300] bg-zinc-950 flex flex-col items-center justify-between py-24 px-8 text-white animate-in fade-in duration-500">
          <div className="absolute inset-0 z-0">
             {callType === 'video' ? (
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover opacity-60 grayscale-[0.2]" />
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
              <h2 className="text-4xl font-black font-headline tracking-tight text-white">{otherUserName}</h2>
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
        <div className="flex items-center gap-3 cursor-pointer active:opacity-70 transition-opacity flex-1 justify-center mr-10" onClick={() => router.push(`/profile/${otherUserId}`)}>
          <Avatar className="w-9 h-9 border border-gray-100 shadow-sm"><AvatarImage src={otherUserImage} className="object-cover" /><AvatarFallback>{otherUserName[0] || '?'}</AvatarFallback></Avatar>
          <div className="flex flex-col text-center">
            <h3 className={cn("font-bold text-[13px] leading-none mb-1 h-3.5", otherUserName === "User logged out" ? "text-gray-400 font-medium italic" : "text-gray-900")}>
              {otherUserName}
            </h3>
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
            return (
              <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] px-4 py-3 text-[13px] font-medium leading-relaxed shadow-sm", isMe ? "bg-primary text-white rounded-[1.5rem] rounded-tr-none" : "bg-gray-100 text-gray-900 rounded-[1.5rem] rounded-tl-none")}>
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
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => handleInitiateCall('audio')} className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 h-16 rounded-2xl border border-gray-100 active:bg-gray-100 shadow-sm"><Phone className="w-4 h-4 text-gray-500" /><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Voice</span></button>
              <button onClick={() => handleInitiateCall('video')} className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 h-16 rounded-2xl border border-gray-100 active:bg-gray-100 shadow-sm"><Video className="w-4 h-4 text-gray-500" /><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Video</span></button>
              <button className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 h-16 rounded-2xl border border-gray-100 active:bg-gray-100 shadow-sm"><Gift className="w-4 h-4 text-primary" /><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Gift</span></button>
            </div>
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
