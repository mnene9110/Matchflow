
"use client"

import { useState, useEffect, useRef } from "react"
import { MessageSquare, CheckCircle, Loader2, RotateCcw } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useFirebase } from "@/firebase/provider"
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/firebase/auth/use-auth"
import { cn } from "@/lib/utils"

function ChatSessionItem({ session, currentUserId }: { session: any, currentUserId: string }) {
  const router = useRouter()
  const { firestore } = useFirebase()
  const otherUserId = session.participants.find((p: string) => p !== currentUserId)
  const [otherUser, setOtherUser] = useState<any>(null)

  useEffect(() => {
    if (!otherUserId) return;
    const fetchOther = async () => {
      const docRef = doc(firestore, 'userProfiles', otherUserId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setOtherUser(snap.data());
      }
    };
    fetchOther();
  }, [otherUserId, firestore]);

  const name = otherUser?.username || "User"
  const image = (otherUser?.profilePhotoUrls && otherUser.profilePhotoUrls[0]) || ""

  return (
    <div 
      onClick={() => router.push(`/chat/${otherUserId}`)}
      className="flex items-center gap-4 py-4 hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer border-b border-gray-50"
    >
      <div className="relative shrink-0">
        <Avatar className="w-16 h-16 border-2 border-white shadow-sm bg-gray-50">
          {image && <AvatarImage src={image} className="object-cover" />}
          <AvatarFallback className="bg-gray-100 text-gray-300">{name[0]}</AvatarFallback>
        </Avatar>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-black text-base truncate text-[#3BC1A8]">{name}</h3>
            {otherUser?.isVerified && <CheckCircle className="w-4 h-4 text-blue-500 fill-current" />}
          </div>
        </div>
        <p className="text-[13px] truncate font-bold text-gray-400">
          {session.lastMessage || "Start a conversation"}
        </p>
      </div>
    </div>
  )
}

export default function ChatListPage() {
  const { auth, firestore } = useFirebase()
  const { user, isLoading: isAuthLoading } = useAuth(auth)
  const [sessions, setSessions] = useState<any[]>([])
  const [isSyncing, setIsSyncing] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!user) return;

    const chatsQuery = query(
      collection(firestore, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSessions(chatList);
      setIsSyncing(false);
    }, (error) => {
      console.error("Chat list error:", error);
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  return (
    <div className="flex flex-col h-svh pb-20 bg-white">
      <header className="bg-[#3BC1A8] pt-[env(safe-area-inset-top)] pb-3 px-6 sticky top-0 z-20 shrink-0">
        <div className="flex items-center justify-between pt-6">
          <h1 className="text-3xl font-logo text-white drop-shadow-sm">Chats</h1>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white fill-current" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 pt-2 bg-white overflow-y-auto">
        {isAuthLoading || (isSyncing && sessions.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 opacity-10">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
        ) : sessions.length > 0 ? (
          sessions.map(s => <ChatSessionItem key={s.id} session={s} currentUserId={user!.uid} />)
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
