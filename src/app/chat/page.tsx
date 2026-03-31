
"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/Navbar"
import { Mail, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue } from "firebase/database"
import { cn } from "@/lib/utils"

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
        setSessions(sessionList)
      } else {
        setSessions([])
      }
      setIsLoading(false)
    })
  }, [database, currentUser])

  return (
    <div className="flex flex-col min-h-svh pb-24 bg-transparent">
      <header className="bg-transparent pt-10 pb-4 px-6 sticky top-0 z-20">
        <div className="flex items-center">
          <h1 className="text-3xl font-headline font-black text-white relative">
            Chat
            <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary rounded-full" />
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 mt-4 bg-white rounded-t-[3rem] shadow-2xl pt-6">
        <section>
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : sessions.length > 0 ? (
            sessions.map((session) => {
              const otherUserId = session.otherUserId
              const sessionName = `User ${otherUserId.slice(0, 4)}`
              const sessionImage = `https://picsum.photos/seed/${otherUserId}/100/100`

              return (
                <Link 
                  key={session.otherUserId} 
                  href={`/chat/${otherUserId}`} 
                  className="flex items-center gap-4 py-4 hover:bg-gray-50/50 rounded-2xl px-2 transition-colors group"
                >
                  <div className="relative shrink-0">
                    <Avatar className="w-14 h-14 border-2 border-white shadow-sm">
                      <AvatarImage src={sessionImage} className="object-cover" />
                      <AvatarFallback>{sessionName[0]}</AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-gray-900 truncate">{sessionName}</h3>
                    <p className="text-[13px] text-gray-400 truncate font-medium">
                      {session.lastMessage || "Start a conversation"}
                    </p>
                  </div>
                </Link>
              )
            })
          ) : (
            <div className="text-center py-20 text-gray-400 font-medium">
              No active conversations yet.
            </div>
          )}

          <div className="flex items-center gap-4 py-6 px-2 mt-2 border-t border-gray-50 opacity-60">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-gray-900">Expired Messages</h3>
              <p className="text-xs text-gray-400 font-medium">History of old conversations</p>
            </div>
          </div>
        </section>
      </main>

      <Navbar />
    </div>
  )
}
