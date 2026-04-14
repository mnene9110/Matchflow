
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { RotateCcw, Loader2, MessageSquare, Rocket, Star } from "lucide-react"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit, getDocs, doc, Timestamp } from "firebase/firestore"
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
        .filter((u: any) => u.isSupport !== true && u.id !== currentUser.uid);
      
      // PRIORITY SORTING: Boosted Users -> VIP Users -> Others
      const now = Date.now();
      const boosted = allUsers.filter((u: any) => {
        const boostedUntil = u.boostedUntil?.toMillis ? u.boostedUntil.toMillis() : 0;
        return boostedUntil > now;
      });
      const vips = allUsers.filter((u: any) => u.isVIP === true && !boosted.find(b => b.id === u.id));
      const others = allUsers.filter((u: any) => !u.isVIP && !boosted.find(b => b.id === u.id));

      const onlineBoosted = boosted.filter(u => u.isOnline);
      const offlineBoosted = boosted.filter(u => !u.isOnline);
      const onlineVips = vips.filter(u => u.isOnline);
      const offlineVips = vips.filter(u => !u.isOnline);
      const onlineOthers = others.filter(u => u.isOnline);
      const offlineOthers = others.filter(u => !u.isOnline);

      const sorted = [
        ...shuffleArray(onlineBoosted),
        ...shuffleArray(offlineBoosted),
        ...shuffleArray(onlineVips),
        ...shuffleArray(offlineVips),
        ...shuffleArray(onlineOthers),
        ...shuffleArray(offlineOthers)
      ].slice(0, 50);
      
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
    image: (u.profilePhotoUrls && u.profilePhotoUrls[0]) || `https://picsum.photos/seed/${u.id}/400/600`,
    isBoosted: !!(u.boostedUntil?.toMillis ? u.boostedUntil.toMillis() > Date.now() : false),
    isVIP: !!u.isVIP
  }))

  return (
    <div className="flex flex-col min-h-svh bg-white pb-32">
      {/* Scrollable Top Section */}
      <div className="bg-[#3BC1A8] px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3">
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => router.push('/mystery-note')}
            className="flex flex-col items-center justify-center gap-2 aspect-square bg-white/20 rounded-[2.5rem] active:scale-95 transition-all group"
          >
            <div className="w-12 h-12 relative">
              <Image src="/mystery.png" alt="Mystery" fill className="object-contain" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Mystery Note</span>
          </button>
          
          <button 
            onClick={() => router.push('/task-center')}
            className="flex flex-col items-center justify-center gap-2 aspect-square bg-white/20 rounded-[2.5rem] active:scale-95 transition-all group"
          >
            <div className="w-12 h-12 relative">
              <Image src="/task.png" alt="Tasks" fill className="object-contain" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Task Center</span>
          </button>
        </div>
      </div>

      {/* Sticky Recommended Header */}
      <div className="sticky top-0 z-30 bg-[#3BC1A8] px-6 py-1.5 flex items-center justify-between">
        <h2 className="text-[10px] font-black text-white capitalize tracking-widest">Recommended for you</h2>
        <button 
          onClick={handleRefresh}
          disabled={isInitialLoading}
          className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-white active:bg-white/10 transition-colors"
        >
          {isInitialLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Grid Section */}
      <main className="px-4 grid grid-cols-2 gap-3 mt-4">
        {mappedUsers.map((user) => (
          <div 
            key={user.id} 
            className={cn(
              "group relative aspect-[3/3.8] rounded-[2rem] overflow-hidden bg-gray-100 shadow-sm transition-all active:opacity-80",
              user.isBoosted && "ring-2 ring-orange-500 ring-offset-2",
              user.isVIP && "ring-2 ring-amber-400 ring-offset-2"
            )}
            onClick={() => router.push(`/profile/${user.id}`)}
          >
            <Image src={user.image} alt={user.name} fill className="object-cover" data-ai-hint="dating profile photo" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

            {/* Status Icons */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {user.isBoosted && (
                <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shadow-lg animate-pulse">
                  <Rocket className="w-4 h-4 text-white fill-current" />
                </div>
              )}
              {user.isVIP && (
                <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center shadow-lg">
                  <Star className="w-4 h-4 text-zinc-900 fill-current" />
                </div>
              )}
            </div>

            {/* Chat Icon */}
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                router.push(`/chat/${user.id}`); 
              }}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg active:scale-90 transition-all z-10"
            >
              <MessageSquare className="w-4 h-4 text-white fill-current" />
            </button>

            {/* Info Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-4 space-y-2">
              <h3 className="text-white font-black text-xs tracking-wider truncate">{user.name}</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center border border-white/20">
                  <span className="text-[9px] font-black text-white">{user.age}</span>
                </div>
                <div className="h-6 px-2.5 rounded-full bg-[#3BC1A8] flex items-center justify-center border border-white/20">
                  <span className="text-[8px] font-black text-white uppercase tracking-tighter">{user.location}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isInitialLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/3.8] rounded-[2rem] bg-gray-100 animate-pulse" />
        ))}
      </main>
    </div>
  )
}
