
"use client"

import { useState, useEffect, useRef } from "react"
import { MessageSquare, ChevronRight, CheckCircle, EyeOff, Loader2, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useFirebase, useUser } from "@/firebase"
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function clearChatCache() {}
export function clearProfileCache() {}

function ChatSessionItem({ session, onLongPress }: { session: any, onLongPress: (id: string) => void }) {
  const { firestore } = useFirebase()
  const { user: currentUser } = useUser()
  const router = useRouter()
  
  const otherUserId = session.participants.find((p: string) => p !== currentUser?.uid)
  const [otherUserData, setOtherUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressedRef = useRef(false)

  useEffect(() => {
    if (!firestore || !otherUserId) return
    const userRef = doc(firestore, "userProfiles", otherUserId)
    return onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setOtherUserData(snap.data())
      } else {
        setOtherUserData({ username: "User logged out", profilePhotoUrls: [] })
      }
      setIsLoading(false)
    })
  }, [firestore, otherUserId])

  const handleTouchStart = () => {
    longPressedRef.current = false
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true
      onLongPress(session.id)
    }, 600)
  }

  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const handleItemClick = () => {
    if (!longPressedRef.current && otherUserId) {
      router.push(`/chat/${otherUserId}`)
    }
  }

  const name = otherUserData?.isSupport ? "Customer Support" : (otherUserData?.username || "User")
  const image = (otherUserData?.profilePhotoUrls && otherUserData.profilePhotoUrls[0]) || ""
  const isVerified = !!otherUserData?.isVerified
  const isOnline = !!otherUserData?.isOnline
  const unreadCount = session[`unreadCount_${currentUser?.uid}`] || 0

  return (
    <div
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
      className="relative select-none"
    >
      <div 
        onClick={handleItemClick}
        className="flex items-center gap-3 py-2.5 hover:bg-slate-50/80 rounded-2xl px-2 transition-all group active:scale-[0.98] cursor-pointer"
      >
        <div className="relative shrink-0">
          <Avatar className="w-12 h-12 border border-gray-100 shadow-sm bg-gray-50">
            {image && <AvatarImage src={image} className="object-cover" />}
            <AvatarFallback className="bg-transparent text-gray-300">
              {name ? name[0] : ''}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            "absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full shadow-sm",
            isOnline ? "bg-green-500" : "bg-gray-300"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-0">
            <div className="flex items-center gap-1 truncate">
              <h3 className={cn(
                "font-bold text-sm truncate font-headline min-h-[1.25rem]",
                name === "User logged out" ? "text-gray-400 font-medium italic" : "text-gray-900"
              )}>
                {name}
              </h3>
              {isVerified && <CheckCircle className="w-3 h-3 text-blue-500 fill-blue-500/10 shrink-0" />}
            </div>
            {session.timestamp && (
              <span className="text-[9px] font-bold text-gray-400">
                {session.timestamp.toDate?.() ? session.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <p className={cn("text-[11px] truncate font-medium flex-1", unreadCount > 0 ? "text-gray-900 font-black" : "text-gray-500")}>
              {session.lastMessage || "Start a conversation"}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {unreadCount > 0 && (
                <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-white shadow-sm shadow-primary/20">
                  {unreadCount}
                </span>
              )}
              {isOnline && (
                <span className="text-[9px] font-black text-green-500 uppercase tracking-tighter shrink-0">Online</span>
              )}
            </div>
          </div>
        </div>
        
        <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-primary transition-colors" />
      </div>
    </div>
  )
}

export default function ChatListPage() {
  const { firestore } = useFirebase()
  const { user: currentUser } = useUser()
  const [sessions, setSessions] = useState<any[]>([])
  const [hasFetched, setHasFetched] = useState(false)
  const [hidingTarget, setHidingTarget] = useState<string | null>(null)
  const [isHiding, setIsHiding] = useState(false)

  useEffect(() => {
    if (!firestore || !currentUser) return
    
    const chatsQuery = query(
      collection(firestore, "chats"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("timestamp", "desc")
    )
    
    return onSnapshot(chatsQuery, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      // FILTER: Only show if I've texted them OR I have unread messages
      const filtered = list.filter((s: any) => {
        const isHidden = s[`hidden_${currentUser.uid}`] === true
        const hasSent = s[`userHasSent_${currentUser.uid}`] === true
        const unread = s[`unreadCount_${currentUser.uid}`] > 0
        return !isHidden && (hasSent || unread)
      })
      setSessions(filtered)
      setHasFetched(true)
    })
  }, [firestore, currentUser])

  const handleHideChat = async () => {
    if (!currentUser || !hidingTarget || !firestore) return
    setIsHiding(true)
    try {
      const chatRef = doc(firestore, "chats", hidingTarget)
      await updateDoc(chatRef, { 
        [`hidden_${currentUser.uid}`]: true,
        [`unreadCount_${currentUser.uid}`]: 0 
      })
      setHidingTarget(null)
    } catch (e) {
      console.error("Failed to delete chat", e)
    } finally {
      setIsHiding(false)
    }
  }

  return (
    <div className="flex flex-col h-svh pb-20 bg-transparent overflow-y-auto">
      <header className="bg-transparent pt-8 pb-4 px-6 sticky top-0 z-20 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-logo text-white relative flex items-center gap-2">
            Chats
            <MessageSquare className="w-6 h-6 text-white/30" />
          </h1>
        </div>
      </header>

      <main className="flex-1 px-3 bg-white rounded-t-[2.5rem] shadow-2xl pt-6">
        <section className="space-y-1">
          {sessions.length > 0 ? (
            <div className="flex flex-col gap-1 pb-10">
              {sessions.map((session) => (
                <ChatSessionItem 
                  key={session.id} 
                  session={session} 
                  onLongPress={setHidingTarget} 
                />
              ))}
              <div className="py-8 flex justify-center">
                 <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">Showing latest chats</p>
              </div>
            </div>
          ) : hasFetched ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 font-medium gap-4">
              <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center border border-gray-100">
                <MessageSquare className="w-8 h-8 text-gray-200" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-gray-900">No conversations</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-20">
              <MessageSquare className="w-8 h-8" />
              <p className="text-[10px] font-black uppercase tracking-widest">Loading Chats</p>
            </div>
          )}
        </section>
      </main>

      <Dialog open={!!hidingTarget} onOpenChange={(open) => !open && setHidingTarget(null)}>
        <DialogContent className="rounded-[2.5rem] bg-white border-none p-8 max-w-[85%] mx-auto shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-headline text-gray-900 text-center">Delete Conversation</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <p className="text-sm text-gray-500 font-medium text-center mb-2 leading-relaxed">
              Are you sure you want to remove this conversation from your list?
            </p>
            <Button 
              onClick={handleHideChat}
              disabled={isHiding}
              className="h-14 rounded-full bg-red-500 text-white font-black uppercase text-xs tracking-widest gap-3 shadow-xl active:scale-95 transition-all hover:bg-red-600"
            >
              {isHiding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setHidingTarget(null)}
              className="h-14 rounded-full text-gray-400 font-black uppercase text-[10px] tracking-widest"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
