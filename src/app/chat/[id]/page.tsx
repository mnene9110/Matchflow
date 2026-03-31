
"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Video, Send, Coins, Sparkles, Mic, Image as ImageIcon, Phone, Gift, Hash, Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { useToast } from "@/hooks/use-toast"
import { generateConversationStarters } from "@/ai/flows/ai-conversation-starter"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, set, onDisconnect, serverTimestamp as rtdbTimestamp } from "firebase/database"
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp as firestoreTimestamp } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const MOCK_USERS = {
  "1": { name: "Lucy lucii", bio: "I like to associate with new people", interests: ["Gardening", "Festivals", "Tennis"], image: PlaceHolderImages.find(i => i.id === 'user-1')?.imageUrl, location: "Kenya", zodiac: "Pisces" },
  "2": { name: "honey cup", bio: "Sweet and spicy personality.", interests: ["Music", "Tech"], image: PlaceHolderImages.find(i => i.id === 'user-4')?.imageUrl, location: "Nigeria", zodiac: "Leo" },
  "3": { name: "Sophia", bio: "History buff & art lover.", interests: ["Art", "History"], image: PlaceHolderImages.find(i => i.id === 'user-5')?.imageUrl, location: "Ghana", zodiac: "Aries" },
}

export default function ChatDetailPage() {
  const { id: otherUserId } = useParams()
  const { user: currentUser } = useUser()
  const { firestore, database } = useFirebase()
  const router = useRouter()
  const { toast } = useToast()
  
  const [messages, setMessages] = useState<any[]>([])
  const [inputText, setInputText] = useState("")
  const [coins, setCoins] = useState(150)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>(["Good to meet you here", "Nice to meet you", "What's your plan?"])
  const [isVideoActive, setIsVideoActive] = useState(false)
  
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(true)
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false)
  const [callStatus, setCallStatus] = useState<string | null>(null)

  const user = MOCK_USERS[otherUserId as keyof typeof MOCK_USERS] || MOCK_USERS["1"]
  const chatId = [currentUser?.uid, otherUserId].sort().join("_")

  useEffect(() => {
    if (!currentUser || !otherUserId || !database) return

    const presenceRef = ref(database, `users/${otherUserId}/presence`)
    const unsubPresence = onValue(presenceRef, (snapshot) => {
      setIsOtherUserOnline(snapshot.val()?.online || false)
    })

    const typingRef = ref(database, `chats/${chatId}/typing/${otherUserId}`)
    const unsubTyping = onValue(typingRef, (snapshot) => {
      setIsOtherUserTyping(snapshot.val() || false)
    })

    const callRef = ref(database, `calls/${currentUser.uid}`)
    const unsubCall = onValue(callRef, (snapshot) => {
      setCallStatus(snapshot.val()?.status || null)
    })

    return () => {
      unsubPresence()
      unsubTyping()
      unsubCall()
    }
  }, [currentUser, otherUserId, database, chatId])

  useEffect(() => {
    if (!chatId || !firestore) return

    const msgsQuery = query(
      collection(firestore, `chatSessions/${chatId}/messages`),
      orderBy("sentAt", "asc"),
      limit(50)
    )

    const unsubMessages = onSnapshot(msgsQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setMessages(msgs)
    })

    return () => unsubMessages()
  }, [chatId, firestore])

  const handleSendMessage = (text = inputText) => {
    if (!text.trim() || !currentUser) return
    
    addDoc(collection(firestore, `chatSessions/${chatId}/messages`), {
      text,
      senderId: currentUser.uid,
      sentAt: firestoreTimestamp()
    })

    setInputText("")
  }

  const startVideoCall = () => {
    setIsVideoActive(true)
  }

  return (
    <div className="flex flex-col h-svh bg-white relative">
      {/* Immersive Video Call Layer */}
      {isVideoActive && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col animate-in fade-in zoom-in duration-500">
           <div className="relative flex-1">
             <img src={user.image} className="w-full h-full object-cover opacity-80" alt="Video Call" />
             <div className="absolute top-10 left-6 text-white">
                <h2 className="text-2xl font-bold font-headline">{user.name}</h2>
                <p className="text-white/60">Connecting...</p>
             </div>
             <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-6">
                <Button onClick={() => setIsVideoActive(false)} variant="destructive" className="rounded-full w-16 h-16">
                  End
                </Button>
             </div>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="px-4 py-3 bg-white flex items-center justify-between sticky top-0 z-10 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-0 h-auto font-bold flex items-center gap-1">
            <ChevronLeft className="w-6 h-6" />
            <span className="bg-gray-100 px-2 py-0.5 rounded-full text-[10px] min-w-[24px] text-center">99+</span>
          </Button>
          <div className="flex flex-col items-center flex-1">
            <h3 className="font-bold text-base leading-none">{user.name}</h3>
            <div className="flex items-center gap-1 mt-1">
               <div className="w-2 h-2 bg-green-500 rounded-full" />
               <span className="text-[10px] text-muted-foreground font-medium">Online</span>
            </div>
          </div>
        </div>
        <Avatar className="w-8 h-8">
          <AvatarImage src={user.image} className="object-cover" />
          <AvatarFallback>{user.name[0]}</AvatarFallback>
        </Avatar>
      </header>

      {/* Content Area */}
      <ScrollArea className="flex-1 bg-gray-50/30">
        <div className="px-4 py-4 space-y-6">
          {/* Profile Quick View Card */}
          <div className="bg-[#E0F2FE] rounded-[2rem] p-5 shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                 <Badge className="bg-[#FF719A] hover:bg-[#FF719A] text-white border-none text-[10px] px-3 py-0.5 rounded-full font-black">
                    ♀ 20
                 </Badge>
                 <Badge className="bg-[#FFB13B] hover:bg-[#FFB13B] text-white border-none text-[10px] px-3 py-0.5 rounded-full font-black">
                    {user.location}
                 </Badge>
                 <Badge className="bg-[#FFB13B] hover:bg-[#FFB13B] text-white border-none text-[10px] px-3 py-0.5 rounded-full font-black">
                    {user.zodiac}
                 </Badge>
              </div>
              <div className="flex items-center gap-1 bg-white/60 px-2 py-1 rounded-full border border-white/20">
                 <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-[8px]">💧</span>
                 </div>
                 <span className="text-[10px] font-bold text-gray-500">0°C</span>
                 <ChevronLeft className="w-3 h-3 text-gray-400 rotate-180" />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#FCF8B4] w-fit px-2.5 py-1 rounded-lg">
               <span className="text-[10px]">👤✅</span>
               <span className="text-[10px] font-black uppercase tracking-tighter">Real Person</span>
            </div>

            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-14 h-14 rounded-xl overflow-hidden border border-white/20">
                  <img src={`https://picsum.photos/seed/${otherUserId}-${i}/100/100`} className="w-full h-full object-cover" alt="Gallery" />
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[#4ADE80] font-black text-sm">
                <span>👥</span> Personality similarity: 86%
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Can chat with her/him {user.interests.map(interest => `🌱${interest}`).join(' ')} 🥳
              </p>
            </div>
          </div>

          <div className="text-center text-[10px] text-gray-300 font-bold uppercase tracking-widest pt-4">
             2026/3/13 20:59
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-4">
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUser?.uid
              return (
                <div key={msg.id} className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
                  {!isMe && (
                    <Avatar className="w-10 h-10 border-2 border-white shadow-sm shrink-0">
                      <AvatarImage src={user.image} className="object-cover" />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn(
                    "max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                    isMe 
                    ? "bg-primary text-white rounded-tr-none" 
                    : "bg-white text-gray-900 rounded-tl-none border border-gray-100"
                  )}>
                    {msg.text}
                  </div>
                </div>
              )
            })}
            
            {/* Mock "baby" message from screenshot */}
            {messages.length === 0 && (
              <div className="flex gap-2">
                <Avatar className="w-10 h-10 border-2 border-white shadow-sm shrink-0">
                  <AvatarImage src={user.image} className="object-cover" />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                <div className="bg-white text-gray-900 rounded-2xl rounded-tl-none border border-gray-100 px-4 py-2.5 text-sm shadow-sm">
                   baby
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer / Input Area */}
      <footer className="p-4 bg-white border-t space-y-4">
        {/* AI Suggestion Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {aiSuggestions.map((suggestion, idx) => (
            <Button 
              key={idx} 
              variant="outline" 
              className="rounded-full border-primary/40 text-primary text-[11px] h-8 px-4 font-bold shrink-0 hover:bg-primary/5"
              onClick={() => setInputText(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
          <Button 
            className="bg-[#4ADE80] hover:bg-[#22C55E] text-white rounded-full h-8 px-5 font-black text-xs shrink-0"
            onClick={async () => {
              setIsAiLoading(true)
              const res = await generateConversationStarters({ otherUserBio: user.bio, otherUserInterests: user.interests })
              setAiSuggestions(res.suggestions)
              setIsAiLoading(false)
            }}
            disabled={isAiLoading}
          >
            Next
          </Button>
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="rounded-full text-gray-400">
            <Mic className="w-6 h-6" />
          </Button>
          <div className="flex-1 relative flex items-center">
            <Input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder=""
              className="rounded-full h-11 bg-gray-50 border-none pr-10 pl-4"
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button size="icon" variant="ghost" className="absolute right-1 text-amber-400">
               <Smile className="w-5 h-5 fill-current" />
            </Button>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            className="rounded-full text-gray-400"
            onClick={() => handleSendMessage()}
          >
            <Send className="w-6 h-6 rotate-45" />
          </Button>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex justify-between items-center px-2 pt-2">
           <Button variant="ghost" size="icon" className="text-gray-400"><ImageIcon className="w-6 h-6" /></Button>
           <Button variant="ghost" size="icon" className="text-gray-400" onClick={() => router.push('/calls')}><Phone className="w-6 h-6" /></Button>
           <Button variant="ghost" size="icon" className="text-amber-400"><Gift className="w-6 h-6 fill-current" /></Button>
           <Button variant="ghost" size="icon" className="text-gray-400" onClick={startVideoCall}><Video className="w-6 h-6" /></Button>
           <div className="relative">
              <Button variant="ghost" size="icon" className="text-gray-400"><Hash className="w-6 h-6" /></Button>
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[7px] font-black px-1 rounded-full">New</span>
           </div>
        </div>
      </footer>
    </div>
  )
}
