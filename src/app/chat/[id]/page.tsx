"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Video, Send, Phone, Loader2, MoreVertical, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { ref, push, onValue, serverTimestamp as rtdbTimestamp, update, set, remove } from "firebase/database"
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
  
  const [inputText, setInputText] = useState("")
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'calling' | 'ongoing' | 'incoming'>('idle')
  const [callType, setCallType] = useState<'video' | 'audio'>('video')
  const [zegoInstance, setZegoInstance] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [presence, setPresence] = useState<{ online: boolean; lastSeen?: number }>({ online: false })
  
  const chatId = currentUser && otherUserId ? [currentUser.uid, otherUserId].sort().join("_") : ""
  const otherUserRef = useMemoFirebase(() => otherUserId ? doc(firestore, "userProfiles", otherUserId) : null, [firestore, otherUserId])
  const { data: otherUser, isLoading: isOtherUserLoading } = useDoc(otherUserRef)

  useEffect(() => {
    if (typeof window !== "undefined") {
      import('@zegocloud/zego-uikit-prebuilt').then((module) => {
        ZegoUIKitPrebuilt = module.ZegoUIKitPrebuilt;
      });
    }
  }, []);

  const stopAllMedia = () => {
    if (zegoInstance) {
      try { zegoInstance.destroy(); } catch (e) {}
      setZegoInstance(null);
    }
  };

  useEffect(() => { return () => stopAllMedia(); }, []);

  const initiateZegoCall = async (roomID: string) => {
    if (!ZegoUIKitPrebuilt || !currentUser || !zegoContainerRef.current) return;
    const { appID, serverSecret } = await getZegoConfig();
    if (!appID || !serverSecret) {
      toast({ variant: "destructive", title: "Config Missing" });
      handleEndCall();
      return;
    }
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, roomID, currentUser.uid, currentUser.displayName || `User_${currentUser.uid.slice(0, 5)}`);
    const zp = ZegoUIKitPrebuilt.create(kitToken);
    setZegoInstance(zp);
    zp.joinRoom({
      container: zegoContainerRef.current,
      mode: ZegoUIKitPrebuilt.OneONoneCall,
      showPreJoinView: false,
      turnOnMicrophoneWhenJoining: true,
      turnOnCameraWhenJoining: callType === 'video',
      onLeaveRoom: () => handleEndCall(),
    });
  };

  useEffect(() => {
    if (!database || !chatId || !currentUser) return
    const callRef = ref(database, `calls/${chatId}`)
    return onValue(callRef, (snap) => {
      const data = snap.val()
      if (!data) {
        if (callStatus !== 'idle') { stopAllMedia(); setCallStatus('idle'); }
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
        stopAllMedia(); setCallStatus('idle'); remove(callRef);
      }
    })
  }, [database, chatId, currentUser, otherUser, callStatus]);

  const handleInitiateCall = (type: 'video' | 'audio') => {
    if (!database || !chatId || !currentUser) return
    const callRef = ref(database, `calls/${chatId}`)
    set(callRef, { callerId: currentUser.uid, receiverId: otherUserId, status: 'ringing', callType: type, timestamp: Date.now() })
  }

  const handleEndCall = () => {
    if (!database || !chatId) return
    remove(ref(database, `calls/${chatId}`))
    stopAllMedia(); setCallStatus('idle')
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

  const handleSendMessage = () => {
    if (!inputText.trim() || !currentUser || !chatId || !database || !otherUserId) return
    const updates: any = {}
    const msgKey = push(ref(database, `chats/${chatId}/messages`)).key
    const msgData = { messageText: inputText, senderId: currentUser.uid, sentAt: rtdbTimestamp() }
    updates[`/chats/${chatId}/messages/${msgKey}`] = msgData
    updates[`/users/${currentUser.uid}/chats/${otherUserId}`] = { lastMessage: inputText, timestamp: rtdbTimestamp(), otherUserId, chatId }
    updates[`/users/${otherUserId}/chats/${currentUser.uid}`] = { lastMessage: inputText, timestamp: rtdbTimestamp(), otherUserId: currentUser.uid, chatId }
    update(ref(database), updates)
    setInputText("")
  }

  if (isOtherUserLoading) return <div className="flex items-center justify-center h-svh bg-white"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  if (!otherUser) return <div className="p-10 text-center bg-white h-svh flex items-center justify-center"><Button onClick={() => router.push('/discover')}>Back</Button></div>

  const otherUserImage = (otherUser.profilePhotoUrls && otherUser.profilePhotoUrls[0]) || `https://picsum.photos/seed/${otherUser.id}/200/200`

  return (
    <div className="flex flex-col h-svh bg-white relative overflow-hidden text-gray-900">
      {/* ZEGO Container for Calls */}
      <div ref={zegoContainerRef} className={cn("absolute inset-0 z-[100] bg-black", callStatus === 'ongoing' ? 'block' : 'hidden')} />

      {/* Header Redesigned */}
      <header className="px-6 pt-10 pb-4 bg-white flex items-center justify-between sticky top-0 z-10 border-b border-gray-50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="h-10 w-10 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border border-gray-100 shadow-sm">
            <AvatarImage src={otherUserImage} className="object-cover" />
            <AvatarFallback>{otherUser.username?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h3 className="font-bold text-xs text-gray-900">{otherUser.username}</h3>
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

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.uid
            return (
              <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] px-4 py-2.5 text-[13px] font-medium leading-relaxed shadow-sm",
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

      {/* Footer Redesigned */}
      <footer className="px-5 py-5 pb-8 space-y-4 bg-white border-t border-gray-50">
        {/* Input Bar */}
        <div className="relative group">
          <Input 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)} 
            placeholder="Flow A Message..." 
            className="rounded-full h-12 bg-gray-50 border-none px-6 text-[13px] text-gray-900 placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-primary/20" 
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
          />
          <Button 
            size="icon" 
            className={cn(
              "absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full w-9 h-9 transition-all",
              inputText.trim() ? "bg-primary text-white" : "bg-gray-200 text-gray-400"
            )} 
            onClick={() => handleSendMessage()} 
            disabled={!inputText.trim()}
          >
            <Send className="w-4 h-4 rotate-45" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => handleInitiateCall('audio')}
            className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 h-16 rounded-2xl border border-gray-100 active:bg-gray-100 transition-all"
          >
            <Phone className="w-4 h-4 text-gray-500" />
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Voice</span>
          </button>

          <button 
            onClick={() => handleInitiateCall('video')}
            className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 h-16 rounded-2xl border border-gray-100 active:bg-gray-100 transition-all"
          >
            <Video className="w-4 h-4 text-gray-500" />
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Video</span>
          </button>

          <button 
            className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 h-16 rounded-2xl border border-gray-100 active:bg-gray-100 transition-all"
          >
            <Gift className="w-4 h-4 text-primary" />
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Gift</span>
          </button>
        </div>
      </footer>
    </div>
  )
}
