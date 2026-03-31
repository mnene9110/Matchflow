
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Video, Send, Mic, Image as ImageIcon, Phone, Gift, Hash, Smile, Loader2, MoreVertical, X, PhoneOff, MicOff, Camera, VideoOff } from "lucide-react"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

export default function ChatDetailPage() {
  const params = useParams()
  const otherUserId = params?.id as string
  const { user: currentUser } = useUser()
  const { firestore, database } = useFirebase()
  const router = useRouter()
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  const [inputText, setInputText] = useState("")
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>(["Hey! How's your day?", "What are your hobbies?", "Tell me something interesting!"])
  
  // Call States
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'calling' | 'ongoing' | 'incoming'>('idle')
  const [callType, setCallType] = useState<'video' | 'audio'>('video')
  const [hasCameraPermission, setHasCameraPermission] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const [messages, setMessages] = useState<any[]>([])
  const [presence, setPresence] = useState<{ online: boolean; lastSeen?: number }>({ online: false })
  
  const chatId = currentUser && otherUserId ? [currentUser.uid, otherUserId].sort().join("_") : ""

  // Use unified 'users' collection
  const otherUserRef = useMemoFirebase(() => otherUserId ? doc(firestore, "users", otherUserId) : null, [firestore, otherUserId])
  const { data: otherUser, isLoading: isOtherUserLoading } = useDoc(otherUserRef)

  // Signaling Listener for Calls
  useEffect(() => {
    if (!database || !chatId || !currentUser) return
    const callRef = ref(database, `calls/${chatId}`)
    return onValue(callRef, (snap) => {
      const data = snap.val()
      if (!data) {
        if (callStatus !== 'idle') {
          stopStream()
          setCallStatus('idle')
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
      } else if (data.status === 'declined') {
        stopStream()
        setCallStatus('idle')
        remove(callRef)
        toast({ title: "Call Declined", description: `${otherUser?.username || 'User'} is busy.` })
      }
    })
  }, [database, chatId, currentUser, otherUser, callStatus])

  // Camera Access
  const enableMedia = async (type: 'video' | 'audio') => {
    try {
      const constraints = { 
        video: type === 'video', 
        audio: true 
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)
      setHasCameraPermission(true)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      
      // Initialize states
      if (type === 'audio') setIsVideoOff(true)
    } catch (error) {
      console.error('Error accessing media:', error)
      setHasCameraPermission(false)
      toast({
        variant: 'destructive',
        title: 'Media Access Denied',
        description: 'Please enable camera/mic permissions to use calls.',
      })
    }
  }

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // Toggle Mute
  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted
      })
    }
  }, [isMuted, stream])

  // Toggle Video
  useEffect(() => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoOff
      })
    }
  }, [isVideoOff, stream])

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
    enableMedia(type)
  }

  const handleAcceptCall = () => {
    if (!database || !chatId) return
    const callRef = ref(database, `calls/${chatId}`)
    update(callRef, { status: 'accepted' })
    enableMedia(callType)
  }

  const handleDeclineCall = () => {
    if (!database || !chatId) return
    const callRef = ref(database, `calls/${chatId}`)
    update(callRef, { status: 'declined' })
    stopStream()
  }

  const handleEndCall = () => {
    if (!database || !chatId) return
    const callRef = ref(database, `calls/${chatId}`)
    remove(callRef)
    stopStream()
  }

  // Presence Listener
  useEffect(() => {
    if (!database || !otherUserId) return
    const presenceRef = ref(database, `users/${otherUserId}/presence`)
    return onValue(presenceRef, (snap) => {
      const val = snap.val()
      setPresence(val || { online: false })
    })
  }, [database, otherUserId])

  // Messages Listener
  useEffect(() => {
    if (!database || !chatId) return
    const messagesRef = ref(database, `chats/${chatId}/messages`)
    return onValue(messagesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const msgList = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          ...val
        }))
        msgList.sort((a, b) => (a.sentAt || 0) - (b.sentAt || 0))
        setMessages(msgList)
      } else {
        setMessages([])
      }
    })
  }, [database, chatId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
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
  if (!otherUser) return <div className="flex flex-col items-center justify-center h-svh p-6"><h2 className="text-2xl font-bold mb-4 font-headline">User Offline</h2><Button onClick={() => router.push('/discover')}>Go Back</Button></div>

  const otherUserImage = (otherUser.profilePhotoUrls && otherUser.profilePhotoUrls[0]) || `https://picsum.photos/seed/${otherUser.id}/400/600`
  const currentUserImage = `https://picsum.photos/seed/${currentUser?.uid}/200/200`

  return (
    <div className="flex flex-col h-svh bg-slate-50 relative overflow-hidden">
      {/* Immersive Call Overlay */}
      {callStatus !== 'idle' && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col animate-in fade-in zoom-in duration-500">
          <div className="relative flex-1 flex flex-col">
            {/* Background Blur */}
            <div className="absolute inset-0 z-0">
               <img src={otherUserImage} className="w-full h-full object-cover blur-3xl opacity-40 scale-110" alt="bg" />
            </div>

            {/* Remote/Main Video Area */}
            <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-6 text-center text-white">
              {callStatus === 'ongoing' ? (
                <div className="w-full h-full bg-slate-900/50 rounded-[3rem] overflow-hidden relative shadow-2xl">
                  {/* Remote Stream Placeholder */}
                  <img src={otherUserImage} className="w-full h-full object-cover opacity-60" alt="Remote" />
                  <div className="absolute bottom-6 left-6 text-left">
                     <h2 className="text-2xl font-black font-headline">{otherUser.username}</h2>
                     <p className="text-xs font-bold text-white/40 uppercase tracking-widest">
                       {callType === 'video' ? 'Video Connected' : 'Audio Connected'}
                     </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-pulse">
                  <Avatar className="w-32 h-32 border-4 border-white/20 shadow-2xl mx-auto ring-4 ring-primary/20">
                    <AvatarImage src={otherUserImage} className="object-cover" />
                  </Avatar>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black font-headline">{otherUser.username}</h2>
                    <p className="text-sm font-bold text-white/40 uppercase tracking-widest">
                      {callStatus === 'incoming' ? `Incoming ${callType} Call...` : `Ringing ${callType}...`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Local Preview (PiP) */}
            <div className="absolute top-10 right-6 w-32 aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 z-20 transition-all">
               {isVideoOff ? (
                 <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <Avatar className="w-16 h-16 border-2 border-white/20">
                      <AvatarImage src={currentUserImage} className="object-cover" />
                    </Avatar>
                 </div>
               ) : (
                 <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
               )}
               {!hasCameraPermission && !isVideoOff && (
                 <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <Camera className="w-6 h-6 text-white/20" />
                 </div>
               )}
            </div>

            {/* Call Controls */}
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
                <div className="bg-white/10 backdrop-blur-2xl rounded-full px-6 py-4 flex items-center gap-6 shadow-2xl border border-white/10">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsMuted(!isMuted)} 
                    className={cn("rounded-full w-12 h-12 transition-all", isMuted ? "bg-red-500 text-white" : "text-white hover:bg-white/10")}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>
                  
                  <Button onClick={handleEndCall} variant="destructive" className="rounded-full w-16 h-16 shadow-2xl transition-transform hover:scale-105 active:scale-95">
                    <PhoneOff className="w-7 h-7" />
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsVideoOff(!isVideoOff)} 
                    className={cn("rounded-full w-12 h-12 transition-all", isVideoOff ? "bg-red-500 text-white" : "text-white hover:bg-white/10")}
                  >
                    {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Layout */}
      <header className="px-4 py-3 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-white shadow-sm ring-2 ring-primary/10">
              <AvatarImage src={otherUserImage} className="object-cover" />
              <AvatarFallback>{otherUser.username?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <h3 className="font-bold text-sm leading-none font-headline">{otherUser.username}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={cn("w-2 h-2 rounded-full transition-all duration-500", presence.online ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-300")} />
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tight">{presenceText}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary rounded-full" onClick={() => handleInitiateCall('audio')}>
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary rounded-full" onClick={() => handleInitiateCall('video')}>
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary rounded-full">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-6">
          <div className="mx-auto max-w-[95%] bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 space-y-3">
            <div className="flex items-center justify-center gap-2">
               <Badge className="bg-primary hover:bg-primary text-white text-[10px] rounded-full px-3 py-0.5">
                  {otherUser.gender === 'female' ? '♀' : '♂'} · {otherUser.location || "Nearby"}
               </Badge>
               <Badge variant="outline" className="text-[10px] rounded-full px-3 py-0.5 border-primary/20 text-primary">
                 ID: {otherUser.numericId || '...'}
               </Badge>
            </div>
            <p className="text-[11px] text-center text-gray-500 font-medium leading-relaxed italic">
              "{(otherUser.bio || "Finding my flow on MatchFlow.")?.slice(0, 100)}..."
            </p>
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
        </div>
      </ScrollArea>

      <footer className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {aiSuggestions.map((suggestion, idx) => (
            <button key={idx} className="rounded-full border border-primary/20 text-primary text-[11px] h-8 px-4 font-bold shrink-0 hover:bg-primary/5 transition-all bg-white shadow-sm" onClick={() => setInputText(suggestion)}>{suggestion}</button>
          ))}
          <Button variant="ghost" size="sm" className="bg-primary/10 hover:bg-primary/20 text-primary rounded-full h-8 px-4 font-black text-xs shrink-0 flex items-center gap-1.5" onClick={async () => {
              setIsAiLoading(true)
              try {
                const res = await generateConversationStarters({ otherUserBio: otherUser.bio || "A new user.", otherUserInterests: otherUser.interests || [] })
                setAiSuggestions(res.suggestions)
              } finally { setIsAiLoading(false) }
            }} disabled={isAiLoading}>
            {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Spark it ✨"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="rounded-full text-gray-400 hover:text-primary shrink-0"><Mic className="w-5 h-5" /></Button>
          <Input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Start typing..." className="rounded-full h-12 bg-slate-50 border-none px-5 text-sm font-medium" onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
          <Button size="icon" className={cn("rounded-full w-12 h-12 transition-all shadow-xl", inputText.trim() ? "bg-primary text-white" : "bg-gray-200 text-gray-400")} onClick={() => handleSendMessage()} disabled={!inputText.trim()}><Send className="w-5 h-5 rotate-45" /></Button>
        </div>
      </footer>
    </div>
  )
}
