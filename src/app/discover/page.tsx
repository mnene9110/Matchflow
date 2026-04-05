
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { RotateCcw, Globe, Loader2, CheckCircle, Sparkles, ClipboardList } from "lucide-react"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, limit, getDocs, startAfter, orderBy, DocumentData, QueryDocumentSnapshot, where, doc } from "firebase/firestore"
import { ref, update, get } from "firebase/database"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

// ECONOMY: Session-based feed caching
let cachedUsers: any[] = []
let cachedLastVisible: QueryDocumentSnapshot<DocumentData> | null = null
let cachedHasMore: boolean = true
let cachedInitialLoaded: boolean = false
let cachedPresenceMap: Record<string, boolean> = {}

export function clearDiscoverCache() {
  cachedUsers = []
  cachedLastVisible = null
  cachedHasMore = true
  cachedInitialLoaded = false
  cachedPresenceMap = {}
}

// Utility to shuffle an array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<'recommend' | 'nearby'>('recommend')
  const { firestore, database } = useFirebase()
  const { user: currentUser } = useUser()
  const router = useRouter()

  const [users, setUsers] = useState<any[]>(cachedUsers)
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(cachedLastVisible)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(cachedHasMore)
  const [isInitialLoading, setIsInitialLoading] = useState(!cachedInitialLoaded)
  const [userPresenceMap, setUserPresenceMap] = useState<Record<string, boolean>>(cachedPresenceMap)

  const currentUserRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc(currentUserRef)

  useEffect(() => {
    if (!database || !currentUser || isProfileLoading || !currentUserProfile) return;

    const syncBalanceIfMissing = async () => {
      const rtdbRef = ref(database, `users/${currentUser.uid}`);
      const snap = await get(rtdbRef);
      const data = snap.val();

      if (!data || data.coinBalance === undefined) {
        update(rtdbRef, {
          coinBalance: currentUserProfile.coinBalance || 0,
          diamondBalance: currentUserProfile.diamondBalance || 0,
          inCall: false
        });
      }
    }
    syncBalanceIfMissing();
  }, [database, currentUser, isProfileLoading, !!currentUserProfile]);

  const processAndSortUsers = async (fetchedUsers: any[]) => {
    if (!database) return fetchedUsers;

    const currentMap: Record<string, boolean> = { ...userPresenceMap };
    
    // Fetch presence snapshots (NOT listeners) to ensure static UI
    await Promise.all(fetchedUsers.map(async (u) => {
      try {
        const pRef = ref(database, `users/${u.id}/presence/online`);
        const snap = await get(pRef);
        currentMap[u.id] = snap.val() === true;
      } catch (e) {
        currentMap[u.id] = false;
      }
    }));

    setUserPresenceMap(currentMap);
    cachedPresenceMap = currentMap;

    const onlineUsers = fetchedUsers.filter(u => currentMap[u.id]);
    const offlineUsers = fetchedUsers.filter(u => !currentMap[u.id]);

    // Shuffle within groups to keep feed interesting, but maintain strict status ordering
    return [...shuffleArray(onlineUsers), ...shuffleArray(offlineUsers)];
  }

  const fetchUsers = async (isRefresh = false) => {
    if (!firestore || !currentUser || isProfileLoading || !currentUserProfile) return;
    
    if (isRefresh) {
      setIsInitialLoading(true);
    } else if (cachedInitialLoaded) {
      setIsInitialLoading(false);
      return;
    }

    try {
      const currentGender = (currentUserProfile?.gender || 'male').toLowerCase()
      const targetGender = currentGender === 'male' ? 'female' : 'male'

      const q = query(
        collection(firestore, 'userProfiles'), 
        where('gender', '==', targetGender),
        orderBy('createdAt', 'desc'),
        limit(24)
      )
      
      const snap = await getDocs(q)
      if (snap.empty) {
        setHasMore(false);
        cachedHasMore = false;
        setUsers([]);
        cachedUsers = [];
        return;
      }

      const fetchedRaw = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== currentUser?.uid && !u.isSupport)
      
      const processed = await processAndSortUsers(fetchedRaw);
      
      setUsers(processed);
      cachedUsers = processed;
      
      const last = snap.docs[snap.docs.length - 1];
      setLastVisible(last);
      cachedLastVisible = last;
      
      const more = snap.docs.length >= 20;
      setHasMore(more);
      cachedHasMore = more;
      
      cachedInitialLoaded = true;
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsInitialLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers();
  }, [firestore, currentUser, isProfileLoading, currentUserProfile?.gender]);

  const loadMore = async () => {
    if (!firestore || !lastVisible || isLoadingMore || !hasMore || !currentUserProfile) return
    setIsLoadingMore(true)

    try {
      const currentGender = (currentUserProfile?.gender || 'male').toLowerCase()
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
        cachedHasMore = false
        setIsLoadingMore(false)
        return
      }

      const fetchedRaw = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== currentUser?.uid && !u.isSupport)

      if (fetchedRaw.length > 0) {
        const processedBatch = await processAndSortUsers(fetchedRaw);
        const updatedUsers = [...users, ...processedBatch]
        setUsers(updatedUsers)
        cachedUsers = updatedUsers
        
        const last = snap.docs[snap.docs.length - 1]
        setLastVisible(last)
        cachedLastVisible = last
      }
      
      const more = snap.docs.length >= 15
      setHasMore(more)
      cachedHasMore = more
    } catch (error) {
      console.error("Error loading more users:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleRefresh = async () => {
    clearDiscoverCache();
    await fetchUsers(true);
  }

  const mappedUsers = users.map(u => ({
    id: u.id,
    name: u.username || "Match",
    location: u.location || "Kenya",
    isVerified: !!u.isVerified,
    isOnline: !!userPresenceMap[u.id],
    image: (u.profilePhotoUrls && u.profilePhotoUrls[0]) || `https://picsum.photos/seed/${u.id}/400/600`
  }))

  const displayUsers = activeTab === 'nearby' && currentUserProfile?.location
    ? mappedUsers.filter(u => u.location.toLowerCase() === currentUserProfile.location.toLowerCase())
    : mappedUsers;

  return (
    <div className="flex flex-col h-svh bg-transparent overflow-y-auto pb-32">
      <div className="sticky top-0 z-30 px-4 py-8 bg-transparent shrink-0 space-y-6">
        {/* Mystery Note and Task Center Row - Reduced Height */}
        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <button 
            onClick={() => router.push('/mystery-note')}
            className="flex flex-col items-center justify-center gap-3 h-32 bg-[#8B0000] rounded-[2.5rem] shadow-2xl shadow-black/20 active:scale-95 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-transform group-hover:scale-110">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Mystery Note</span>
          </button>
          
          <button 
            onClick={() => router.push('/task-center')}
            className="flex flex-col items-center justify-center gap-3 h-32 bg-[#F2DADA] rounded-[2.5rem] shadow-2xl shadow-black/5 active:scale-95 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-[#8B0000]/10 flex items-center justify-center transition-transform group-hover:scale-110">
              <ClipboardList className="w-5 h-5 text-[#8B0000]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8B0000]">Task Center</span>
          </button>
        </div>

        {/* Navigation Tabs and Refresh Row */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-16 bg-white/30 backdrop-blur-xl border border-white/20 rounded-full p-1.5 flex items-center shadow-lg">
            <button 
              onClick={() => setActiveTab('recommend')}
              className={cn(
                "flex-1 h-full rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                activeTab === 'recommend' ? "bg-[#8B0000] text-white shadow-lg" : "text-[#6B7280]"
              )}
            >
              Recommend
            </button>
            <button 
              onClick={() => setActiveTab('nearby')}
              className={cn(
                "flex-1 h-full rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                activeTab === 'nearby' ? "bg-[#8B0000] text-white shadow-lg" : "text-[#6B7280]"
              )}
            >
              Nearby
            </button>
          </div>
          
          <button 
            onClick={handleRefresh} 
            className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-xl border border-white/20 flex items-center justify-center active:rotate-180 transition-all duration-700 shadow-lg"
          >
            {isInitialLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#8B0000]" />
            ) : (
              <RotateCcw className="w-5 h-5 text-[#6B7280]" />
            )}
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

            {user.isOnline && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[7px] font-black text-white uppercase tracking-tighter">Online</span>
              </div>
            )}

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
            <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">No users {activeTab === 'nearby' ? 'in your country' : ''} found</p>
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
