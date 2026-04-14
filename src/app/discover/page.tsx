
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { RotateCcw, Loader2, MessageSquare, Trophy } from "lucide-react"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit, getDocs, doc } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

let cachedUsers: any[] = []
let cachedInitialLoaded: boolean = false

export function clearDiscoverCache() {
  cachedUsers = []
  cachedInitialLoaded = false
}

export default function DiscoverPage() {
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
    } else if (cachedInitialLoaded && !isRefresh) {
      setIsInitialLoading(false);
      return;
    }

    try {
      const currentGender = (currentUserProfile?.gender || 'male').toLowerCase()
      const targetGender = currentGender === 'male' ? 'female' : 'male'

      const usersQuery = query(
        collection(firestore, "userProfiles"),
        where("gender", "==", targetGender),
        limit(100)
      );
      
      const snap = await getDocs(usersQuery);
      
      if (snap.empty) {
        setUsers([]);
        cachedUsers = [];
        return;
      }

      // Explicitly filter out the current user by ID and also exclude support accounts from general discovery
      const allUsers = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) => u.id !== currentUser.uid && u.isSupport !== true);
      
      // Sort: Highest VIP First, then Online status
      const sorted = allUsers.sort((a: any, b: any) => {
        const aLevel = a.vipLevel || 0;
        const bLevel = b.vipLevel || 0;
        if (aLevel !== bLevel) return bLevel - aLevel;
        return (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0);
      }).slice(0, 50);
      
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

      <div className="sticky top-0 z-30 bg-[#3BC1A8] px-6 py-1.5 flex items-center justify-between shadow-sm">
        <h2 className="text-[10px] font-black text-white capitalize tracking-widest">Recommended</h2>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-white active:scale-90 transition-transform">
            {isInitialLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <main className="px-4 grid grid-cols-2 gap-3 mt-4">
        {users.map((user) => {
          const age = calculateAge(user.dateOfBirth);
          const image = (user.profilePhotoUrls && user.profilePhotoUrls[0]) || `https://picsum.photos/seed/${user.id}/400/600`;
          const vipLevel = user.vipLevel || 0;
          const nameColor = vipLevel >= 3 ? "text-amber-400" : (vipLevel >= 1 ? "text-blue-400" : "text-white");
          const hasGlow = vipLevel >= 3;

          return (
            <div key={user.id} onClick={() => router.push(`/profile/${user.id}`)} className={cn("group relative aspect-[3/3.8] rounded-[2rem] overflow-hidden bg-gray-100 transition-all active:scale-95", hasGlow && "shadow-[0_0_20px_rgba(59,193,168,0.4)] ring-2 ring-primary/20")}>
              <Image src={image} alt={user.username} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              
              <div className="absolute top-3 left-3 flex flex-col gap-1">
                {vipLevel > 0 && (
                  <div className={cn("px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg", vipLevel >= 10 ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-zinc-900/80")}>
                    <Trophy className="w-2.5 h-2.5 text-amber-400 fill-current" />
                    <span className="text-[8px] font-black text-white">V{vipLevel}</span>
                  </div>
                )}
              </div>

              <div className="absolute top-3 right-3 z-10">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/chat/${user.id}`);
                  }}
                  className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-4 space-y-2">
                <h3 className={cn("text-xs font-black truncate tracking-wide", nameColor)}>{user.username}</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center border border-white/20"><span className="text-[9px] font-black text-white">{age}</span></div>
                  <div className="h-6 px-2.5 rounded-full bg-[#3BC1A8] flex items-center justify-center border border-white/20"><span className="text-[8px] font-black text-white uppercase">{user.location || "Kenya"}</span></div>
                </div>
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}
