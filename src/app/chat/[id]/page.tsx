
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Video, Send, Mic, MoreVertical, Phone, PhoneOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { generateConversationStarters } from "@/ai/flows/ai-conversation-starter"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { ref, push, onValue, serverTimestamp as rtdbTimestamp, update, set, remove } from "firebase/database"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// We'll load the Zego library dynamically to avoid SSR issues
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
  
  const [inputText, setInputText] = useState("")
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>(["Hey! How's your day?", "What are your hobbies?", "Tell me something interesting!"])
  
  // Call States
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'calling' | 'ongoing' | 'incoming'>('idle')
  const [callType, setCallType] = useState<'video' | 'audio'>('video')
  const [zegoInstance, setZegoInstance] = useState<any>(null)

  const [messages, setMessages] = useState<any[]>([])
  const [presence, setPresence] = useState<{ online: boolean; lastSeen?: number }>({ online: false })
  
  const chatId = currentUser && otherUserId ? [currentUser.uid, otherUserId].sort().join("_") : ""

  const otherUserRef = useMemoFirebase(() => otherUserId ? doc(firestore, "users", otherUserId) : null, [firestore, otherUserId])
  const { data: otherUser, isLoading: isOtherUserLoading } = useDoc(otherUserRef)

  // Load Zego Library on Mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      import('@zegocloud/zego-uikit-prebuilt').then((module) => {
        ZegoUIKitPrebuilt = module.ZegoUIKitPrebuilt;
      });
    }
  }, []);

  // Comprehensive Resource Cleanup
  const stopAllMedia = async () => {
    if (zegoInstance) {
      try {
        zegoInstance.destroy();
      } catch (e) {
        console.error("Cleanup error", e);
      }
      setZegoInstance(null);
    }
    // Explicitly kill any orphaned tracks
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
      stream?.getTracks().forEach(track => track.stop());
    } catch(e) {}
  };

  useEffect(() => {
    return () => {
      stopAllMedia();
    }
  }, [zegoInstance]);

  // Signaling Listener
  useEffect(() => {
    if (!database || !chatId || !currentUser) return
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

      if (data.status === 'ringing' && data.callerId !== currentUser.uid) {
        setCallStatus('incoming')
      } else if (data.status === 'ringing' && data.callerId === currentUser.uid) {
        setCallStatus('calling')
      } else if (data.status === 'accepted') {
        setCallStatus('ongoing')
        initiateZegoCall(chatId);
      } else if (data.status === 'declined') {
        stopAllMedia();
        setCallStatus('idle')
        remove(callRef)
        toast({ title: "Call Declined", description: `${otherUser?.username || 'User'} is unavailable.` })
      }
    })
  }, [database, chatId, currentUser, otherUser, callStatus]);

  const initiateZegoCall = async (roomID: string) => {
    if (!ZegoUIKitPrebuilt || !currentUser || !zegoContainerRef.current) return;

    const appID = Number(process.env.NEXT_PUBLIC_ZEGO_APP_ID);
    const serverSecret = process.env.NEXT_PUBLIC_ZEGO_SERVER_SECRET;

    if (!appID || !serverSecret) {
      toast({ 
        variant: "destructive", 
        title: "Call Configuration Missing", 
        description: "Please set your Zego AppID and ServerSecret in the environment variables." 
      });
      handleEndCall();
      return;
    }

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
      mode: ZegoUIKitPrebuilt.OneONoneCall,
      showPreJoinView: false,
      turnOnMicrophoneWhenJoining: true,
      turnOnCameraWhenJoining: callType === 'video',
      showMyCameraToggleButton: true,
      showMyMicrophoneToggleButton: true,
      showAudioVideoSettingsButton: false,
      showTextChat: false,
      showUserList: false,
      onLeaveRoom: () => {
        handleEndCall();
      },
    });
  };

  const handleInitiateCall = (type: 'video' | 'audio') => {
    if (!database || !chatId || !currentUser) return
    setCallType(type)
    const callRef = ref(database, `calls/${chatId}`)
    set(callRef, {
      callerId: currentUser.uid,
      receiverId: otherUserId,
      status: 'ringing',
      callType: type,
      timestamp: Date.now()
    })
  }

  const handleAcceptCall = () => {
    if (!database || !chatId) return
    const callRef = ref(database, `calls/${chatId}`)
    update(callRef, { status: 'accepted' })
  }

  const handleDeclineCall = () => {
    if (!database || !chatId) return
    const callRef = ref(database, `calls/${chatId}`)
    update(callRef, { status: 'declined' })
    stopAllMedia();
    setCallStatus('idle')
  }

  const handleEndCall = () => {
    if (!database || !chatId) return
    const callRef = ref(database, `calls/${chatId}`)
    remove(callRef)
    stopAllMedia();
    setCallStatus('idle')
  }

  // Presence & Message Listeners
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
      } else {
        setMessages([])
      }
    })
  }, [database, chatId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const presenceText = useMemo(() => {
    if (presence.online) return "Online";
    if (!presence.lastSeen) return "Offline";
    const date = new Date(presence.lastSeen);
    const now = new Date();
    const diffInDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (diffInDays > 2) return "Offline";
    return `Last seen ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [presence]);

  const handleSendMessage = (text = inputText) => {
    if (!text.trim() || !currentUser || !chatId || !database || !otherUserId) return
    const updates: any = {}
    const msgKey = push(ref(database, `chats/${chatId}/messages`)).key
    const msgData = { messageText: text, senderId: currentUser.uid, sentAt: rtdbTimestamp() }
    updates[`/chats/${chatId}/messages/${msgKey}`] = msgData
    updates[`/users/${currentUser.uid}/chats/${otherUserId}`] = { lastMessage: text, timestamp: rtdbTimestamp(), otherUserId, chatId }
    updates[`/users/${otherUserId}/chats/${currentUser.uid}`] = { lastMessage: text, timestamp: rtdbTimestamp(), otherUserId: currentUser.uid, chatId }
    update(ref(database), updates)
    setInputText("")
  }

  if (isOtherUserLoading) return <div className="flex items-center justify-center h-svh bg-white"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  if (!otherUser) return <div className="flex flex-col items-center justify-center h-svh p-6"><h2 className="text-2xl font-bold mb-4 font-headline">User Not Found</h2><Button onClick={() => router.push('/discover')}>Go Back</Button></div>

  const otherUserImage = (otherUser.profilePhotoUrls && otherUser.profilePhotoUrls[0]) || `https://picsum.photos/seed/${otherUser.id}/400/600`

  return (
    <div className="flex flex-col h-svh bg-slate-50 relative overflow-hidden">
      {/* Immersive Call Overlay */}
      {callStatus !== 'idle' && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col animate-in fade-in zoom-in duration-500">
          <div className="relative flex-1 flex flex-col">
            <div className="absolute inset-0 z-0 opacity-40">
               <img src={otherUserImage} className="w-full h-full object-cover blur-3xl scale-110" alt="bg" />
            </div>

            {callStatus !== 'ongoing' && (
              <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-6 text-center text-white">
                <Avatar className="w-32 h-32 border-4 border-white/20 shadow-2xl mx-auto ring-4 ring-primary/20 animate-pulse">
                  <AvatarImage src={otherUserImage} className="object-cover" />
                </Avatar>
                <div className="mt-6 space-y-2">
                  <h2 className="text-3xl font-black font-headline">{otherUser.username}</h2>
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest">
                    {callStatus === 'incoming' ? `Incoming ${callType} Call...` : `Ringing ${callType}...`}
                  </p>
                </div>
              </div>
            )}

            <div ref={zegoContainerRef} className={cn("flex-1 z-10 bg-transparent", callStatus !== 'ongoing' && "hidden")} />

            <div className="relative z-20 px-8 pb-12 pt-6 flex justify-center gap-6">
              {callStatus === 'incoming' ? (
                <>
                  <Button onClick={handleAcceptCall} className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl scale-110">
                    {callType === 'video' ? <Video className="w-7 h-7 fill-white" /> : <Phone className="w-7 h-7 fill-white" />}
                  </Button>
                  <Button onClick={handleDeclineCall} variant="destructive" className="w-16 h-16 rounded-full shadow-2xl scale-110">
                    <PhoneOff className="w-7 h-7" />
                  </Button>
                </>
              ) : (
                <Button onClick={handleEndCall} variant="destructive" className="rounded-full w-16 h-16 shadow-2xl">
                  <PhoneOff className="w-7 h-7" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-4 py-3 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full"><ChevronLeft className="w-6 h-6 text-gray-700" /></Button>
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-white shadow-sm ring-2 ring-primary/10">
              <AvatarImage src={otherUserImage} className="object-cover" />
              <AvatarFallback>{otherUser.username?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <h3 className="font-bold text-sm leading-none font-headline">{otherUser.username}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={cn("w-2 h-2 rounded-full", presence.online ? "bg-green-500 animate-pulse" : "bg-gray-300")} />
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tight">{presenceText}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary" onClick={() => handleInitiateCall('audio')}><Phone className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary" onClick={() => handleInitiateCall('video')}><Video className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" className="text-gray-400"><MoreVertical className="w-5 h-5" /></Button>
        </div>
      </header>

      <ScrollArea className="flex-1 px-4 py-4">
        <div className="mx-auto max-w-[95%] bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6 text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
               <Badge className="bg-primary text-white text-[10px] rounded-full px-3 py-0.5">{otherUser.gender === 'female' ? '♀' : '♂'} · {otherUser.location || "Nearby"}</Badge>
               <Badge variant="outline" className="text-[10px] rounded-full px-3 py-0.5 border-primary/20 text-primary">ID: {otherUser.numericId || '...'}</Badge>
            </div>
            <p className="text-[11px] text-gray-500 italic">"{(otherUser.bio || "Finding my flow on MatchFlow.")?.slice(0, 100)}..."</p>
        </div>

        <div className="flex flex-col gap-4">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.uid
            return (
              <div key={msg.id} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300", isMe ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[75%] px-4 py-3 shadow-md text-sm relative transition-all",
                  isMe ? "bg-primary text-white rounded-3xl rounded-tr-none" : "bg-white text-gray-800 rounded-3xl rounded-tl-none border border-gray-100"
                )}>
                  <p className="leading-relaxed font-medium whitespace-pre-wrap">{msg.messageText}</p>
                  {msg.sentAt && <span className={cn("text-[9px] block mt-1 text-right", isMe ? "text-white/60" : "text-gray-400")}>{new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                </div>
              </div>
            )
          })}
          <div ref={scrollRef} className="h-4" />
        </div>
      </ScrollArea>

      <footer className="p-4 bg-white border-t border-gray-100 shadow-lg space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {aiSuggestions.map((suggestion, idx) => (
            <button key={idx} className="rounded-full border border-primary/20 text-primary text-[11px] h-8 px-4 font-bold shrink-0 bg-white hover:bg-primary/5 transition-all" onClick={() => setInputText(suggestion)}>{suggestion}</button>
          ))}
          <Button variant="ghost" size="sm" className="bg-primary/10 text-primary rounded-full h-8 px-4 font-black text-xs shrink-0" onClick={async () => {
              setIsAiLoading(true)
              try {
                const res = await generateConversationStarters({ otherUserBio: otherUser.bio || "A new user.", otherUserInterests: otherUser.interests || [] })
                setAiSuggestions(res.suggestions)
              } finally { setIsAiLoading(false) }
            }} disabled={isAiLoading}>
            {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Spark ✨"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Type a message..." className="rounded-full h-12 bg-slate-50 border-none px-5 text-sm font-medium" onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
          <Button size="icon" className={cn("rounded-full w-12 h-12 transition-all", inputText.trim() ? "bg-primary text-white shadow-xl" : "bg-gray-200 text-gray-400")} onClick={() => handleSendMessage()} disabled={!inputText.trim()}><Send className="w-5 h-5 rotate-45" /></Button>
        </div>
      </footer>
    </div>
  )
}
