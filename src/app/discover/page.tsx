
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { RotateCcw, Globe, Loader2, CheckCircle, Sparkles, ClipboardList } from "lucide-react"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

let cachedUsers: any[] = []
let cachedInitialLoaded: boolean = false

export function clearDiscoverCache() {
  cachedUsers = []
  cachedInitialLoaded = false
}

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
  const { firestore } = useFirebase()
  const { user: currentUser } = useUser()
  const router = useRouter()

  const [users, setUsers] = useState<any[]>(cachedUsers)
  const [isInitialLoading, setIsInitialLoading] = useState(!cachedInitialLoaded)
  
  const userProfileRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: currentUserProfile } = useDoc(userProfileRef)

  const fetchUsers = async (isRefresh = false) => {
    if (!firestore || !currentUser || !currentUserProfile) return;
    
    if (isRefresh) {
      setIsInitialLoading(true);
    } else if (cachedInitialLoaded) {
      setIsInitialLoading(false);
      return;
    }

    try {
      const currentGender = (currentUserProfile?.gender || 'male').toLowerCase()
      const targetGender = currentGender === 'male' ? 'female' : 'male'

      const usersQuery = query(
        collection(firestore, "userProfiles"),
        where("gender", "==", targetGender),
        limit(50)
      );
      
      const snap = await getDocs(usersQuery);
      
      if (snap.empty) {
        setUsers([]);
        cachedUsers = [];
        return;
      }

      const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const onlineUsers = allUsers.filter((u: any) => u.isOnline === true);
      const offlineUsers = allUsers.filter((u: any) => u.isOnline !== true);

      const sorted = [...shuffleArray(onlineUsers), ...shuffleArray(offlineUsers)];
      
      setUsers(sorted);
      cachedUsers = sorted;
      cachedInitialLoaded = true;
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsInitialLoading(false)
    }
  }

  useEffect(() => {
    if (currentUserProfile) fetchUsers();
  }, [currentUserProfile]);

  const handleRefresh = async () => {
    clearDiscoverCache();
    await fetchUsers(true);
  }

  const mappedUsers = users.map(u => ({
    id: u.id,
    name: u.username || "Match",
    location: u.location || "Kenya",
    isVerified: !!u.isVerified,
    isOnline: !!u.isOnline,
    image: (u.profilePhotoUrls && u.profilePhotoUrls[0]) || `https://picsum.photos/seed/${u.id}/400/600`
  }))

  const displayUsers = activeTab === 'nearby' && currentUserProfile?.location
    ? mappedUsers.filter(u => u.location.toLowerCase() === currentUserProfile.location.toLowerCase())
    : mappedUsers;

  return (
    <div className="flex flex-col h-svh bg-transparent overflow-y-auto pb-32 relative">
      <div className="px-4 pt-8 pb-4 shrink-0 space-y-6">
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
      </div>

      <div className="sticky top-0 z-30 px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-16 bg-transparent rounded-full p-1.5 flex items-center">
            <button 
              onClick={() => setActiveTab('recommend')}
              className={cn(
                "flex-1 h-full rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                activeTab === 'recommend' ? "bg-[#8B0000] text-white shadow-lg" : "text-white/60"
              )}
            >
              Recommend
            </button>
            <button 
              onClick={() => setActiveTab('nearby')}
              className={cn(
                "flex-1 h-full rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                activeTab === 'nearby' ? "bg-[#8B0000] text-white shadow-lg" : "text-white/60"
              )}
            >
              Nearby
            </button>
          </div>
          
          <button 
            onClick={handleRefresh} 
            className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center active:rotate-180 transition-all duration-700 shadow-lg"
          >
            {isInitialLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <RotateCcw className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>

      <main className="px-4 grid grid-cols-2 gap-3 pb-8 flex-1 mt-2">
        {displayUsers.map((user) => (
          <div key={user.id} className="group relative aspect-[3/4.2] rounded-[2.5rem] overflow-hidden bg-white/20 shadow-md transition-transform active:scale-95" onClick={() => router.push(`/profile/${user.id}`)}>
            <div className="absolute inset-0 z-0">
              <Image src={user.image} alt={user.name} fill className="object-cover transition-transform group-hover:scale-110 duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </div>

            {user.isOnline && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-green-50 animate-pulse" />
                <span className="text-[7px] font-black text-white uppercase tracking-tighter">Online</span>
              </div>
            )}

            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                router.push(`/chat/${user.id}`); 
              }}
              className="absolute top-3 right-3 h-8 px-4 bg-[#B36666]/40 backdrop-blur-md border border-white/20 shadow-lg rounded-full flex items-center justify-center z-10 active:scale-90 transition-all"
            >
              <span className="text-[8px] font-black text-white uppercase tracking-[0.1em]">Chat</span>
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

        {isInitialLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/4.2] rounded-[2.5rem] bg-white/20 animate-pulse" />
        ))}
      </main>
    </div>
  )
}
