"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Video, Send, Coins, Sparkles, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { useToast } from "@/hooks/use-toast"
import { generateConversationStarters } from "@/ai/flows/ai-conversation-starter"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

const MOCK_USERS = {
  "1": { name: "Elena", bio: "Adventure seeker and sunset lover.", interests: ["Hiking", "Photography"], image: PlaceHolderImages.find(i => i.id === 'user-1')?.imageUrl },
  "2": { name: "Marcus", bio: "Music producer & tech enthusiast.", interests: ["Music", "Tech"], image: PlaceHolderImages.find(i => i.id === 'user-4')?.imageUrl },
  "3": { name: "Sophia", bio: "History buff & art lover.", interests: ["Art", "History"], image: PlaceHolderImages.find(i => i.id === 'user-5')?.imageUrl },
}

export default function ChatDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [messages, setMessages] = useState([
    { id: 1, text: "Hey there! I saw we matched! ✨", sender: "them", time: "10:00 AM" }
  ])
  const [inputText, setInputText] = useState("")
  const [coins, setCoins] = useState(150)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [isVideoActive, setIsVideoActive] = useState(false)
  
  const user = MOCK_USERS[id as keyof typeof MOCK_USERS] || MOCK_USERS["1"]

  const handleSendMessage = (text = inputText) => {
    if (!text.trim()) return
    if (coins < 5) {
      toast({ title: "Insufficient Coins", description: "Each message costs 5 coins. Please top up!" })
      router.push("/coins")
      return
    }

    setCoins(prev => prev - 5)
    const newMsg = { id: Date.now(), text, sender: "me", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    setMessages([...messages, newMsg])
    setInputText("")
    setAiSuggestions([])

    // Simulate response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "That sounds interesting! Tell me more? 😊",
        sender: "them",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
    }, 1500)
  }

  const handleAiIcebreaker = async () => {
    setIsAiLoading(true)
    try {
      const response = await generateConversationStarters({
        otherUserBio: user.bio,
        otherUserInterests: user.interests,
        otherUserPhotosDescription: "Smiling in a beautiful outdoor setting"
      })
      setAiSuggestions(response.suggestions)
    } catch (error) {
      toast({ title: "AI Error", description: "Could not generate icebreakers right now." })
    } finally {
      setIsAiLoading(false)
    }
  }

  const startVideoCall = () => {
    if (coins < 50) {
      toast({ title: "Insufficient Coins", description: "Video calls cost 50 coins." })
      router.push("/coins")
      return
    }
    setCoins(prev => prev - 50)
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
                <p className="text-white/60">00:12</p>
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
          <Avatar className="w-10 h-10 ring-2 ring-primary/20">
            <AvatarImage src={user.image} />
            <AvatarFallback>{user.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-bold text-sm leading-none">{user.name}</h3>
            <span className="text-[10px] text-green-500 font-medium">Online</span>
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
          <div className="flex justify-center my-4">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded">Today</span>
          </div>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                msg.sender === "me" 
                ? "bg-primary text-white rounded-tr-none" 
                : "bg-white border text-foreground rounded-tl-none"
              }`}>
                {msg.text}
                <div className={`text-[9px] mt-1 ${msg.sender === "me" ? "text-white/70" : "text-muted-foreground"}`}>
                  {msg.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input & AI Tools */}
      <footer className="p-4 border-t bg-white space-y-4">
        {aiSuggestions.length > 0 && (
          <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              AI Suggestions
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {aiSuggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(suggestion)}
                  className="whitespace-nowrap bg-primary/5 hover:bg-primary/10 text-primary text-xs px-3 py-2 rounded-xl border border-primary/20 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className={`rounded-full border-primary/30 text-primary ${isAiLoading ? 'animate-pulse' : ''}`}
            onClick={handleAiIcebreaker}
            disabled={isAiLoading}
          >
            <Sparkles className="w-5 h-5" />
          </Button>
          <div className="flex-1 relative">
            <Input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
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
        <p className="text-[10px] text-center text-muted-foreground">
          Matches cost <span className="font-bold text-primary">5 coins</span> per message
        </p>
      </footer>
    </div>
  )
}
