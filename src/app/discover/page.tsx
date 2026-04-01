"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/Navbar"
import Image from "next/image"
import { Mic, CircleDollarSign, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCollection, useFirebase, useMemoFirebase, useUser } from "@/firebase"
import { collection } from "firebase/firestore"
import { ref, onValue } from "firebase/database"
import { cn } from "@/lib/utils"

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<'recommend' | 'nearby'>('recommend')
  const { firestore, database } = useFirebase()
  const { user: currentUser } = useUser()
  const router = useRouter()
  const [presenceData, setPresenceData] = useState<Record<string, boolean>>({})
  
  const profilesQuery = useMemoFirebase(() => collection(firestore, 'userProfiles'), [firestore])
  const { data: firestoreUsers, isLoading } = useCollection(profilesQuery)
  
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

  const filteredUsers = firestoreUsers?.filter(u => u.id !== currentUser?.uid) || []

  const users = filteredUsers.map(u => ({
    id: u.id,
    name: u.username || "User",
    coins: 20,
    distance: u.location || "Nearby",
    isOnline: !!presenceData[u.id],
    image: (u.profilePhotoUrls && u.profilePhotoUrls[0]) || `https://picsum.photos/seed/${u.id}/400/600`
  }))

  const displayUsers = activeTab === 'nearby' 
    ? users.filter(u => u.distance.toLowerCase().includes('km') || u.distance.toLowerCase().includes('nearby'))
    : users;

  return (
    <div className="flex flex-col min-h-svh pb-20 bg-immersive with-watermark">
      <div className="pt-6 px-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="relative group overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-maroon-900 rounded-3xl p-4 shadow-xl h-24 flex flex-col justify-center border border-white/20">
            <div className="flex items-center gap-2 relative z-10">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-lg rounded-full flex items-center justify-center shrink-0 border border-white/20">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <p className="font-headline font-black text-base text-white leading-tight">Voice</p>
            </div>
          </div>
          <div className="relative group overflow-hidden bg-gradient-to-br from-[#FFCF4D] to-[#FFB13B] rounded-3xl p-4 shadow-xl h-24 flex flex-col justify-center border border-white/30">
            <div className="flex items-center gap-2 relative z-10">
              <div className="w-10 h-10 bg-black/10 backdrop-blur-lg rounded-full flex items-center justify-center shrink-0 border border-black/10">
                <CircleDollarSign className="w-5 h-5 text-black" />
              </div>
              <p className="font-headline font-black text-base text-black leading-tight">Tasks</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 flex items-center gap-6 mb-2 sticky top-0 z-20 py-3 bg-white/10 backdrop-blur-md rounded-b-3xl">
        {['recommend', 'nearby'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} className="relative pb-0.5">
            <span className={cn("text-xl font-logo transition-all", activeTab === tab ? "text-primary" : "text-gray-400")}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </span>
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      <main className="px-3 grid grid-cols-2 gap-3 mt-1 pb-8 flex-1">
        {isLoading ? (
          <div className="col-span-2 flex flex-col items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          displayUsers.map((user) => (
            <div key={user.id} className="group relative aspect-[3/4.5] rounded-3xl overflow-hidden shadow-lg bg-slate-50 border-2 border-white/20 transition-all">
              <Link href={`/profile/${user.id}`} className="absolute inset-0 z-0">
                <Image src={user.image} alt={user.name} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              </Link>
              <button 
                onClick={(e) => { e.preventDefault(); router.push(`/chat/${user.id}`); }} 
                className="absolute top-3 right-3 px-3 h-7 bg-primary/95 backdrop-blur-md text-white rounded-full flex items-center justify-center z-10 text-[9px] font-black uppercase tracking-widest"
              >
                Chat
              </button>
              <div className="absolute inset-x-0 bottom-0 p-3.5 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-black text-sm truncate">{user.name}</h3>
                  <div className={cn("w-2 h-2 rounded-full", user.isOnline ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" : "bg-gray-400")} />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <Badge className="bg-white/20 text-white border-none font-black text-[9px] px-1.5 py-0 rounded-lg">🪙 {user.coins}</Badge>
                  <Badge className="bg-white/20 text-white border-none font-black text-[9px] px-1.5 py-0 rounded-lg truncate max-w-[60px]">{user.distance}</Badge>
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
