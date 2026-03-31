
"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Video, Send, Coins, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { useToast } from "@/hooks/use-toast"
import { generateConversationStarters } from "@/ai/flows/ai-conversation-starter"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, set, push, onDisconnect, serverTimestamp as rtdbTimestamp } from "firebase/database"
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp as firestoreTimestamp } from "firebase/firestore"

const MOCK_USERS = {
  "1": { name: "Elena", bio: "Adventure seeker and sunset lover.", interests: ["Hiking", "Photography"], image: PlaceHolderImages.find(i => i.id === 'user-1')?.imageUrl },
  "2": { name: "Marcus", bio: "Music producer & tech enthusiast.", interests: ["Music", "Tech"], image: PlaceHolderImages.find(i => i.id === 'user-4')?.imageUrl },
  "3": { name: "Sophia", bio: "History buff & art lover.", interests: ["Art", "History"], image: PlaceHolderImages.find(i => i.id === 'user-5')?.imageUrl },
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
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [isVideoActive, setIsVideoActive] = useState(false)
  
  // Speed-critical states from Realtime DB
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false)
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false)
  const [callStatus, setCallStatus] = useState<string | null>(null)

  const user = MOCK_USERS[otherUserId as keyof typeof MOCK_USERS] || MOCK_USERS["1"]
  const chatId = [currentUser?.uid, otherUserId].sort().join("_")

  // Real-time Presence & Typing Indicators
  useEffect(() => {
    if (!currentUser || !otherUserId || !database) return

    // Presence
    const presenceRef = ref(database, `users/${otherUserId}/presence`)
    const unsubPresence = onValue(presenceRef, (snapshot) => {
      setIsOtherUserOnline(snapshot.val()?.online || false)
    })

    // Typing
    const typingRef = ref(database, `chats/${chatId}/typing/${otherUserId}`)
    const unsubTyping = onValue(typingRef, (snapshot) => {
      setIsOtherUserTyping(snapshot.val() || false)
    })

    // Call status
    const callRef = ref(database, `calls/${currentUser.uid}`)
    const unsubCall = onValue(callRef, (snapshot) => {
      setCallStatus(snapshot.val()?.status || null)
    })

    // Set my own typing indicator to false on disconnect
    const myTypingRef = ref(database, `chats/${chatId}/typing/${currentUser.uid}`)
    onDisconnect(myTypingRef).set(false)

    return () => {
      unsubPresence()
      unsubTyping()
      unsubCall()
    }
  }, [currentUser, otherUserId, database, chatId])

  // Firestore Message History
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
    
    // Instant feedback: Send to Realtime DB for delivery signals (optional)
    // but here we focus on the "what happened and must be saved" rule for messages
    
    // Clear typing indicator
    const myTypingRef = ref(database, `chats/${chatId}/typing/${currentUser.uid}`)
    set(myTypingRef, false)

    // Save to Firestore for permanent history
    addDoc(collection(firestore, `chatSessions/${chatId}/messages`), {
      text,
      senderId: currentUser.uid,
      sentAt: firestoreTimestamp()
    })

    setInputText("")
    setAiSuggestions([])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value)
    if (currentUser) {
      const myTypingRef = ref(database, `chats/${chatId}/typing/${currentUser.uid}`)
      set(myTypingRef, e.target.value.length > 0)
    }
  }

  const startVideoCall = () => {
    if (!currentUser || !otherUserId) return
    
    // RTDB for live calling system (Speed critical)
    const callRef = ref(database, `calls/${otherUserId}`)
    set(callRef, {
      callerId: currentUser.uid,
      status: "ringing",
      timestamp: rtdbTimestamp()
    })

    setIsVideoActive(true)
  }

  return (
    <div className="flex flex-col h-svh bg-[#FDFCFD] relative">
      {/* Video Call Overlay */}
      {isVideoActive && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col animate-in fade-in zoom-in duration-500">
           <div className="relative flex-1">
             <img src={user.image} className="w-full h-full object-cover opacity-80" alt="Video Call" />
             <div className="absolute top-10 left-6 text-white">
                <h2 className="text-2xl font-bold font-headline">{user.name}</h2>
                <p className="text-white/60">{callStatus === 'ringing' ? 'Ringing...' : 'Connected'}</p>
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
      <header className="px-4 py-3 border-b bg-white flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="relative">
            <Avatar className="w-10 h-10 ring-2 ring-primary/20">
              <AvatarImage src={user.image} />
              <AvatarFallback>{user.name[0]}</AvatarFallback>
            </Avatar>
            {isOtherUserOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm leading-none">{user.name}</h3>
            <span className={`text-[10px] font-medium ${isOtherUserOnline ? 'text-green-500' : 'text-muted-foreground'}`}>
              {isOtherUserOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-full">
            <Coins className="w-3 h-3 text-amber-500" />
            <span className="text-xs font-bold">{coins}</span>
          </div>
          <Button size="icon" variant="ghost" className="text-primary" onClick={startVideoCall}>
            <Video className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderId === currentUser?.uid ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                msg.senderId === currentUser?.uid 
                ? "bg-primary text-white rounded-tr-none" 
                : "bg-white border text-foreground rounded-tl-none"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isOtherUserTyping && (
            <div className="flex justify-start">
              <div className="bg-muted px-3 py-1 rounded-full text-[10px] animate-pulse">
                {user.name} is typing...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input & AI Tools */}
      <footer className="p-4 border-t bg-white space-y-4 pb-10">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full border-primary/30 text-primary"
            onClick={async () => {
              setIsAiLoading(true)
              const res = await generateConversationStarters({ otherUserBio: user.bio, otherUserInterests: user.interests })
              setAiSuggestions(res.suggestions)
              setIsAiLoading(false)
            }}
            disabled={isAiLoading}
          >
            <Sparkles className="w-5 h-5" />
          </Button>
          <div className="flex-1 relative">
            <Input 
              value={inputText}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="rounded-full pr-12 border-muted"
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button 
              size="icon" 
              variant="ghost" 
              className="absolute right-1 top-1 text-primary"
              onClick={() => handleSendMessage()}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
