"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { RotateCcw, Loader2, MessageSquare } from "lucide-react"
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

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
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
        limit(50)
      );
      
      const snap = await getDocs(usersQuery);
      
      if (snap.empty) {
        setUsers([]);
        cachedUsers = [];
        return;
      }

      const allUsers = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) => u.isSupport !== true && u.id !== currentUser.uid);
      
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

  const calculateAge = (dob: string) => {
    if (!dob) return 20;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }

  const mappedUsers = users.map(u => ({
    id: u.id,
    name: u.username || "Match",
    location: u.location || "Kenya",
    age: calculateAge(u.dateOfBirth),
    image: (u.profilePhotoUrls && u.profilePhotoUrls[0]) || `https://picsum.photos/seed/${u.id}/400/600`
  }))

  return (
    <div className="flex flex-col min-h-svh bg-white pb-32">
      {/* Red Header Section */}
      <div className="bg-[#FF3737] px-6 pt-12 pb-10 space-y-10 rounded-b-[3rem]">
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => router.push('/mystery-note')}
            className="flex flex-col items-center justify-center gap-3 aspect-square bg-white/20 rounded-[2.5rem] shadow-xl active:scale-95 transition-all group"
          >
            <div className="w-16 h-16 relative">
              <Image src="https://placehold.co/100x100/transparent/white?text=❓" alt="Mystery" fill className="object-contain" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-white">Mystery Note</span>
          </button>
          
          <button 
            onClick={() => router.push('/task-center')}
            className="flex flex-col items-center justify-center gap-3 aspect-square bg-white/20 rounded-[2.5rem] shadow-xl active:scale-95 transition-all group"
          >
            <div className="w-16 h-16 relative">
              <Image src="https://placehold.co/100x100/transparent/white?text=📋" alt="Tasks" fill className="object-contain" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-white">Task Center</span>
          </button>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white uppercase tracking-widest">Recommended for you</h2>
          <button 
            onClick={handleRefresh}
            disabled={isInitialLoading}
            className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center text-white active:bg-white/10 transition-colors"
          >
            {isInitialLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Grid Section */}
      <main className="px-4 grid grid-cols-2 gap-4 mt-6">
        {mappedUsers.map((user) => (
          <div 
            key={user.id} 
            className="group relative aspect-[3/4.2] rounded-[2.5rem] overflow-hidden bg-gray-100 shadow-lg active:scale-95 transition-all"
            onClick={() => router.push(`/profile/${user.id}`)}
          >
            <Image src={user.image} alt={user.name} fill className="object-cover" data-ai-hint="dating profile photo" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

            {/* Chat Icon */}
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                router.push(`/chat/${user.id}`); 
              }}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg active:scale-90 transition-all"
            >
              <MessageSquare className="w-5 h-5 text-white fill-current" />
            </button>

            {/* Info Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-5 space-y-3">
              <h3 className="text-white font-black text-sm uppercase tracking-wider truncate">{user.name}</h3>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center border border-white/20">
                  <span className="text-[10px] font-black text-white">{user.age}</span>
                </div>
                <div className="h-7 px-3 rounded-full bg-[#FF3737] flex items-center justify-center border border-white/20">
                  <span className="text-[9px] font-black text-white uppercase tracking-tighter">{user.location}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isInitialLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/4.2] rounded-[2.5rem] bg-gray-100 animate-pulse" />
        ))}
      </main>
    </div>
  )
}
