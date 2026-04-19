"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { RotateCcw, Loader2, CheckCircle, MapPin, Sparkles } from "lucide-react"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { 
  collection, 
  query, 
  where, 
  limit, 
  getDocs, 
  doc, 
  onSnapshot, 
  orderBy, 
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from "firebase/firestore"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

// Module-level persistent cache to avoid reloading on every entry
let cachedUsers: any[] = []
let cachedLastDoc: QueryDocumentSnapshot<DocumentData> | null = null
let cachedHasMore: boolean = true
let cachedTab: 'recommended' | 'nearby' = "recommended"
let cachedInitialLoaded: boolean = false

export function clearDiscoverCache() {
  cachedUsers = []
  cachedLastDoc = null
  cachedHasMore = true
  cachedTab = "recommended"
  cachedInitialLoaded = false
}

export default function DiscoverPage() {
  const { firestore } = useFirebase()
  const { user: currentUser } = useUser()
  const router = useRouter()

  const [users, setUsers] = useState<any[]>(cachedUsers)
  const [activeTab, setActiveTab] = useState<'recommended' | 'nearby'>(cachedTab)
  const [blockedUserIds, setBlockedUsersIds] = useState<Set<string>>(new Set())
  const [isInitialLoading, setIsInitialLoading] = useState(!cachedInitialLoaded)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(cachedHasMore)
  
  const userProfileRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: currentUserProfile } = useDoc(userProfileRef)

  // Sync blocked users once
  useEffect(() => {
    if (!firestore || !currentUser) return
    const blockedRef = collection(firestore, "userProfiles", currentUser.uid, "blockedUsers")
    return onSnapshot(blockedRef, (snap) => {
      const ids = new Set(snap.docs.map(d => d.id))
      setBlockedUsersIds(ids)
    })
  }, [firestore, currentUser])

  const fetchUsers = async (isRefresh = false, isTabChange = false) => {
    if (!firestore || !currentUser || !currentUserProfile) return;
    
    if (isRefresh || isTabChange) {
      setIsInitialLoading(true);
      cachedInitialLoaded = false;
    } else if (cachedInitialLoaded) {
      setIsInitialLoading(false);
      return;
    }

    try {
      const currentGender = (currentUserProfile?.gender || 'male').toLowerCase()
      const targetGender = currentGender === 'male' ? 'female' : 'male'

      let q = query(
        collection(firestore, "userProfiles"),
        where("gender", "==", targetGender),
        orderBy("isOnline", "desc"),
        orderBy("lastActiveAt", "desc"),
        limit(10)
      );

      if (activeTab === 'nearby') {
        q = query(
          collection(firestore, "userProfiles"),
          where("gender", "==", targetGender),
          where("location", "==", currentUserProfile.location || "Kenya"),
          orderBy("isOnline", "desc"),
          orderBy("lastActiveAt", "desc"),
          limit(10)
        );
      }
      
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setUsers([]);
        cachedUsers = [];
        setHasMore(false);
        cachedHasMore = false;
        return;
      }

      const rawUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = rawUsers.filter((u: any) => u.id !== currentUser.uid && !blockedUserIds.has(u.id));
      
      // Reshuffle within status groups client-side
      const online = filtered.filter(u => u.isOnline).sort(() => Math.random() - 0.5);
      const offline = filtered.filter(u => !u.isOnline).sort(() => Math.random() - 0.5);
      const combined = [...online, ...offline];

      setUsers(combined);
      cachedUsers = combined;
      cachedLastDoc = snap.docs[snap.docs.length - 1];
      setHasMore(snap.docs.length === 10);
      cachedHasMore = snap.docs.length === 10;
      cachedInitialLoaded = true;
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsInitialLoading(false)
    }
  }

  const loadMore = async () => {
    if (isLoadingMore || !hasMore || !cachedLastDoc || !firestore || !currentUserProfile) return;

    setIsLoadingMore(true);
    try {
      const currentGender = (currentUserProfile?.gender || 'male').toLowerCase()
      const targetGender = currentGender === 'male' ? 'female' : 'male'

      let q = query(
        collection(firestore, "userProfiles"),
        where("gender", "==", targetGender),
        orderBy("isOnline", "desc"),
        orderBy("lastActiveAt", "desc"),
        startAfter(cachedLastDoc),
        limit(10)
      );

      if (activeTab === 'nearby') {
        q = query(
          collection(firestore, "userProfiles"),
          where("gender", "==", targetGender),
          where("location", "==", currentUserProfile.location || "Kenya"),
          orderBy("isOnline", "desc"),
          orderBy("lastActiveAt", "desc"),
          startAfter(cachedLastDoc),
          limit(10)
        );
      }

      const snap = await getDocs(q);
      
      if (snap.empty) {
        setHasMore(false);
        cachedHasMore = false;
        return;
      }

      const rawUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = rawUsers.filter((u: any) => u.id !== currentUser.uid && !blockedUserIds.has(u.id));
      
      const online = filtered.filter(u => u.isOnline).sort(() => Math.random() - 0.5);
      const offline = filtered.filter(u => !u.isOnline).sort(() => Math.random() - 0.5);
      const combinedBatch = [...online, ...offline];

      const newUsers = [...users, ...combinedBatch];
      setUsers(newUsers);
      cachedUsers = newUsers;
      cachedLastDoc = snap.docs[snap.docs.length - 1];
      setHasMore(snap.docs.length === 10);
      cachedHasMore = snap.docs.length === 10;
    } catch (error) {
      console.error("Error fetching more users:", error)
    } finally {
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    if (currentUserProfile && !cachedInitialLoaded) {
      fetchUsers();
    }
  }, [currentUserProfile]);

  const handleTabChange = (tab: 'recommended' | 'nearby') => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    cachedTab = tab;
    // We clear cursors for tab change to start fresh
    cachedLastDoc = null;
    fetchUsers(false, true);
  }

  const handleRefresh = async () => {
    cachedLastDoc = null;
    await fetchUsers(true);
  }

  const calculateAge = (dob: string) => {
    if (!dob) return 20;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }

  return (
    <div className="flex flex-col min-h-svh bg-white pb-32">
      {/* Header with Mystery/Task hooks */}
      <div className="bg-[#3BC1A8] px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3">
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => router.push('/mystery-note')} className="flex flex-col items-center justify-center gap-2 aspect-square bg-white/20 rounded-[2.5rem] active:scale-95 transition-all">
            <div className="w-12 h-12 relative"><Image src="/mystery.png" alt="Mystery" fill className="object-contain" /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Mystery Note</span>
          </button>
          <button onClick={() => router.push('/task-center')} className="flex flex-col items-center justify-center gap-2 aspect-square bg-white/20 rounded-[2.5rem] active:scale-95 transition-all">
            <div className="w-12 h-12 relative"><Image src="/task.png" alt="Tasks" fill className="object-contain" /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Task Center</span>
          </button>
        </div>
      </div>

      {/* Manual Refresh and Tabs sticky bar */}
      <div className="sticky top-0 z-30 bg-[#3BC1A8] px-6 py-1.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => handleTabChange('recommended')}
              className={cn(
                "text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'recommended' ? "text-white scale-110" : "text-white/50"
              )}
            >
              Recommended
            </button>
            <button 
              onClick={() => handleTabChange('nearby')}
              className={cn(
                "text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                activeTab === 'nearby' ? "text-white scale-110" : "text-white/50"
              )}
            >
              Nearby
              {activeTab === 'nearby' && <MapPin className="w-2.5 h-2.5 fill-current" />}
            </button>
          </div>
          
          <button onClick={handleRefresh} className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-white active:scale-90 transition-transform">
            {isInitialLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <main className="px-4 grid grid-cols-2 gap-3 mt-3">
        {users.map((user) => {
          const age = calculateAge(user.dateOfBirth);
          const image = (user.profilePhotoUrls && user.profilePhotoUrls[0]) || `https://picsum.photos/seed/${user.id}/400/600`;

          return (
            <div key={user.id} onClick={() => router.push(`/profile/${user.id}`)} className="group relative aspect-[3/3.8] rounded-[2rem] overflow-hidden bg-gray-100 transition-all active:scale-95 shadow-sm">
              <Image src={image} alt={user.username} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              
              <div className="absolute top-3 right-3 z-10">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/chat/${user.id}`);
                  }}
                  className="h-7 px-4 rounded-full bg-[#3BC1A8] flex items-center justify-center shadow-lg active:scale-90 transition-transform border border-white/20"
                >
                  <span className="text-[9px] font-black uppercase tracking-widest text-white">Chat</span>
                </button>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-4 space-y-2">
                <div className="flex items-center gap-1.5 truncate">
                  <h3 className="text-xs font-black truncate tracking-wide text-white">{user.username}</h3>
                  {user.isVerified && (
                    <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-current" />
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center border border-white/20"><span className="text-[9px] font-black text-white">{age}</span></div>
                  <div className="h-6 px-2.5 rounded-full bg-[#3BC1A8] flex items-center justify-center border border-white/20"><span className="text-[8px] font-black text-white uppercase">{user.location || "Kenya"}</span></div>
                  {user.isOnline && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </main>

      {/* Pagination Controls */}
      {hasMore && (
        <div className="px-6 pt-8 pb-4">
          <Button 
            onClick={loadMore} 
            disabled={isLoadingMore}
            className="w-full h-12 rounded-full bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] border border-gray-100"
          >
            {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {isLoadingMore ? "Loading..." : "Load More People"}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {users.length === 0 && !isInitialLoading && (
        <div className="flex flex-col items-center justify-center py-32 text-gray-400 opacity-30 text-center space-y-4 px-10">
          <div className="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center border border-gray-100">
            <RotateCcw className="w-8 h-8" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest">No users found in this region. Try refreshing or switching tabs.</p>
        </div>
      )}
    </div>
  )
}
