"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Video, Send, Phone, Loader2 } from "lucide-react"
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

  if (isOtherUserLoading) return <div className="flex items-center justify-center h-svh bg-black"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  if (!otherUser) return <div className="p-10 text-center bg-black h-svh flex items-center justify-center"><Button onClick={() => router.push('/discover')}>Back</Button></div>

  const otherUserImage = (otherUser.profilePhotoUrls && otherUser.profilePhotoUrls[0]) || `https://picsum.photos/seed/${otherUser.id}/200/200`

  return (
    <div className="flex flex-col h-svh bg-black relative overflow-hidden text-white">
      <header className="px-2 py-1.5 bg-black/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10 border-b border-white/5">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 rounded-full text-white"><ChevronLeft className="w-5 h-5" /></Button>
          <div className="flex items-center gap-2">
            <Avatar className="w-7 h-7">
              <AvatarImage src={otherUserImage} className="object-cover" />
              <AvatarFallback>{otherUser.username?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <h3 className="font-bold text-[11px] leading-none">{otherUser.username}</h3>
              <span className="text-[7px] text-white/40 font-black uppercase tracking-tight">{presence.online ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40" onClick={() => handleInitiateCall('audio')}><Phone className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40" onClick={() => handleInitiateCall('video')}><Video className="w-3.5 h-3.5" /></Button>
        </div>
      </header>

      <ScrollArea className="flex-1 px-3 py-2 bg-black">
        <div className="flex flex-col gap-2.5">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.uid
            return (
              <div key={msg.id} className={cn("flex w-full animate-in fade-in", isMe ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] px-3 py-1.5 text-[11px] relative shadow-sm", isMe ? "bg-primary text-white rounded-xl rounded-tr-none" : "bg-white/5 text-white rounded-xl rounded-tl-none border border-white/5")}>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.messageText}</p>
                </div>
              </div>
            )
          })}
          <div ref={scrollRef} className="h-1.5" />
        </div>
      </ScrollArea>

      <footer className="p-2 bg-black border-t border-white/5">
        <div className="flex items-center gap-2">
          <Input 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)} 
            placeholder="Message..." 
            className="rounded-full h-8.5 bg-white/5 border-none px-4 text-[11px] text-white placeholder:text-white/20" 
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
          />
          <Button size="icon" className={cn("rounded-full w-8.5 h-8.5 transition-all", inputText.trim() ? "bg-primary" : "bg-white/5 text-white/20")} onClick={() => handleSendMessage()} disabled={!inputText.trim()}><Send className="w-3.5 h-3.5 rotate-45" /></Button>
        </div>
      </footer>
    </div>
  )
}
