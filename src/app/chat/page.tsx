
"use client"

import { useState, useEffect, useRef } from "react"
import { MessageSquare, ChevronRight, CheckCircle, Ban, EyeOff, Loader2, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { ref, onValue, update } from "firebase/database"
import { doc, getDoc, collection } from "firebase/firestore"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

// Session cache
let cachedSessions: any[] = []
let cachedLoaded: boolean = false

export function clearChatCache() {
  cachedSessions = []
  cachedLoaded = false
}

function ChatSessionItem({ session, onLongPress }: { session: any, onLongPress: (id: string) => void }) {
  const { firestore, database } = useFirebase()
  const [otherUserData, setOtherUserData] = useState<any>(null)
  const [presence, setPresence] = useState<{ online: boolean; lastSeen?: number }>({ online: false })
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    async function fetchUser() {
      if (!firestore || !session.otherUserId) return
      try {
        const userDoc = await getDoc(doc(firestore, "userProfiles", session.otherUserId))
        if (userDoc.exists()) {
          setOtherUserData(userDoc.data())
        } else {
          setOtherUserData({ username: "User logged out", profilePhotoUrls: [] })
        }
      } catch (e) {
        console.error("Failed to fetch user in chat list", e)
      } finally {
        setIsDataLoaded(true)
      }
    }
    fetchUser()
  }, [firestore, session.otherUserId])

  useEffect(() => {
    if (!database || !session.otherUserId) return
    const presenceRef = ref(database, `users/${session.otherUserId}/presence`)
    return onValue(presenceRef, (snap) => {
      const val = snap.val()
      setPresence(val || { online: false })
    })
  }, [database, session.otherUserId])

  const handleTouchStart = () => {
    timerRef.current = setTimeout(() => {
      onLongPress(session.otherUserId)
    }, 600)
  }

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
  }

  const name = isDataLoaded 
    ? (otherUserData?.isSupport ? "Customer Support" : (otherUserData?.username || "User")) 
    : ""
  const image = (otherUserData?.profilePhotoUrls && otherUserData.profilePhotoUrls[0]) || ""
  const isVerified = !!otherUserData?.isVerified

  return (
    <div
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      <Link 
        href={`/chat/${session.otherUserId}`} 
        className="flex items-center gap-3 py-2.5 hover:bg-slate-50/80 rounded-2xl px-2 transition-all group active:scale-[0.98]"
      >
        <div className="relative shrink-0">
          <Avatar className="w-12 h-12 border border-gray-100 shadow-sm bg-gray-50">
            {image && <AvatarImage src={image} className="object-cover" />}
            <AvatarFallback className="bg-transparent text-gray-300">
              {isDataLoaded && name ? name[0] : ''}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            "absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full shadow-sm",
            presence.online ? "bg-green-500" : "bg-gray-300"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-0">
            <div className="flex items-center gap-1 truncate">
              <h3 className={cn(
                "font-bold text-sm truncate font-headline min-h-[1.25rem]",
                name === "User logged out" ? "text-gray-400 font-medium italic" : "text-gray-900"
              )}>
                {isDataLoaded ? name : ""}
              </h3>
              {isVerified && <CheckCircle className="w-3 h-3 text-blue-500 fill-blue-500/10 shrink-0" />}
            </div>
            {session.timestamp && (
              <span className="text-[9px] font-bold text-gray-400">
                {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <p className={cn("text-[11px] truncate font-medium flex-1", session.unreadCount > 0 ? "text-gray-900 font-black" : "text-gray-500")}>
              {session.lastMessage || "Start a conversation"}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {session.unreadCount > 0 && (
                <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-white shadow-sm shadow-primary/20">
                  {session.unreadCount}
                </span>
              )}
              {presence.online && (
                <span className="text-[9px] font-black text-green-500 uppercase tracking-tighter shrink-0">Online</span>
              )}
            </div>
          </div>
        </div>
        
        <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-primary transition-colors" />
      </Link>
    </div>
  )
}

export default function ChatListPage() {
  const { database, firestore } = useFirebase()
  const { user: currentUser } = useUser()
  const [sessions, setSessions] = useState<any[]>(cachedSessions)
  const [hasFetched, setHasFetched] = useState(cachedLoaded)
  const [hidingTarget, setHidingTarget] = useState<string | null>(null)
  const [isHiding, setIsHiding] = useState(false)

  const blockedQuery = useMemoFirebase(() => currentUser ? collection(firestore, 'userProfiles', currentUser.uid, 'blockedUsers') : null, [firestore, currentUser])
  const { data: blockedUsers } = useCollection(blockedQuery)

  useEffect(() => {
    if (!database || !currentUser) return
    const userChatsRef = ref(database, `users/${currentUser.uid}/chats`)
    return onValue(userChatsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const sessionList = Object.entries(data).map(([key, val]: [string, any]) => ({
          otherUserId: key,
          ...val
        }))
        sessionList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        setSessions(sessionList)
        cachedSessions = sessionList
      } else {
        setSessions([])
        cachedSessions = []
      }
      setHasFetched(true)
      cachedLoaded = true
    })
  }, [database, currentUser])

  const handleHideChat = async () => {
    if (!currentUser || !hidingTarget || !database) return
    setIsHiding(true)
    try {
      const updates: any = {}
      updates[`/users/${currentUser.uid}/chats/${hidingTarget}/hidden`] = true
      updates[`/users/${currentUser.uid}/chats/${hidingTarget}/unreadCount`] = 0
      await update(ref(database), updates)
      setHidingTarget(null)
    } catch (e) {
      console.error("Failed to delete chat", e)
    } finally {
      setIsHiding(false)
    }
  }

  const blockedIds = new Set(blockedUsers?.map(b => b.id) || [])
  const filteredSessions = sessions.filter(s => !blockedIds.has(s.otherUserId) && !s.hidden)

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
          {filteredSessions.length > 0 ? (
            <div className="flex flex-col gap-1 pb-10">
              {filteredSessions.map((session) => (
                <ChatSessionItem 
                  key={session.otherUserId} 
                  session={session} 
                  onLongPress={setHidingTarget} 
                />
              ))}
              <div className="py-8 flex justify-center">
                 <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">No more chats</p>
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
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
