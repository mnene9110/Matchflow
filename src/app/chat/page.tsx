"use client"

import { useState, useEffect, useMemo } from "react"
import { Navbar } from "@/components/Navbar"
import { Loader2, MessageSquare, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue } from "firebase/database"
import { doc, getDoc } from "firebase/firestore"
import { cn } from "@/lib/utils"

function ChatSessionItem({ session }: { session: any }) {
  const { firestore, database } = useFirebase()
  const [otherUserData, setOtherUserData] = useState<any>(null)
  const [presence, setPresence] = useState<{ online: boolean; lastSeen?: number }>({ online: false })

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
    return `Last seen ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [presence]);

  const name = otherUserData?.username || `User ${session.otherUserId?.slice(0, 4)}`
  const image = (otherUserData?.profilePhotoUrls && otherUserData.profilePhotoUrls[0]) || `https://picsum.photos/seed/${session.otherUserId}/100/100`

  return (
    <Link 
      href={`/chat/${session.otherUserId}`} 
      className="flex items-center gap-4 py-4 hover:bg-slate-50/80 rounded-3xl px-3 transition-all group active:scale-[0.98]"
    >
      <div className="relative shrink-0">
        <Avatar className="w-16 h-16 border-2 border-white shadow-lg ring-2 ring-primary/5">
          <AvatarImage src={image} className="object-cover" />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div className={cn(
          "absolute bottom-0 right-0 w-4.5 h-4.5 border-2 border-white rounded-full shadow-sm transition-all duration-500",
          presence.online ? "bg-green-500 scale-110" : "bg-gray-300"
        )} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <h3 className="font-bold text-sm text-gray-900 truncate font-headline">{name}</h3>
          {session.timestamp && (
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
              {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[12px] text-gray-500 truncate font-medium flex-1">
            {session.lastMessage || "Start a conversation"}
          </p>
          <span className="text-[9px] font-black text-primary/40 uppercase tracking-tighter shrink-0">{presenceText}</span>
        </div>
      </div>
      
      <ChevronRight className="w-5 h-5 text-gray-200 group-hover:text-primary transition-colors" />
    </Link>
  )
}

export default function ChatListPage() {
  const { database } = useFirebase()
  const { user: currentUser } = useUser()
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
      setIsLoading(false)
    })
  }, [database, currentUser])

  return (
    <div className="flex flex-col min-h-svh pb-24 bg-transparent">
      <header className="bg-transparent pt-12 pb-6 px-6 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-logo text-white relative flex items-center gap-3">
            Chats
            <MessageSquare className="w-8 h-8 text-white/30" />
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 bg-white rounded-t-[3.5rem] shadow-2xl pt-8">
        <section className="space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Syncing flows...</p>
            </div>
          ) : sessions.length > 0 ? (
            <div className="flex flex-col gap-2">
              {sessions.map((session) => (
                <ChatSessionItem key={session.otherUserId} session={session} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 font-medium gap-6">
              <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border border-gray-100 shadow-inner">
                <MessageSquare className="w-10 h-10 text-gray-200" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-bold text-gray-900">Your flow is quiet</p>
                <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">Head to Discover and send an icebreaker to get started.</p>
              </div>
              <Link href="/discover">
                <Button className="rounded-full px-8 bg-primary hover:bg-primary shadow-lg shadow-primary/20 font-black text-xs uppercase">Find Matches</Button>
              </Link>
            </div>
          )}
        </section>
      </main>

      <Navbar />
    </div>
  )
}
