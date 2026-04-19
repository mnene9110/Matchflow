"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { RotateCcw, Loader2, CheckCircle } from "lucide-react"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit, getDocs, doc, onSnapshot } from "firebase/firestore"
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
  const [blockedUserIds, setBlockedUsersIds] = useState<Set<string>>(new Set())
  const [isInitialLoading, setIsInitialLoading] = useState(!cachedInitialLoaded)
  
  const userProfileRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: currentUserProfile } = useDoc(userProfileRef)

  // Sync blocked users to filter them out of discover
  useEffect(() => {
    if (!firestore || !currentUser) return
    const blockedRef = collection(firestore, "userProfiles", currentUser.uid, "blockedUsers")
    return onSnapshot(blockedRef, (snap) => {
      const ids = new Set(snap.docs.map(d => d.id))
      setBlockedUsersIds(ids)
    })
  }, [firestore, currentUser])

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

      const allUsers = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) => u.id !== currentUser.uid && u.isSupport !== true);
      
      const sorted = allUsers.sort((a: any, b: any) => {
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

  const filteredUsers = users.filter(u => !blockedUserIds.has(u.id))

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

      <main className="px-4 grid grid-cols-2 gap-3 mt-3">
        {filteredUsers.map((user) => {
          const age = calculateAge(user.dateOfBirth);
          const image = (user.profilePhotoUrls && user.profilePhotoUrls[0]) || `https://picsum.photos/seed/${user.id}/400/600`;

          return (
            <div key={user.id} onClick={() => router.push(`/profile/${user.id}`)} className="group relative aspect-[3/3.8] rounded-[2rem] overflow-hidden bg-gray-100 transition-all active:scale-95">
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
                <div className="flex items-center gap-1 truncate">
                  <h3 className="text-xs font-black truncate tracking-wide text-white">{user.username}</h3>
                  {user.isVerified && <CheckCircle className="w-3 h-3 text-blue-500 fill-blue-500/10 shrink-0" />}
                </div>
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
