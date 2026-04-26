
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { RotateCcw, Loader2, CheckCircle, MapPin, UserSearch, Plus } from "lucide-react"
import { useFirebase } from "@/firebase/provider"
import { collection, query, where, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot, DocumentData } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useAuth } from "@/firebase/auth/use-auth"
import { Button } from "@/components/ui/button"
import { useSupabaseUser } from "@/hooks/use-supabase"

const PAGE_SIZE = 10;

export default function DiscoverPage() {
  const router = useRouter()
  const { auth, firestore } = useFirebase()
  const { user } = useAuth(auth)
  const { profile } = useSupabaseUser()

  const [activeTab, setActiveTab] = useState<'recommended' | 'nearby'>("recommended")
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchUsers = useCallback(async (isLoadMore = false) => {
    if (!user) return;

    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setUsers([]);
      setLastDoc(null);
      setHasMore(true);
    }

    try {
      // Base query: order by presence
      let q = query(
        collection(firestore, "userProfiles"),
        orderBy("isOnline", "desc"),
        orderBy("lastActiveAt", "desc")
      );

      // Apply country filter if "Nearby" tab is selected
      if (activeTab === 'nearby' && profile?.location) {
        q = query(
          collection(firestore, "userProfiles"),
          where("location", "==", profile.location),
          orderBy("isOnline", "desc"),
          orderBy("lastActiveAt", "desc")
        );
      }

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc), limit(PAGE_SIZE));
      } else {
        q = query(q, limit(PAGE_SIZE));
      }

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setHasMore(false);
      } else {
        // Filter out current user client-side to avoid complex inequality indexes
        const fetchedUsers = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.id !== user.uid);

        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        
        if (snapshot.docs.length < PAGE_SIZE) {
          setHasMore(false);
        }

        setUsers(prev => isLoadMore ? [...prev, ...fetchedUsers] : fetchedUsers);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [user, firestore, lastDoc, activeTab, profile?.location]);

  // Fetch only on tab change or initial load if list is empty
  useEffect(() => {
    if (user && users.length === 0) {
      fetchUsers();
    }
  }, [user, activeTab, fetchUsers, users.length]);

  const handleManualRefresh = () => {
    fetchUsers(false);
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

  if (isLoading && users.length === 0) {
    return (
      <div className="flex h-svh w-full flex-col items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">Finding matches...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-svh bg-white pb-32">
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

      <div className="sticky top-0 z-30 bg-[#3BC1A8] px-6 py-1.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => { setActiveTab('recommended'); setUsers([]); }} className={cn("text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'recommended' ? "text-white scale-110" : "text-white/50")}>Recommended</button>
            <button onClick={() => { setActiveTab('nearby'); setUsers([]); }} className={cn("text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5", activeTab === 'nearby' ? "text-white scale-110" : "text-white/50")}>Nearby <MapPin className="w-2.5 h-2.5 fill-current" /></button>
          </div>
          <button onClick={handleManualRefresh} className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-white active:scale-90 transition-transform">
            <RotateCcw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {users.length > 0 ? (
        <main className="px-4 mt-3 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {users.map((u) => {
              const age = calculateAge(u.dateOfBirth);
              const image = (u.profilePhotoUrls && u.profilePhotoUrls[0]) || `https://picsum.photos/seed/${u.id}/400/600`;

              return (
                <div key={u.id} onClick={() => router.push(`/profile/${u.id}`)} className="group relative aspect-[3/3.8] rounded-[2rem] overflow-hidden bg-gray-100 transition-all active:scale-95 shadow-sm">
                  <Image src={image} alt={u.username} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  
                  <div className="absolute top-3 right-3 z-10">
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/chat/${u.id}`); }} className="h-7 px-4 rounded-full bg-[#3BC1A8] flex items-center justify-center shadow-lg border border-white/20">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white">CHAT</span>
                    </button>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-4 space-y-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <h3 className="text-xs font-black truncate tracking-wide text-white">{u.username}</h3>
                      {u.isVerified && <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-current" />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center border border-white/20"><span className="text-[9px] font-black text-white">{age}</span></div>
                      <div className="h-6 px-2.5 rounded-full bg-[#3BC1A8] flex items-center justify-center border border-white/20"><span className="text-[8px] font-black text-white uppercase">{u.location || "Kenya"}</span></div>
                      {u.isOnline && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-50 animate-pulse" />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2 pb-10">
              <Button 
                onClick={() => fetchUsers(true)} 
                disabled={isLoadingMore}
                variant="outline"
                className="rounded-full h-12 px-8 border-gray-100 font-black text-[10px] uppercase tracking-widest gap-2 bg-gray-50/50"
              >
                {isLoadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {isLoadingMore ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </main>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-32 text-gray-400 text-center space-y-6 px-10">
          <div className="w-24 h-24 bg-gray-50 rounded-[3rem] flex items-center justify-center border border-gray-100 shadow-inner">
            <UserSearch className="w-10 h-10 text-gray-200" />
          </div>
          <p className="text-xs font-black text-gray-900 uppercase tracking-widest">No users found{activeTab === 'nearby' ? ` in ${profile?.location || 'your country'}` : ''}</p>
          <Button onClick={handleManualRefresh} variant="link" className="text-primary font-black uppercase text-[10px]">Try Refreshing</Button>
        </div>
      )}
    </div>
  )
}
