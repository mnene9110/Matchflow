
"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Video, Send, Phone, Loader2, MoreVertical, Gift, PhoneOff, AlertCircle, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, runTransaction, collection } from "firebase/firestore"
import { ref, push, onValue, serverTimestamp as rtdbTimestamp, update, set, remove } from "firebase/database"
import { cn } from "@/lib/utils"
import { getZegoConfig } from "@/app/actions/zego"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
  
  const [inputText, setInputText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'calling' | 'ongoing' | 'incoming'>('idle')
  const [callType, setCallType] = useState<'video' | 'audio'>('video')
  const [zegoInstance, setZegoInstance] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [presence, setPresence] = useState<{ online: boolean; lastSeen?: number }>({ online: false })
  const [hasPermissionError, setHasPermissionError] = useState(false)
  
  const chatId = currentUser && otherUserId ? [currentUser.uid, otherUserId].sort().join("_") : ""
  
  const otherUserRef = useMemoFirebase(() => otherUserId ? doc(firestore, "userProfiles", otherUserId) : null, [firestore, otherUserId])
  const { data: otherUser, isLoading: isOtherUserLoading } = useDoc(otherUserRef)

  const currentUserProfileRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: currentUserProfile } = useDoc(currentUserProfileRef)

  // Block logic
  const myBlockRef = useMemoFirebase(() => currentUser && otherUserId ? doc(firestore, "userProfiles", currentUser.uid, "blockedUsers", otherUserId) : null, [firestore, currentUser, otherUserId])
  const { data: iBlockedThem } = useDoc(myBlockRef)

  const theirBlockRef = useMemoFirebase(() => currentUser && otherUserId ? doc(firestore, "userProfiles", otherUserId, "blockedUsers", currentUser.uid) : null, [firestore, currentUser, otherUserId])
  const { data: theyBlockedMe } = useDoc(theirBlockRef)

  const isBlocked = !!iBlockedThem || !!theyBlockedMe

  useEffect(() => {
    if (typeof window !== "undefined") {
      import('@zegocloud/zego-uikit-prebuilt').then((module) => {
        ZegoUIKitPrebuilt = module.ZegoUIKitPrebuilt;
      });
    }
  }, []);

  const stopAllMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    if (zegoInstance) {
      try { 
        zegoInstance.destroy(); 
      } catch (e) { 
        console.error("Zego destroy error", e); 
      }
      setZegoInstance(null);
    }
  };

  useEffect(() => { 
    return () => stopAllMedia(); 
  }, []);

  const initiateZegoCall = async (roomID: string) => {
    if (!ZegoUIKitPrebuilt || !currentUser || !zegoContainerRef.current) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });
      localStreamRef.current = stream;
      setHasPermissionError(false);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setHasPermissionError(true);
      toast({
        variant: 'destructive',
        title: 'Call Access Denied',
        description: `Please enable ${callType === 'video' ? 'camera and ' : ''}microphone permissions in your browser settings to continue.`,
      });
      handleEndCall();
      return;
    }

    const { appID, serverSecret } = await getZegoConfig();
    if (!appID || !serverSecret) {
      toast({ variant: "destructive", title: "Config Error", description: "ZegoCloud configuration is missing." });
      handleEndCall();
      return;
    }

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
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
        },
        turnOnMicrophoneWhenJoining: true,
        turnOnCameraWhenJoining: callType === 'video',
        showMyCameraToggleButton: callType === 'video',
        showMyMicrophoneToggleButton: true,
        showAudioVideoSettingsButton: true,
        showScreenSharingButton: false,
        showTextChat: false,
        showUserList: false,
        showLeaveRoomConfirmDialog: true,
        showOnlyAudioUser: true,
        maxUsers: 2,
        layout: "Auto",
        onJoinRoom: () => {
          console.log("Joined Zego room");
        },
        onLeaveRoom: () => {
          console.log("Left Zego room");
          handleEndCall();
        },
      });
    } catch (error) {
      console.error("Zego join error:", error);
      toast({ variant: "destructive", title: "Call Error", description: "Failed to join the call room." });
      handleEndCall();
    }
  };

  useEffect(() => {
    if (!database || !chatId || !currentUser || isBlocked) return
    const callRef = ref(database, `calls/${chatId}`)
    return onValue(callRef, (snap) => {
      const data = snap.val()
      
      if (!data) {
        if (callStatus !== 'idle') { 
          stopAllMedia(); 
          setCallStatus('idle'); 
        }
        return
      }

      setCallType(data.callType || 'video')
      
      if (data.status === 'ringing') {
        if (data.callerId === currentUser.uid) {
          setCallStatus('calling')
        } else {
          setCallStatus('incoming')
        }
      } else if (data.status === 'accepted') {
        if (callStatus !== 'ongoing') {
          setCallStatus('ongoing')
          initiateZegoCall(chatId);
        }
      } else if (data.status === 'declined' || data.status === 'ended') {
        stopAllMedia(); 
        setCallStatus('idle');
      }
    })
  }, [database, chatId, currentUser, callStatus, callType, isBlocked]);

  const handleInitiateCall = (type: 'video' | 'audio') => {
    if (!database || !chatId || !currentUser || isBlocked) return
    const callRef = ref(database, `calls/${chatId}`)
    set(callRef, { 
      callerId: currentUser.uid, 
      receiverId: otherUserId, 
      status: 'ringing', 
      callType: type, 
      timestamp: Date.now(),
      callerName: currentUser.displayName || 'Someone'
    })
  }

  const handleAcceptCall = () => {
    if (!database || !chatId) return
    const callRef = ref(database, `calls/${chatId}`)
    update(callRef, { status: 'accepted' })
  }

  const handleDeclineCall = () => {
    if (!database || !chatId) return
    remove(ref(database, `calls/${chatId}`))
    setCallStatus('idle')
    stopAllMedia();
  }

  const handleEndCall = () => {
    if (!database || !chatId) return
    remove(ref(database, `calls/${chatId}`))
    stopAllMedia(); 
    setCallStatus('idle')
  }

  useEffect(() => {
    if (!database || !otherUserId) return
    const presenceRef = ref(database, `users/${otherUserId}/presence`)
    return onValue(presenceRef, (snap) => setPresence(snap.val() || { online: false }))
  }, [database, otherUserId])

  useEffect(() => {
    if (!database || !chatId) return
    const messagesRef = ref(database, `chats/${chatId}/messages`)
    return onValue(messagesRef, (snapshot) => {
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

    const isFree = currentUserProfile.isAdmin || 
                   currentUserProfile.isSupport || 
                   currentUserProfile.isCoinseller ||
                   otherUser.isSupport ||
                   otherUser.isCoinseller;

    try {
      if (!isFree) {
        await runTransaction(firestore, async (transaction) => {
          const userDoc = await transaction.get(doc(firestore, "userProfiles", currentUser.uid));
          if (!userDoc.exists()) throw new Error("Profile not found");
          
          const currentBalance = userDoc.data().coinBalance || 0;
          if (currentBalance < 1) throw new Error("INSUFFICIENT_COINS");
          
          transaction.update(doc(firestore, "userProfiles", currentUser.uid), {
            coinBalance: currentBalance - 1,
            updatedAt: new Date().toISOString()
          });

          const txRef = doc(collection(firestore, "userProfiles", currentUser.uid, "transactions"));
          transaction.set(txRef, {
            id: txRef.id,
            type: "deduction",
            amount: -1,
            transactionDate: new Date().toISOString(),
            description: `Sent message to ${otherUser.username}`
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
          title: "Insufficient Coins",
          description: "Recharge to continue chatting.",
          action: <Button onClick={() => router.push('/recharge')} size="sm">Recharge</Button>
        });
      }
    } finally {
      setIsSending(false)
    }
  }

  if (isOtherUserLoading) return <div className="flex items-center justify-center h-svh bg-white"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  if (!otherUser) return <div className="p-10 text-center bg-white h-svh flex items-center justify-center"><Button onClick={() => router.push('/discover')}>Back</Button></div>

  const otherUserImage = (otherUser.profilePhotoUrls && otherUser.profilePhotoUrls[0]) || `https://picsum.photos/seed/${otherUser.id}/200/200`

  return (
    <div className="flex flex-col h-svh bg-white relative overflow-hidden text-gray-900">
      <div 
        ref={zegoContainerRef} 
        className={cn(
          "absolute inset-0 z-[200] bg-black transition-opacity duration-300", 
          callStatus === 'ongoing' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )} 
      />

      {(callStatus === 'calling' || callStatus === 'incoming') && (
        <div className="absolute inset-0 z-[300] bg-black flex flex-col items-center justify-between py-24 px-8 text-white">
          <div className="flex flex-col items-center gap-6 mt-10">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-white/10 shadow-2xl">
                <AvatarImage src={otherUserImage} className="object-cover" />
                <AvatarFallback>{otherUser.username?.[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -inset-4 bg-primary/20 rounded-full animate-pulse -z-10" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black font-headline">{otherUser.username}</h2>
              <p className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] animate-pulse">
                {callStatus === 'calling' ? `Calling (${callType})...` : `Incoming ${callType} call...`}
              </p>
            </div>
            
            {hasPermissionError && (
              <Alert variant="destructive" className="mt-4 bg-red-900/50 border-red-500 text-white">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Permission Required</AlertTitle>
                <AlertDescription>
                  Please allow camera and microphone access to start the call.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex items-center gap-12 mb-10">
            {callStatus === 'incoming' ? (
              <>
                <button 
                  onClick={handleDeclineCall}
                  className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-xl active:scale-90 transition-transform"
                >
                  <PhoneOff className="w-6 h-6 text-white" />
                </button>
                <button 
                  onClick={handleAcceptCall}
                  className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-xl active:scale-90 transition-transform"
                >
                  <Phone className="w-6 h-6 text-white" />
                </button>
              </>
            ) : (
              <button 
                onClick={handleEndCall}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-xl active:scale-90 transition-transform"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
            )}
          </div>
        </div>
      )}

      <header className="px-5 pt-8 pb-4 bg-white flex items-center justify-between sticky top-0 z-10 border-b border-gray-50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="h-10 w-10 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 border border-gray-100 shadow-sm">
            <AvatarImage src={otherUserImage} className="object-cover" />
            <AvatarFallback>{otherUser.username?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-center">
            <h3 className="font-bold text-[13px] text-gray-900 leading-none mb-1">{otherUser.username}</h3>
            <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">
              {presence.online ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100"
        >
          <MoreVertical className="w-5 h-5" />
        </Button>
      </header>

      <ScrollArea className="flex-1 px-4 py-4 bg-white">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.uid
            return (
              <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] px-4 py-3 text-[13px] font-medium leading-relaxed shadow-sm",
                  isMe ? "bg-primary text-white rounded-[1.5rem] rounded-tr-none" : "bg-gray-100 text-gray-900 rounded-[1.5rem] rounded-tl-none"
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
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
              <Ban className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-red-500">
              {iBlockedThem ? "You have blocked this user" : "Chat restricted, you have been blocked"}
            </p>
          </div>
        ) : (
          <>
            <div className="relative group">
              <Input 
                value={inputText} 
                onChange={(e) => setInputText(e.target.value)} 
                placeholder="Flow A Message..." 
                className="rounded-full h-12 bg-gray-50 border-none px-6 text-[13px] text-gray-900 placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-primary/20 shadow-inner" 
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
              />
              <Button 
                size="icon" 
                className={cn(
                  "absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full w-9 h-9 transition-all",
                  inputText.trim() && !isSending ? "bg-primary text-white" : "bg-gray-200 text-gray-400"
                )} 
                onClick={() => handleSendMessage()} 
                disabled={!inputText.trim() || isSending}
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => handleInitiateCall('audio')}
                className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 h-16 rounded-2xl border border-gray-100 active:bg-gray-100 transition-all shadow-sm"
              >
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Voice</span>
              </button>

              <button 
                onClick={() => handleInitiateCall('video')}
                className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 h-16 rounded-2xl border border-gray-100 active:bg-gray-100 transition-all shadow-sm"
              >
                <Video className="w-4 h-4 text-gray-500" />
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Video</span>
              </button>

              <button 
                className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 h-16 rounded-2xl border border-gray-100 active:bg-gray-100 transition-all shadow-sm"
              >
                <Gift className="w-4 h-4 text-primary" />
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Gift</span>
              </button>
            </div>
          </>
        )}
      </footer>
    </div>
  )
}
