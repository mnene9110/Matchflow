"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Sparkles, ClipboardList, RotateCcw, Globe, Loader2, CheckCircle } from "lucide-react"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, limit, getDocs, startAfter, orderBy, DocumentData, QueryDocumentSnapshot, where, doc } from "firebase/firestore"
import { ref, onValue, set, get } from "firebase/database"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

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
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  const currentUserRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc(currentUserRef)

  // One-time Sync Balance if RTDB is empty but Firestore has coins
  useEffect(() => {
    if (!database || !currentUser || isProfileLoading || !currentUserProfile) return;

    const syncBalance = async () => {
      const rtdbRef = ref(database, `users/${currentUser.uid}`);
      const snap = await get(rtdbRef);
      const data = snap.val();

      // If coinBalance doesn't exist in RTDB but profile has it in Firestore, bridge it.
      if (!data || data.coinBalance === undefined) {
        set(rtdbRef, {
          ...data,
          coinBalance: currentUserProfile.coinBalance || 0,
          diamondBalance: currentUserProfile.diamondBalance || 0,
          presence: { online: true, lastSeen: Date.now() },
          inCall: false
        });
      }
    }
    syncBalance();
  }, [database, currentUser, isProfileLoading, !!currentUserProfile]);

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

  useEffect(() => {
    if (!firestore || !currentUser || isProfileLoading || !currentUserProfile) return
    
    async function fetchInitialUsers() {
      setIsInitialLoading(true)
      try {
        const currentGender = currentUserProfile?.gender?.toLowerCase() || 'male'
        const targetGender = currentGender === 'male' ? 'female' : 'male'

        const q = query(
          collection(firestore, 'userProfiles'), 
          where('gender', '==', targetGender),
          orderBy('createdAt', 'desc'),
          limit(20)
        )
        
        const snap = await getDocs(q)
        if (snap.empty) {
          setHasMore(false)
          setUsers([])
          return
        }

        const fetchedUsers = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.id !== currentUser?.uid && !u.isSupport)
          .slice(0, 10)
        
        setUsers(fetchedUsers)
        setLastVisible(snap.docs[snap.docs.length - 1])
        if (snap.docs.length < 10) setHasMore(false)
      } catch (error) {
        console.error("Error fetching initial users:", error)
      } finally {
        setIsInitialLoading(false)
      }
    }

    fetchInitialUsers()
  }, [firestore, currentUser, isProfileLoading, currentUserProfile?.gender])

  const loadMore = async () => {
    if (!firestore || !lastVisible || isLoadingMore || !hasMore || !currentUserProfile) return
    setIsLoadingMore(true)

    try {
      const currentGender = currentUserProfile?.gender?.toLowerCase() || 'male'
      const targetGender = currentGender === 'male' ? 'female' : 'male'

      const q = query(
        collection(firestore, 'userProfiles'),
        where('gender', '==', targetGender),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(15)
      )

      const snap = await getDocs(q)
      if (snap.empty) {
        setHasMore(false)
        setIsLoadingMore(false)
        return
      }

      const nextUsers = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== currentUser?.uid && !u.isSupport)

      if (nextUsers.length > 0) {
        setUsers(prev => [...prev, ...nextUsers])
        setLastVisible(snap.docs[snap.docs.length - 1])
      }
      
      if (snap.docs.length < 15) setHasMore(false)
    } catch (error) {
      console.error("Error loading more users:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const mappedUsers = users.map(u => ({
    id: u.id,
    name: u.username || "Match",
    location: u.location || "Kenya",
    isOnline: !!presenceData[u.id],
    isVerified: !!u.isVerified,
    image: (u.profilePhotoUrls && u.profilePhotoUrls[0]) || `https://picsum.photos/seed/${u.id}/400/600`
  }))

  const displayUsers = activeTab === 'nearby' 
    ? mappedUsers.filter(u => u.location.toLowerCase().includes('kenya') || u.location.toLowerCase().includes('nearby'))
    : mappedUsers;

  const darkMaroon = "bg-[#5A1010]";

  return (
    <div className="flex flex-col h-svh bg-transparent overflow-y-auto pb-32">
      <div className="pt-4 px-4 grid grid-cols-2 gap-3 shrink-0">
        <button className={cn("flex flex-col items-center justify-center gap-2 rounded-[2rem] py-6 shadow-xl group active:scale-95 transition-all", darkMaroon)}>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-black text-[9px] tracking-[0.1em] uppercase">Mystery Note</span>
        </button>

        <button 
          onClick={() => router.push('/task-center')}
          className="flex flex-col items-center justify-center gap-2 bg-white/40 backdrop-blur-md border border-white/20 rounded-[2rem] py-6 group active:scale-95 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-[#5A1010]" />
          </div>
          <span className="text-[#5A1010] font-black text-[9px] tracking-[0.1em] uppercase">Task Center</span>
        </button>
      </div>

      <div className="sticky top-0 z-30 px-4 py-6 bg-transparent shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-14 bg-white/40 backdrop-blur-md border border-white/30 rounded-full p-1 flex items-center shadow-lg shadow-black/5">
            <button 
              onClick={() => setActiveTab('recommend')}
              className={cn(
                "flex-1 h-full rounded-full text-[9px] font-black uppercase tracking-[0.15em] transition-all",
                activeTab === 'recommend' ? cn(darkMaroon, "text-white") : "text-gray-50"
              )}
            >
              Recommend
            </button>
            <button 
              onClick={() => setActiveTab('nearby')}
              className={cn(
                "flex-1 h-full rounded-full text-[9px] font-black uppercase tracking-[0.15em] transition-all",
                activeTab === 'nearby' ? cn(darkMaroon, "text-white") : "text-gray-50"
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

      <main className="px-4 grid grid-cols-2 gap-3 pb-8 flex-1">
        {displayUsers.map((user) => (
          <div key={user.id} className="group relative aspect-[3/4.2] rounded-[2.5rem] overflow-hidden bg-white/20 shadow-md transition-transform active:scale-95" onClick={() => router.push(`/profile/${user.id}`)}>
            <div className="absolute inset-0 z-0">
              <Image src={user.image} alt={user.name} fill className="object-cover transition-transform group-hover:scale-110 duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </div>

            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                router.push(`/chat/${user.id}`); 
              }}
              className="absolute top-3 right-3 h-8 px-4 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center z-10 active:bg-white active:scale-90 transition-all"
            >
              <span className="text-[8px] font-black text-white group-active:text-primary uppercase tracking-[0.1em]">Chat</span>
            </button>

            <div className="absolute inset-x-0 bottom-0 p-4 z-10 pointer-events-none">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="flex items-center gap-1">
                  <h3 className="text-white font-black text-xs truncate max-w-[80px]">{user.name}</h3>
                  {user.isVerified && <CheckCircle className="w-3 h-3 text-blue-400 fill-blue-400/20" />}
                </div>
                <div className={cn("w-1.5 h-1.5 rounded-full", user.isOnline ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" : "bg-gray-400")} />
              </div>
              <div className="flex items-center gap-1 opacity-80">
                <Globe className="w-2.5 h-2.5 text-white/60" />
                <span className="text-[8px] font-bold text-white uppercase tracking-wider">{user.location}</span>
              </div>
            </div>
          </div>
        ))}

        {(isInitialLoading || isProfileLoading) && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/4.2] rounded-[2.5rem] bg-white/20 animate-pulse" />
        ))}

        {!(isInitialLoading || isProfileLoading) && displayUsers.length === 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center py-20 text-center opacity-40">
            <Globe className="w-12 h-12 text-white mb-4" />
            <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">No more users to show</p>
          </div>
        )}

        {hasMore && !(isInitialLoading || isProfileLoading) && (
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
