
"use client"

import { useMemo } from "react"
import { MessageSquare, CheckCircle, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useFirebase } from "@/firebase/provider"
import { collection, query, where, orderBy, doc, limit } from "firebase/firestore"
import { useAuth } from "@/firebase/auth/use-auth"
import { useDoc } from "@/firebase/firestore/use-doc"
import { useCollection } from "@/firebase/firestore/use-collection"
import { useMemoFirebase } from "@/firebase/firestore/use-memo-firebase"
import { cn } from "@/lib/utils"

function ChatSessionItem({ session, currentUserId }: { session: any, currentUserId: string }) {
  const router = useRouter()
  const { firestore } = useFirebase()
  const otherUserId = session.participants.find((p: string) => p !== currentUserId)
  
  const otherUserRef = useMemoFirebase(() => doc(firestore, 'userProfiles', otherUserId || 'none'), [otherUserId, firestore]);
  const { data: otherUser } = useDoc(otherUserRef);

  const name = otherUser?.isSupport ? "Customer Support" : (otherUser?.username || "User")
  const image = (otherUser?.profilePhotoUrls && otherUser.profilePhotoUrls[0]) || ""
  const unreadCount = session.unreadCountMap?.[currentUserId] || 0

  return (
    <div 
      onClick={() => router.push(`/chat/${otherUserId}`)}
      className="flex items-center gap-4 py-4 hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer border-b border-gray-50 animate-in fade-in"
    >
      <div className="relative shrink-0">
        <Avatar className="w-16 h-16 border-2 border-white shadow-sm bg-gray-50">
          {image && <AvatarImage src={image} className="object-cover" />}
          <AvatarFallback className="bg-gray-100 text-gray-300">{name[0]}</AvatarFallback>
        </Avatar>
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 h-6 min-w-6 px-1.5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center shadow-lg">
            <span className="text-[10px] font-black text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-black text-base truncate text-[#3BC1A8]">{name}</h3>
            {otherUser?.isVerified && <CheckCircle className="w-4 h-4 text-blue-500 fill-current" />}
          </div>
        </div>
        <p className={cn("text-[13px] truncate", unreadCount > 0 ? "font-black text-gray-900" : "font-bold text-gray-400")}>
          {session.lastMessage || "Start a conversation"}
        </p>
      </div>
    </div>
  )
}

export default function ChatListPage() {
  const { auth, firestore } = useFirebase()
  const { user } = useAuth(auth)

  const chatsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc"),
      limit(50)
    );
  }, [user, firestore]);

  const { data: sessions, isLoading } = useCollection(chatsQuery);

  return (
    <div className="flex flex-col h-svh pb-20 bg-white">
      <header className="bg-[#3BC1A8] pt-[env(safe-area-inset-top)] pb-3 px-6 sticky top-0 z-20 shrink-0">
        <div className="flex items-center justify-between pt-6">
          <h1 className="text-3xl font-logo text-white drop-shadow-sm">Chats</h1>
        </div>
      </header>

      <main className="flex-1 px-6 pt-2 bg-white overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 opacity-10">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="pb-10">
            {sessions.map(s => <ChatSessionItem key={s.id} session={s} currentUserId={user!.uid} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400 font-medium gap-4">
            <MessageSquare className="w-10 h-10 text-gray-200" />
            <p className="text-sm font-black text-gray-900 uppercase tracking-widest">No messages yet</p>
          </div>
        )}
      </main>
    </div>
  )
}
