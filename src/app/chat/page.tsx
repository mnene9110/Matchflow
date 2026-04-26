"use client"

import { useState, useEffect, useCallback } from "react"
import { MessageSquare, CheckCircle, Loader2, RotateCcw, Plus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useFirebase } from "@/firebase/provider"
import { collection, query, where, orderBy, limit, getDocs, startAfter, doc, getDoc, QueryDocumentSnapshot, DocumentData } from "firebase/firestore"
import { useAuth } from "@/firebase/auth/use-auth"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 15;

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
      className="flex items-center gap-4 py-4 hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer border-b border-gray-50 animate-in fade-in"
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
  const { user } = useAuth(auth)
  const router = useRouter()

  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchChats = useCallback(async (isLoadMore = false) => {
    if (!user) return;

    if (isLoadMore) setIsLoadingMore(true);
    else {
      setIsLoading(true);
      setSessions([]);
    }

    try {
      let q = query(
        collection(firestore, "chats"),
        where("participants", "array-contains", user.uid),
        orderBy("lastMessageAt", "desc"),
        limit(PAGE_SIZE)
      );

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snap = await getDocs(q);
      
      if (snap.empty) {
        setHasMore(false);
      } else {
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLastDoc(snap.docs[snap.docs.length - 1]);
        if (items.length < PAGE_SIZE) setHasMore(false);
        setSessions(prev => isLoadMore ? [...prev, ...items] : items);
      }
    } catch (error) {
      console.error("Chat list error:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [user, firestore, lastDoc]);

  useEffect(() => {
    if (user && sessions.length === 0) {
      fetchChats();
    }
  }, [user, fetchChats]);

  return (
    <div className="flex flex-col h-svh pb-20 bg-white">
      <header className="bg-[#3BC1A8] pt-[env(safe-area-inset-top)] pb-3 px-6 sticky top-0 z-20 shrink-0">
        <div className="flex items-center justify-between pt-6">
          <h1 className="text-3xl font-logo text-white drop-shadow-sm">Chats</h1>
          <button onClick={() => fetchChats(false)} className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center text-white active:rotate-180 transition-all">
            <RotateCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 pt-2 bg-white overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 opacity-10">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
        ) : sessions.length > 0 ? (
          <div className="pb-10">
            {sessions.map(s => <ChatSessionItem key={s.id} session={s} currentUserId={user!.uid} />)}
            
            {hasMore && (
              <Button 
                onClick={() => fetchChats(true)} 
                disabled={isLoadingMore}
                variant="outline"
                className="w-full mt-4 rounded-full h-14 border-gray-100 font-black text-[10px] uppercase tracking-widest gap-2 bg-gray-50/50"
              >
                {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Load More Chats
              </Button>
            )}
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