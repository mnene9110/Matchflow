
"use client"

import { useState, useEffect, useRef, useMemo, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Send, 
  Loader2, 
  CheckCircle, 
  Gift, 
  Phone, 
  Video,
  History
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase } from "@/firebase/provider"
import { doc, collection, addDoc, serverTimestamp, query, orderBy, limit, setDoc } from "firebase/firestore"
import { useDoc } from "@/firebase/firestore/use-doc"
import { useCollection } from "@/firebase/firestore/use-collection"
import { useMemoFirebase } from "@/firebase/firestore/use-memo-firebase"
import { useAuth } from "@/firebase/auth/use-auth"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export const GIFTS = [
  { id: 'butterfly', name: 'Butterfly', image: '/butterfly.png', price: 300 },
  { id: 'roses', name: 'Rose Bouquet', image: '/bouquet.png', price: 500 },
  { id: 'ring', name: 'Diamond Ring', emoji: '💍', price: 1000 },
]

function ChatDetailContent() {
  const params = useParams()
  const otherUserId = params?.id as string
  const router = useRouter()
  const { toast } = useToast()
  const { auth, firestore } = useFirebase()
  const { user: currentUser } = useAuth(auth)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const [inputText, setInputText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isGiftSheetOpen, setIsGiftSheetOpen] = useState(false)

  const chatId = useMemo(() => {
    if (!currentUser || !otherUserId) return ""
    return [currentUser.uid, otherUserId].sort().join("_")
  }, [currentUser, otherUserId])

  const otherUserRef = useMemoFirebase(() => doc(firestore, "userProfiles", otherUserId), [otherUserId]);
  const { data: otherUser } = useDoc(otherUserRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!chatId) return null;
    return query(
      collection(firestore, "chats", chatId, "messages"),
      orderBy("timestamp", "asc"),
      limit(50)
    );
  }, [chatId]);

  const { data: messages, isLoading: isLoadingMessages } = useCollection(messagesQuery);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textOverride?: string) => {
    const textToUse = textOverride || inputText;
    if (!textToUse.trim() || !currentUser || !chatId || isSending) return
    
    setIsSending(true);
    try {
      const chatRef = doc(firestore, "chats", chatId);
      await setDoc(chatRef, {
        participants: [currentUser.uid, otherUserId],
        lastMessage: textToUse,
        lastMessageAt: serverTimestamp()
      }, { merge: true });

      await addDoc(collection(firestore, "chats", chatId, "messages"), {
        senderId: currentUser.uid,
        text: textToUse,
        timestamp: serverTimestamp()
      });

      if (!textOverride) setInputText("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Send Failed" });
    } finally {
      setIsSending(false);
    }
  }

  if (isLoadingMessages) {
    return <div className="flex h-svh items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  const otherUserName = otherUser?.username || "User";
  const otherUserImage = (otherUser?.profilePhotoUrls && otherUser.profilePhotoUrls[0]) || "";

  return (
    <div className="flex flex-col h-svh bg-white relative overflow-hidden text-gray-900">
      <header className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 bg-[#3BC1A8] flex items-center justify-between sticky top-0 z-10 shadow-lg text-white">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-md text-white shrink-0"><ChevronLeft className="w-5 h-5" /></Button>
        <div className="flex items-center gap-2.5 transition-opacity flex-1 justify-center cursor-pointer active:opacity-70 px-2 min-w-0" onClick={() => router.push(`/profile/${otherUserId}`)}>
          <Avatar className="w-8 h-8 border border-white/20 shadow-sm shrink-0">
            <AvatarImage src={otherUserImage} className="object-cover" />
            <AvatarFallback>{otherUserName[0] || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col truncate items-center">
            <div className="flex items-center gap-1">
              <h3 className="font-black text-[12px] leading-tight truncate">{otherUserName}</h3>
              {otherUser?.isVerified && <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-current" />}
            </div>
            <span className="text-[8px] font-bold uppercase tracking-widest text-white/50">{otherUser?.isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-md text-white"><Phone className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-md text-white"><Video className="w-4 h-4" /></Button>
        </div>
      </header>

      <ScrollArea className="flex-1 px-4 py-4 bg-white">
        <div className="flex flex-col gap-4">
          {messages?.map((msg, idx) => {
            const isMe = msg.senderId === currentUser?.uid;
            return (
              <div key={msg.id || idx} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300", isMe ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] px-4 py-3 text-[13px] font-medium leading-relaxed shadow-sm", isMe ? "bg-[#3BC1A8] text-white rounded-[1.5rem] rounded-tr-none" : "bg-gray-100 text-gray-900 rounded-[1.5rem] rounded-tl-none")}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            )
          })}
          <div ref={scrollRef} className="h-4" />
        </div>
      </ScrollArea>

      <footer className="px-5 py-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] bg-white border-t border-gray-50 flex items-center gap-3">
        <Sheet open={isGiftSheetOpen} onOpenChange={setIsGiftSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-amber-50 text-amber-500 shrink-0"><Gift className="w-6 h-6" /></Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-[2.5rem] p-6 pb-12 max-h-[70svh]">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-xl font-black font-headline text-center uppercase tracking-widest">Send a Gift</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-4">
              {GIFTS.map((gift) => (
                <button key={gift.id} onClick={() => handleSendMessage(`🎁 Sent a ${gift.name}!`)} className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                    {gift.image ? <img src={gift.image} className="w-10 h-10 object-contain" alt={gift.name} /> : gift.emoji}
                  </div>
                  <span className="text-[10px] font-black uppercase text-gray-400 truncate w-full text-center">{gift.name}</span>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-[#3BC1A8]/10 rounded-full">
                    <span className="text-[9px] font-black text-[#3BC1A8]">{gift.price}</span>
                  </div>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        <div className="relative flex-1 group">
          <Input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Message..." className="rounded-full h-12 bg-gray-50 border-none px-6 text-[13px] pr-12" onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
          <Button size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full w-9 h-9" onClick={() => handleSendMessage()} disabled={!inputText.trim() || isSending}>
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </footer>
    </div>
  )
}

export default function ChatDetailPage() {
  return (
    <Suspense fallback={<div className="flex h-svh items-center justify-center bg-white" />}>
      <ChatDetailContent />
    </Suspense>
  )
}
