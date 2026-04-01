"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Video, Send, Phone, Loader2, MoreVertical, Gift, PhoneOff, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, runTransaction, collection, onSnapshot, setDoc, updateDoc, deleteDoc } from "firebase/firestore"
import { ref, push, onValue, serverTimestamp as rtdbTimestamp, update } from "firebase/database"
import { cn } from "@/lib/utils"
import { getZegoConfig } from "@/app/actions/zego"

let ZegoUIKitPrebuilt: any = null;

export default function ChatDetailPage() {
  const params = useParams()
  const otherUserId = params?.id as string
  const { user: currentUser } = useUser()
  const { firestore, database } = useFirebase()
  const router = useRouter()
  const { toast } = useToast()
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const zegoContainerRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'ongoing') {
      interval = setInterval(() => {
        if (!mounted) return;
        setCallDuration((prev) => {
          const nextVal = prev + 1;
          if (nextVal > 0 && nextVal % 60 === 0) {
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
    if (!currentUser || !firestore || !chatId) return;

    const isFree = currentUserProfile?.isAdmin || 
                   currentUserProfile?.isSupport || 
                   currentUserProfile?.isCoinseller;

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
        toast({ 
          variant: "destructive", 
          title: "Session Ended", 
          description: "Insufficient balance to continue. Please recharge." 
        });
        handleEndCall();
      }
    }
  };

  const presenceText = useMemo(() => {
    if (presence.online) return "Online";
    if (!presence.lastSeen) return "Offline";
    const date = new Date(presence.lastSeen);
    return `Last seen ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [presence]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });
      localStreamRef.current = stream;
    } catch (error) {
      console.error("Media access denied", error);
      handleEndCall();
      return;
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
        showAudioVideoSettingsButton: true,
        showScreenSharingButton: true,
        showTextChat: true,
        showUserList: true,
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
      console.error("Zego join failed", error);
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
    const isFree = currentUserProfile.isAdmin || currentUserProfile.isSupport || currentUserProfile.isCoinseller;

    try {
      if (!isFree) {
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
            description: `Started ${type} call with ${otherUser?.username || 'user'}`
          });
        });
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
      if (error.message === "INSUFFICIENT_COINS") {
        toast({
          variant: "destructive",
          title: "Insufficient Balance",
          description: `You need a higher balance to start this call.`,
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

  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentUser || !chatId || !database || !otherUserId || !otherUser || !currentUserProfile || isSending || isBlocked) return
    setIsSending(true)
    
    const senderGender = currentUserProfile.gender?.toLowerCase() || 'male';
    const receiverGender = otherUser.gender?.toLowerCase() || 'female';
    
    let isFree = currentUserProfile.isAdmin || 
                 currentUserProfile.isSupport || 
                 currentUserProfile.isCoinseller || 
                 otherUser.isSupport || 
                 otherUser.isCoinseller;
    
    if (senderGender === 'female' && receiverGender === 'male') {
      isFree = true;
    }

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
      const msgData = { messageText: inputText, senderId: currentUser.uid, sentAt: rtdbTimestamp() }
      updates[`/chats/${chatId}/messages/${msgKey}`] = msgData
      updates[`/users/${currentUser.uid}/chats/${otherUserId}`] = { lastMessage: inputText, timestamp: rtdbTimestamp(), otherUserId, chatId }
      updates[`/users/${otherUserId}/chats/${currentUser.uid}`] = { lastMessage: inputText, timestamp: rtdbTimestamp(), otherUserId: currentUser.uid, chatId }
      await update(ref(database), updates)
      setInputText("")
    } catch (error: any) {
      if (error.message === "INSUFFICIENT_COINS") {
        toast({ 
          variant: "destructive", 
          title: "Balance Error", 
          description: `Insufficient balance to send message.` 
        });
      }
    } finally { setIsSending(false) }
  }

  if (isOtherUserLoading) return <div className="flex items-center justify-center h-svh bg-white" />
  if (!otherUser) return <div className="p-10 text-center bg-white h-svh flex items-center justify-center"><Button onClick={() => router.push('/discover')}>Back</Button></div>

  const otherUserImage = (otherUser.profilePhotoUrls && otherUser.profilePhotoUrls[0]) || `https://picsum.photos/seed/${otherUser.id}/200/200`

  return (
    <div className="flex flex-col h-svh bg-white relative overflow-hidden text-gray-900">
      {(callStatus === 'calling' || callStatus === 'incoming') && (
        <div className="absolute inset-0 z-[300] bg-zinc-950 flex flex-col items-center justify-between py-24 px-8 text-white animate-in fade-in duration-500">
          <div className="flex flex-col items-center gap-10 mt-12 w-full">
            <div className="relative">
              <div className="absolute -inset-8 bg-primary/20 rounded-full animate-ping opacity-20" />
              <div className="absolute -inset-16 bg-primary/10 rounded-full animate-pulse opacity-10" />
              <Avatar className="w-44 h-44 border-[10px] border-white/5 shadow-[0_0_60px_rgba(179,102,102,0.3)] relative z-10">
                <AvatarImage src={otherUserImage} className="object-cover" />
                <AvatarFallback className="text-5xl bg-zinc-900">{otherUser.username?.[0]}</AvatarFallback>
              </Avatar>
            </div>
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-black font-headline tracking-tight text-white">{otherUser.username}</h2>
              <div className="px-4 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                {callType === 'video' ? <Video className="w-4 h-4 text-primary" /> : <Phone className="w-4 h-4 text-primary" />}
                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] animate-pulse">
                  {callStatus === 'calling' ? 'Calling...' : `Incoming call`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-16 mb-12">
            {callStatus === 'incoming' ? (
              <>
                <button onClick={handleDeclineCall} className="w-24 h-24 rounded-full bg-red-500/90 flex items-center justify-center shadow-2xl active:scale-90 transition-all"><PhoneOff className="w-10 h-10 text-white" /></button>
                <button onClick={handleAcceptCall} className="w-24 h-24 rounded-full bg-green-500/90 flex items-center justify-center shadow-2xl active:scale-90 transition-all animate-bounce"><Phone className="w-10 h-10 text-white" /></button>
              </>
            ) : (
              <button onClick={handleEndCall} className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shadow-2xl active:scale-90 transition-all hover:bg-red-500"><PhoneOff className="w-10 h-10 text-white/80" /></button>
            )}
          </div>
        </div>
      )}

      <div ref={zegoContainerRef} className={cn("absolute inset-0 z-[200] bg-black transition-opacity duration-700", callStatus === 'ongoing' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')}>
        {callStatus === 'ongoing' && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[210] px-5 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/20">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
               <span className="text-white font-black text-sm tracking-[0.2em]">{formatDuration(callDuration)}</span>
            </div>
          </div>
        )}
      </div>

      <header className="px-5 pt-8 pb-4 bg-white flex items-center justify-between sticky top-0 z-10 border-b border-gray-50">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100"><ChevronLeft className="w-5 h-5" /></Button>
        <div 
          className="flex items-center gap-3 cursor-pointer active:opacity-70 transition-opacity flex-1 justify-center mr-10"
          onClick={() => router.push(`/profile/${otherUserId}`)}
        >
          <Avatar className="w-9 h-9 border border-gray-100 shadow-sm"><AvatarImage src={otherUserImage} className="object-cover" /><AvatarFallback>{otherUser.username?.[0]}</AvatarFallback></Avatar>
          <div className="flex flex-col text-center">
            <h3 className="font-bold text-[13px] text-gray-900 leading-none mb-1">{otherUser.username}</h3>
            <span className={cn("text-[9px] font-black uppercase tracking-widest", presence.online ? "text-green-500" : "text-gray-400")}>{presenceText}</span>
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
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center"><Ban className="w-6 h-6 text-red-500" /></div>
            <p className="text-[11px] font-black uppercase tracking-widest text-red-500">{iBlockedThem ? "You have blocked this user" : "Chat restricted"}</p>
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
