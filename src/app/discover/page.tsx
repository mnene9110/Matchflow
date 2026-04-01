
"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { Sparkles, ClipboardList, RotateCcw, Globe, Loader2 } from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { collection, query, limit, getDocs, startAfter, orderBy, DocumentData, QueryDocumentSnapshot, onSnapshot } from "firebase/firestore"
import { ref, onValue } from "firebase/database"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

/**
 * @fileOverview Discovery screen for finding matches.
 * Implements pagination (10 users at a time) and optimized loading.
 */
export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<'recommend' | 'nearby'>('recommend')
  const { firestore, database } = useFirebase()
  const { user: currentUser } = useUser()
  const router = useRouter()

  const [users, setUsers] = useState<any[]>([])
  const [presenceData, setPresenceData] = useState<Record<string, boolean>>({})
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  // Fetch presence once
  useEffect(() => {
    if (!database) return
    const presenceRef = ref(database, 'users')
    return onValue(presenceRef, (snapshot) => {
      const usersVal = snapshot.val()
      if (usersVal) {
        const statuses: Record<string, boolean> = {}
        Object.entries(usersVal).forEach(([uid, data]: [string, any]) => {
          statuses[uid] = !!data.presence?.online
        })
        setPresenceData(statuses)
      }
    })
  }, [database])

  // Initial Fetch (Paginated)
  useEffect(() => {
    if (!firestore || !currentUser) return
    
    async function fetchInitialUsers() {
      const q = query(
        collection(firestore, 'userProfiles'), 
        orderBy('createdAt', 'desc'),
        limit(10)
      )
      
      const snap = await getDocs(q)
      if (snap.empty) {
        setHasMore(false)
        return
      }

      const fetchedUsers = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== currentUser.uid)
      
      setUsers(fetchedUsers)
      setLastVisible(snap.docs[snap.docs.length - 1])
      if (snap.docs.length < 10) setHasMore(false)
    }

    fetchInitialUsers()
  }, [firestore, currentUser])

  const loadMore = async () => {
    if (!firestore || !lastVisible || isLoadingMore || !hasMore) return
    setIsLoadingMore(true)

    const q = query(
      collection(firestore, 'userProfiles'),
      orderBy('createdAt', 'desc'),
      startAfter(lastVisible),
      limit(10)
    )

    const snap = await getDocs(q)
    if (snap.empty) {
      setHasMore(false)
      setIsLoadingMore(false)
      return
    }

    const nextUsers = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(u => u.id !== currentUser?.uid)

    setUsers(prev => [...prev, ...nextUsers])
    setLastVisible(snap.docs[snap.docs.length - 1])
    if (snap.docs.length < 10) setHasMore(false)
    setIsLoadingMore(false)
  }

  const mappedUsers = users.map(u => ({
    id: u.id,
    name: u.username || "Match",
    location: u.location || "Kenya",
    isOnline: !!presenceData[u.id],
    image: (u.profilePhotoUrls && u.profilePhotoUrls[0]) || `https://picsum.photos/seed/${u.id}/400/600`
  }))

  const displayUsers = activeTab === 'nearby' 
    ? mappedUsers.filter(u => u.location.toLowerCase().includes('kenya') || u.location.toLowerCase().includes('nearby'))
    : mappedUsers;

  const darkMaroon = "bg-[#5A1010]";

  return (
    <div className="flex flex-col min-h-svh pb-32 bg-transparent">
      <div className="pt-4 px-4 grid grid-cols-2 gap-3">
        <button className={cn("flex flex-col items-center justify-center gap-2 rounded-[2rem] py-6 shadow-xl group active:scale-95 transition-all", darkMaroon)}>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-black text-[9px] tracking-[0.1em] uppercase">Mystery Note</span>
        </button>

        <button className="flex flex-col items-center justify-center gap-2 bg-white/40 backdrop-blur-md border border-white/20 rounded-[2rem] py-6 group active:scale-95 transition-all">
          <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-[#5A1010]" />
          </div>
          <span className="text-[#5A1010] font-black text-[9px] tracking-[0.1em] uppercase">Task Center</span>
        </button>
      </div>

      <div className="sticky top-0 z-30 px-4 py-6 bg-transparent">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-14 bg-white/40 backdrop-blur-md border border-white/30 rounded-full p-1 flex items-center shadow-lg shadow-black/5">
            <button 
              onClick={() => setActiveTab('recommend')}
              className={cn(
                "flex-1 h-full rounded-full text-[9px] font-black uppercase tracking-[0.15em] transition-all",
                activeTab === 'recommend' ? cn(darkMaroon, "text-white") : "text-gray-500"
              )}
            >
              Recommend
            </button>
            <button 
              onClick={() => setActiveTab('nearby')}
              className={cn(
                "flex-1 h-full rounded-full text-[9px] font-black uppercase tracking-[0.15em] transition-all",
                activeTab === 'nearby' ? cn(darkMaroon, "text-white") : "text-gray-500"
              )}
            >
              Nearby
            </button>
          </div>
          <button onClick={() => window.location.reload()} className="w-14 h-14 rounded-full bg-white/40 backdrop-blur-md border border-white/30 flex items-center justify-center active:rotate-180 transition-all duration-500 shadow-lg shadow-black/5">
            <RotateCcw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <main className="px-4 grid grid-cols-2 gap-3 pb-8">
        {displayUsers.map((user) => (
          <div key={user.id} className="group relative aspect-[3/4.2] rounded-[2.5rem] overflow-hidden bg-white/20 shadow-md transition-transform active:scale-95">
            <div onClick={() => router.push(`/profile/${user.id}`)} className="absolute inset-0 z-0">
              <Image src={user.image} alt={user.name} fill className="object-cover transition-transform group-hover:scale-110 duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); router.push(`/chat/${user.id}`); }}
              className="absolute top-3 right-3 h-8 px-4 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center z-10"
            >
              <span className="text-[8px] font-black text-white uppercase tracking-[0.1em]">Chat</span>
            </button>

            <div className="absolute inset-x-0 bottom-0 p-4 z-10">
              <div className="flex items-center gap-1.5 mb-1.5">
                <h3 className="text-white font-black text-xs">{user.name}</h3>
                <div className={cn("w-1.5 h-1.5 rounded-full", user.isOnline ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" : "bg-gray-400")} />
              </div>
              <div className="flex items-center gap-1 opacity-80">
                <Globe className="w-2.5 h-2.5 text-[#5A1010]" />
                <span className="text-[8px] font-bold text-white uppercase tracking-wider">{user.location}</span>
              </div>
            </div>
          </div>
        ))}

        {hasMore && (
          <div className="col-span-2 flex justify-center py-8">
            <Button 
              variant="ghost" 
              onClick={loadMore} 
              disabled={isLoadingMore}
              className="h-12 px-8 rounded-full bg-white/40 backdrop-blur-md border border-white/30 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-white"
            >
              {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load More"}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
