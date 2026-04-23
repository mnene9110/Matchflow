
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { MessageSquare, ChevronRight, CheckCircle, EyeOff, Loader2, Trash2, Shield } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useFirebase, useUser } from "@/firebase"
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { usePresence } from "@/hooks/use-presence"
import { useTyping } from "@/hooks/use-typing"

function ChatSessionItem({ session, onLongPress }: { session: any, onLongPress: (id: string) => void }) {
  const { firestore } = useFirebase()
  const { user: currentUser } = useUser()
  const router = useRouter()
  
  const otherUserId = session.participants.find((p: string) => p !== currentUser?.uid)
  const [otherUserData, setOtherUserData] = useState<any>(null)
  const { isOnline } = usePresence(otherUserId)

  // Real-time typing listener for this specific chat
  const { isOtherUserTyping } = useTyping(session.id, currentUser?.uid || null, otherUserId || null)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressedRef = useRef(false)
  const touchStartPos = useRef<{ x: number, y: number } | null>(null)

  useEffect(() => {
    if (!firestore || !otherUserId || !currentUser) return
    const userRef = doc(firestore, "userProfiles", otherUserId)
    return onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setOtherUserData(snap.data())
      } else {
        setOtherUserData({ username: "User logged out", profilePhotoUrls: [] })
      }
    }, (error) => {
      if (error.code !== 'permission-denied') {
        console.error("Profile snapshot error:", error)
      }
    })
  }, [firestore, otherUserId, currentUser])

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    longPressedRef.current = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    touchStartPos.current = { x: clientX, y: clientY };

    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      onLongPress(session.id);
    }, 450);
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const deltaX = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (deltaX > 10 || deltaY > 10) {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }

  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    touchStartPos.current = null;
  }

  const handleItemClick = () => {
    if (!longPressedRef.current && otherUserId) {
      router.push(`/chat/${otherUserId}`)
    }
  }

  const name = otherUserData?.isSupport ? "Customer Support" : (otherUserData?.username || "User")
  const image = (otherUserData?.profilePhotoUrls && otherUserData.profilePhotoUrls[0]) || ""
  const unreadCount = session[`unreadCount_${currentUser?.uid}`] || 0

  return (
    <div
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
      className="relative select-none"
    >
      <div 
        onClick={handleItemClick}
        className="flex items-center gap-4 py-4 hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer border-b border-gray-50"
      >
        <div className="relative shrink-0">
          <Avatar className="w-16 h-16 border-2 border-white shadow-sm bg-gray-50">
            {image && <AvatarImage src={image} className="object-cover" />}
            <AvatarFallback className="bg-gray-100 text-gray-300">
              {name ? name[0] : ''}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-4 h-4 border-2 border-white rounded-full bg-green-500 shadow-sm" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className={cn(
                "font-black text-base truncate",
                name === "User logged out" ? "text-gray-400 font-medium italic" : "text-[#3BC1A8]"
              )}>
                {name}
              </h3>
              {otherUserData?.isVerified && (
                <CheckCircle className="w-4 h-4 text-blue-500 fill-current" />
              )}
            </div>
            {session.timestamp && (
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                {session.timestamp.toDate?.() ? session.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "Just now"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isOtherUserTyping ? (
              <p className="text-[13px] truncate font-black text-primary animate-pulse flex-1">
                Typing...
              </p>
            ) : (
              <p className={cn("text-[13px] truncate font-bold flex-1", unreadCount > 0 ? "text-gray-900" : "text-gray-400")}>
                {session.lastMessage || "Start a conversation"}
              </p>
            )}
            {unreadCount > 0 && (
              <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#3BC1A8] flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ChatListPage() {
  const { firestore } = useFirebase()
  const { user: currentUser } = useUser()
  
  const [rawSessions, setRawSessions] = useState<any[]>([])
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set())
  const [hasFetched, setHasFetched] = useState(false)
  const [hidingTarget, setHidingTarget] = useState<string | null>(null)
  const [isHiding, setIsHiding] = useState(false)
  const [optimisticHiddenIds, setOptimisticHiddenIds] = useState<Set<string>>(new Set())

  // 1. Stable listener for blocked users
  useEffect(() => {
    if (!firestore || !currentUser) return
    const blockedRef = collection(firestore, "userProfiles", currentUser.uid, "blockedUsers")
    return onSnapshot(blockedRef, (snap) => {
      setBlockedIds(new Set(snap.docs.map(d => d.id)))
    }, (error) => {
      if (error.code !== 'permission-denied') {
        console.error("Blocked users snapshot error:", error)
      }
    })
  }, [firestore, currentUser?.uid])

  // 2. Stable listener for chat sessions
  useEffect(() => {
    if (!firestore || !currentUser) return
    
    const chatsQuery = query(
      collection(firestore, "chats"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("timestamp", "desc")
    )
    
    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setRawSessions(list)
      setHasFetched(true)
    }, (error) => {
      setHasFetched(true)
      if (error.code === 'permission-denied' && currentUser) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'chats',
          operation: 'list'
        }));
      }
    })

    return () => unsubscribe()
  }, [firestore, currentUser?.uid])

  // 3. Reactive filtering for the UI
  const sessions = useMemo(() => {
    if (!currentUser) return []
    
    return rawSessions.filter((s: any) => {
      const otherId = s.participants.find((p: string) => p !== currentUser.uid)
      
      const isBlockedByMe = otherId && blockedIds.has(otherId)
      const isHidden = s[`hidden_${currentUser.uid}`] === true
      const isOptimisticallyHidden = optimisticHiddenIds.has(s.id)
      
      // Ensure we only show chats that actually have content (messages)
      const hasContent = !!s.lastMessage 
      // Always show unread messages, even if we previously thought it had no content
      const hasUnread = (s[`unreadCount_${currentUser.uid}`] || 0) > 0

      return !isHidden && !isOptimisticallyHidden && (hasContent || hasUnread) && !isBlockedByMe
    })
  }, [rawSessions, blockedIds, optimisticHiddenIds, currentUser])

  const handleHideChat = async () => {
    if (!currentUser || !hidingTarget || !firestore) return
    setIsHiding(true)
    setOptimisticHiddenIds(prev => new Set(prev).add(hidingTarget))
    try {
      const chatRef = doc(firestore, "chats", hidingTarget)
      await updateDoc(chatRef, { 
        [`hidden_${currentUser.uid}`]: true,
        [`deletedAt_${currentUser.uid}`]: serverTimestamp(),
        [`unreadCount_${currentUser.uid}`]: 0 
      })
      setHidingTarget(null)
    } catch (e: any) {
      setOptimisticHiddenIds(prev => {
        const next = new Set(prev);
        next.delete(hidingTarget);
        return next;
      });
      if (e.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `chats/${hidingTarget}`,
          operation: 'update',
          requestResourceData: { [`hidden_${currentUser.uid}`]: true, [`unreadCount_${currentUser.uid}`]: 0 }
        }));
      }
    } finally {
      setIsHiding(false)
    }
  }

  return (
    <div className="flex flex-col h-svh pb-20 bg-white">
      <header className="bg-[#3BC1A8] pt-[env(safe-area-inset-top)] pb-3 px-6 sticky top-0 z-20 shrink-0">
        <div className="flex items-center justify-between pt-6">
          <h1 className="text-3xl font-logo text-white drop-shadow-sm">
            Chats
          </h1>
          <div className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center shadow-inner active:bg-white/10 transition-colors">
            <MessageSquare className="w-4 h-4 text-white fill-current" />
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 pt-2 bg-white overflow-y-auto">
        {sessions.length > 0 ? (
          <div className="flex flex-col">
            {sessions.map((session) => (
              <ChatSessionItem 
                key={session.id} 
                session={session} 
                onLongPress={setHidingTarget} 
              />
            ))}
          </div>
        ) : hasFetched ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400 font-medium gap-4">
            <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border border-gray-100">
              <MessageSquare className="w-10 h-10 text-gray-200" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-black text-gray-900 uppercase tracking-widest">No messages yet</p>
              <p className="text-[10px] font-bold uppercase tracking-tighter">Your private chats will appear here</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 gap-4 opacity-10">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing</p>
          </div>
        )}
      </main>

      <Dialog open={!!hidingTarget} onOpenChange={(open) => !open && setHidingTarget(null)}>
        <DialogContent hideClose className="rounded-[2.5rem] bg-white border-none p-8 max-w-[85%] mx-auto shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-headline text-gray-900 text-center">Delete Chat</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <p className="text-sm text-gray-500 font-medium text-center mb-4 leading-relaxed">
              Are you sure you want to remove this conversation?
            </p>
            <Button 
              onClick={handleHideChat}
              disabled={isHiding}
              className="h-14 rounded-full bg-red-500 text-white font-black uppercase text-xs tracking-widest gap-3 shadow-xl"
            >
              {isHiding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete Permanently
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
