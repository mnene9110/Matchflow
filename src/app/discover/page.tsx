
"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { RotateCcw, Loader2, CheckCircle, MapPin, UserSearch } from "lucide-react"
import { useFirebase } from "@/firebase/provider"
import { collection, query, where, orderBy, limit } from "firebase/firestore"
import { useCollection } from "@/firebase/firestore/use-collection"
import { useMemoFirebase } from "@/firebase/firestore/use-memo-firebase"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useAuth } from "@/firebase/auth/use-auth"

export default function DiscoverPage() {
  const router = useRouter()
  const { auth, firestore } = useFirebase()
  const { user } = useAuth(auth)

  const [activeTab, setActiveTab] = useState<'recommended' | 'nearby'>("recommended")

  const usersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, "userProfiles"),
      where("id", "!=", user.uid),
      orderBy("isOnline", "desc"),
      orderBy("lastActiveAt", "desc"),
      limit(20)
    );
  }, [user, activeTab, firestore]);

  const { data: users, isLoading } = useCollection(usersQuery);

  const calculateAge = (dob: string) => {
    if (!dob) return 20;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }

  if (isLoading) {
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
            <button onClick={() => setActiveTab('recommended')} className={cn("text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'recommended' ? "text-white scale-110" : "text-white/50")}>Recommended</button>
            <button onClick={() => setActiveTab('nearby')} className={cn("text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5", activeTab === 'nearby' ? "text-white scale-110" : "text-white/50")}>Nearby <MapPin className="w-2.5 h-2.5 fill-current" /></button>
          </div>
          <button onClick={() => window.location.reload()} className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-white active:scale-90 transition-transform"><RotateCcw className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {users && users.length > 0 ? (
        <main className="px-4 grid grid-cols-2 gap-3 mt-3">
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
        </main>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-32 text-gray-400 text-center space-y-6 px-10">
          <div className="w-24 h-24 bg-gray-50 rounded-[3rem] flex items-center justify-center border border-gray-100 shadow-inner">
            <UserSearch className="w-10 h-10 text-gray-200" />
          </div>
          <p className="text-xs font-black text-gray-900 uppercase tracking-widest">No users found</p>
        </div>
      )}
    </div>
  )
}
