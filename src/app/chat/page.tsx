
"use client"

import { useState, useEffect, useMemo } from "react"
import { MessageSquare, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { ref, onValue } from "firebase/database"
import { doc, getDoc, collection } from "firebase/firestore"
import { cn } from "@/lib/utils"

function ChatSessionItem({ session }: { session: any }) {
  const { firestore, database } = useFirebase()
  const [otherUserData, setOtherUserData] = useState<any>(null)
  const [presence, setPresence] = useState<{ online: boolean; lastSeen?: number }>({ online: false })
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      if (!firestore || !session.otherUserId) return
      try {
        const userDoc = await getDoc(doc(firestore, "userProfiles", session.otherUserId))
        if (userDoc.exists()) {
          setOtherUserData(userDoc.data())
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

  const presenceText = useMemo(() => {
    if (presence.online) return "Online";
    if (!presence.lastSeen) return "Offline";
    const date = new Date(presence.lastSeen);
    const now = new Date();
    const diffInDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (diffInDays > 2) return "Offline";
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  }, [presence]);

  // Use a stable empty state while loading to prevent name flickering
  const name = isDataLoaded ? (otherUserData?.username || "User") : ""
  const image = (otherUserData?.profilePhotoUrls && otherUserData.profilePhotoUrls[0]) || ""

  return (
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
          <h3 className="font-bold text-sm text-gray-900 truncate font-headline min-h-[1.25rem]">
            {isDataLoaded ? name : ""}
          </h3>
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
            <span className="text-[9px] font-bold text-primary/40 uppercase tracking-tighter shrink-0">{presence.online ? "Online" : presenceText}</span>
          </div>
        </div>
      </div>
      
      <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-primary transition-colors" />
    </Link>
  )
}

export default function ChatListPage() {
  const { database, firestore } = useFirebase()
  const { user: currentUser } = useUser()
  const [sessions, setSessions] = useState<any[]>([])
  const [hasFetched, setHasFetched] = useState(false)

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
      } else {
        setSessions([])
      }
      setHasFetched(true)
    })
  }, [database, currentUser])

  const blockedIds = new Set(blockedUsers?.map(b => b.id) || [])
  const filteredSessions = sessions.filter(s => !blockedIds.has(s.otherUserId))

  return (
    <div className="flex flex-col min-h-svh pb-20 bg-transparent">
      <header className="bg-transparent pt-8 pb-4 px-6 sticky top-0 z-20">
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
            <div className="flex flex-col gap-1">
              {filteredSessions.map((session) => (
                <ChatSessionItem key={session.otherUserId} session={session} />
              ))}
            </div>
          ) : hasFetched ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 font-medium gap-4">
              <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center border border-gray-100">
                <MessageSquare className="w-8 h-8 text-gray-200" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-gray-900">No chats yet</p>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}
