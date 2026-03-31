
"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Video, Send, Mic, Image as ImageIcon, Phone, Gift, Hash, Smile, Loader2, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { generateConversationStarters } from "@/ai/flows/ai-conversation-starter"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { ref, push, onValue, serverTimestamp as rtdbTimestamp, update } from "firebase/database"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function ChatDetailPage() {
  const { id: otherUserId } = useParams()
  const { user: currentUser } = useUser()
  const { firestore, database } = useFirebase()
  const router = useRouter()
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const [inputText, setInputText] = useState("")
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>(["Hey! How's your day?", "What are your hobbies?", "Tell me something interesting!"])
  const [isVideoActive, setIsVideoActive] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [isOnline, setIsOnline] = useState(false)
  
  const chatId = [currentUser?.uid, otherUserId].sort().join("_")

  const otherUserRef = useMemoFirebase(() => doc(firestore, "userProfiles", otherUserId as string), [firestore, otherUserId])
  const { data: otherUser, isLoading: isOtherUserLoading } = useDoc(otherUserRef)

  // Presence Listener
  useEffect(() => {
    if (!database || !otherUserId) return
    const presenceRef = ref(database, `users/${otherUserId}/presence/online`)
    return onValue(presenceRef, (snap) => {
      setIsOnline(!!snap.val())
    })
  }, [database, otherUserId])

  // Realtime Database Messages Listener
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
        // Sort by timestamp
        msgList.sort((a, b) => (a.sentAt || 0) - (b.sentAt || 0))
        setMessages(msgList)
      } else {
        setMessages([])
      }
    })
  }, [database, chatId])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSendMessage = (text = inputText) => {
    if (!text.trim() || !currentUser || !chatId || !database) return
    
    const messagesRef = ref(database, `chats/${chatId}/messages`)
    const newMessageKey = push(messagesRef).key

    const messageData = {
      messageText: text,
      senderId: currentUser.uid,
      sentAt: rtdbTimestamp(),
    }

    // Atomic updates across RTDB paths
    const updates: any = {}
    updates[`/chats/${chatId}/messages/${newMessageKey}`] = messageData
    updates[`/users/${currentUser.uid}/chats/${otherUserId}`] = {
      lastMessage: text,
      timestamp: rtdbTimestamp(),
      otherUserId: otherUserId,
      chatId: chatId
    }
    updates[`/users/${otherUserId}/chats/${currentUser.uid}`] = {
      lastMessage: text,
      timestamp: rtdbTimestamp(),
      otherUserId: currentUser.uid,
      chatId: chatId
    }
    
    update(ref(database), updates)
    setInputText("")
  }

  const startVideoCall = () => {
    setIsVideoActive(true)
  }

  if (isOtherUserLoading) {
    return (
      <div className="flex items-center justify-center h-svh bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!otherUser) {
    return (
      <div className="flex flex-col items-center justify-center h-svh bg-white p-6 text-center">
        <h2 className="text-2xl font-bold mb-4 font-headline">Chat Unavailable</h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  const otherUserImage = (otherUser.profilePhotoUrls && otherUser.profilePhotoUrls[0]) || `https://picsum.photos/seed/${otherUser.id}/100/100`

  return (
    <div className="flex flex-col h-svh bg-slate-50 relative">
      {isVideoActive && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col animate-in fade-in zoom-in duration-500">
           <div className="relative flex-1">
             <img src={otherUserImage} className="w-full h-full object-cover opacity-80" alt="Video Call" />
             <div className="absolute top-10 left-6 text-white">
                <h2 className="text-3xl font-bold font-logo">{otherUser.username}</h2>
                <p className="text-white/60 font-medium">Connecting...</p>
             </div>
             <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-6">
                <Button onClick={() => setIsVideoActive(false)} variant="destructive" className="rounded-full w-16 h-16 shadow-2xl scale-110">
                  End
                </Button>
             </div>
           </div>
        </div>
      )}

      {/* Modern Header */}
      <header className="px-4 py-3 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
              <AvatarImage src={otherUserImage} className="object-cover" />
              <AvatarFallback>{otherUser.username?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <h3 className="font-bold text-sm leading-none font-headline">{otherUser.username}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-300")} />
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tight">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary rounded-full" onClick={startVideoCall}>
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary rounded-full">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-6">
          {/* Info Card */}
          <div className="mx-auto max-w-[90%] bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 space-y-3">
            <div className="flex items-center justify-center gap-2">
               <Badge className="bg-primary hover:bg-primary text-white text-[10px] rounded-full px-3">
                  {otherUser.gender === 'female' ? '♀' : '♂'} · {otherUser.location || "Nearby"}
               </Badge>
            </div>
            <p className="text-[11px] text-center text-gray-500 font-medium leading-relaxed italic">
              "{(otherUser.bio || "Finding my flow on MatchFlow.")?.slice(0, 80)}..."
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {messages.length === 0 && (
               <div className="text-center py-10 opacity-40">
                  <p className="text-xs font-bold uppercase tracking-widest">Say Hi to start the flow</p>
               </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUser?.uid
              return (
                <div key={msg.id} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] px-4 py-3 shadow-sm text-sm relative",
                    isMe 
                    ? "bg-primary text-white rounded-2xl rounded-tr-none" 
                    : "bg-white text-gray-800 rounded-2xl rounded-tl-none border border-gray-100"
                  )}>
                    <p className="leading-relaxed font-medium">{msg.messageText}</p>
                    {msg.sentAt && (
                      <span className={cn(
                        "text-[9px] block mt-1 text-right",
                        isMe ? "text-white/60" : "text-gray-400"
                      )}>
                        {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={scrollRef} className="h-4" />
          </div>
        </div>
      </ScrollArea>

      {/* Footer / Input */}
      <footer className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] space-y-4">
        {/* AI Icebreakers */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {aiSuggestions.map((suggestion, idx) => (
            <button 
              key={idx} 
              className="rounded-full border border-primary/20 text-primary text-[11px] h-8 px-4 font-bold shrink-0 hover:bg-primary/5 active:scale-95 transition-all whitespace-nowrap bg-white"
              onClick={() => setInputText(suggestion)}
            >
              {suggestion}
            </button>
          ))}
          <Button 
            className="bg-primary/10 hover:bg-primary/20 text-primary rounded-full h-8 px-4 font-black text-xs shrink-0 flex items-center gap-1.5"
            onClick={async () => {
              setIsAiLoading(true)
              try {
                const res = await generateConversationStarters({ 
                  otherUserBio: otherUser.bio || "A new MatchFlow user.", 
                  otherUserInterests: otherUser.interests || ["Nature"] 
                })
                setAiSuggestions(res.suggestions)
              } catch (e) {
                console.error("AI failed", e)
              } finally {
                setIsAiLoading(false)
              }
            }}
            disabled={isAiLoading}
          >
            {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Spark it ✨"}
          </Button>
        </div>

        {/* Input Controls */}
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="rounded-full text-gray-400 hover:text-primary">
            <Mic className="w-5 h-5" />
          </Button>
          <div className="flex-1 relative flex items-center">
            <Input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Your message..."
              className="rounded-full h-12 bg-gray-50 border-none pr-12 pl-5 focus-visible:ring-primary/20 text-sm font-medium"
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button size="icon" variant="ghost" className="absolute right-1.5 text-amber-400 hover:bg-transparent">
               <Smile className="w-5 h-5 fill-current" />
            </Button>
          </div>
          <Button 
            size="icon" 
            className={cn(
              "rounded-full w-12 h-12 transition-all shadow-lg",
              inputText.trim() ? "bg-primary text-white scale-100" : "bg-gray-200 text-gray-400 scale-90"
            )}
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim()}
          >
            <Send className="w-5 h-5 rotate-45 relative left-[-2px] fill-current" />
          </Button>
        </div>

        {/* Rapid Actions */}
        <div className="flex justify-between items-center px-4 pt-1">
           <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary"><ImageIcon className="w-5 h-5" /></Button>
           <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary"><Phone className="w-5 h-5" /></Button>
           <Button variant="ghost" size="icon" className="text-amber-400 hover:text-amber-500"><Gift className="w-5 h-5 fill-current" /></Button>
           <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary" onClick={startVideoCall}><Video className="w-5 h-5" /></Button>
           <div className="relative">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary"><Hash className="w-5 h-5" /></Button>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[7px] font-black px-1.5 rounded-full shadow-sm animate-bounce">!</span>
           </div>
        </div>
      </footer>
    </div>
  )
}
