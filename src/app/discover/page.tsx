
"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/Navbar"
import Image from "next/image"
import { Sparkles, ClipboardList, RotateCcw, Loader2, Globe } from "lucide-react"
import { useCollection, useFirebase, useMemoFirebase, useUser } from "@/firebase"
import { collection } from "firebase/firestore"
import { ref, onValue } from "firebase/database"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<'recommend' | 'nearby'>('recommend')
  const { firestore, database } = useFirebase()
  const { user: currentUser } = useUser()
  const router = useRouter()
  const [presenceData, setPresenceData] = useState<Record<string, boolean>>({})
  
  const profilesQuery = useMemoFirebase(() => collection(firestore, 'userProfiles'), [firestore])
  const { data: firestoreUsers, isLoading: isProfilesLoading } = useCollection(profilesQuery)

  const blockedQuery = useMemoFirebase(() => currentUser ? collection(firestore, 'userProfiles', currentUser.uid, 'blockedUsers') : null, [firestore, currentUser])
  const { data: blockedUsers, isLoading: isBlockedLoading } = useCollection(blockedQuery)
  
  useEffect(() => {
    if (!database) return
    const presenceRef = ref(database, 'users')
    return onValue(presenceRef, (snapshot) => {
      const users = snapshot.val()
      if (users) {
        const statuses: Record<string, boolean> = {}
        Object.entries(users).forEach(([uid, data]: [string, any]) => {
          statuses[uid] = !!data.presence?.online
        })
        setPresenceData(statuses)
      }
    })
  }, [database])

  // ASYMMETRICAL BLOCKING: Only filter out users I have blocked.
  // The ones who blocked me can still see me (per user request).
  const blockedIds = new Set(blockedUsers?.map(b => b.id) || [])
  const filteredUsers = firestoreUsers?.filter(u => u.id !== currentUser?.uid && !blockedIds.has(u.id)) || []

  const users = filteredUsers.map(u => ({
    id: u.id,
    name: u.username || "User",
    location: u.location || "Kenya",
    isOnline: !!presenceData[u.id],
    numericId: u.numericId || ".......",
    image: (u.profilePhotoUrls && u.profilePhotoUrls[0]) || `https://picsum.photos/seed/${u.id}/400/600`
  }))

  const displayUsers = activeTab === 'nearby' 
    ? users.filter(u => u.location.toLowerCase().includes('kenya') || u.location.toLowerCase().includes('nearby'))
    : users;

  const darkMaroon = "bg-[#5A1010]";
  const isLoading = isProfilesLoading || isBlockedLoading

  return (
    <div className="flex flex-col min-h-svh pb-24 bg-transparent">
      <div className="pt-4 px-4 grid grid-cols-2 gap-3">
        <button className={cn("flex flex-col items-center justify-center gap-2 rounded-[2rem] py-6 shadow-xl group active:scale-95 transition-all", darkMaroon)}>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-black text-[9px] tracking-[0.1em] uppercase">Mystery Note</span>
        </button>

        <button className="flex flex-col items-center justify-center gap-2 bg-white/40 backdrop-blur-md border border-white/20 rounded-[2rem] py-6 group active:scale-95 transition-all">
          <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-[#5A1010]" />
          </div>
          <span className="text-[#5A1010] font-black text-[9px] tracking-[0.1em] uppercase">Task Center</span>
        </button>
      </div>

      <div className="px-4 py-6 flex items-center gap-3">
        <div className="flex-1 h-14 bg-white/30 backdrop-blur-md border border-white/20 rounded-full p-1 flex items-center">
          <button 
            onClick={() => setActiveTab('recommend')}
            className={cn(
              "flex-1 h-full rounded-full text-[9px] font-black uppercase tracking-[0.15em] transition-all",
              activeTab === 'recommend' ? cn(darkMaroon, "text-white") : "text-gray-500"
            )}
          >
            Recommend
          </button>
          <button 
            onClick={() => setActiveTab('nearby')}
            className={cn(
              "flex-1 h-full rounded-full text-[9px] font-black uppercase tracking-[0.15em] transition-all",
              activeTab === 'nearby' ? cn(darkMaroon, "text-white") : "text-gray-500"
            )}
          >
            Nearby
          </button>
        </div>
        <button className="w-14 h-14 rounded-full bg-white/40 backdrop-blur-md border border-white/20 flex items-center justify-center active:rotate-180 transition-all duration-500 shadow-sm">
          <RotateCcw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <main className="px-4 grid grid-cols-2 gap-3 pb-8">
        {isLoading ? (
          <div className="col-span-2 flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          displayUsers.map((user) => (
            <div key={user.id} className="group relative aspect-[3/4.2] rounded-[2.5rem] overflow-hidden bg-white/20 shadow-md transition-transform active:scale-95">
              <div onClick={() => router.push(`/profile/${user.id}`)} className="absolute inset-0 z-0">
                <Image src={user.image} alt={user.name} fill className="object-cover transition-transform group-hover:scale-110 duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); router.push(`/chat/${user.id}`); }}
                className="absolute top-3 right-3 h-8 px-4 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center z-10"
              >
                <span className="text-[8px] font-black text-white uppercase tracking-[0.1em]">Chat</span>
              </button>

              <div className="absolute inset-x-0 bottom-0 p-4 z-10">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h3 className="text-white font-black text-xs">{user.name}</h3>
                  <div className={cn("w-1.5 h-1.5 rounded-full", user.isOnline ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" : "bg-gray-400")} />
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-black text-green-500 uppercase tracking-[0.1em]">ID: {user.numericId}</span>
                </div>
                <div className="flex items-center gap-1 opacity-80">
                  <Globe className="w-2.5 h-2.5 text-[#5A1010]" />
                  <span className="text-[8px] font-bold text-white uppercase tracking-wider">{user.location}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </main>
      <Navbar />
    </div>
  )
}
