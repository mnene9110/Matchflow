
"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/Navbar"
import Image from "next/image"
import { Mic, CircleDollarSign, Loader2, Sparkles, TrendingUp, MessageCircle } from "lucide-react"
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
  
  // Fetch from unified 'users' collection
  const profilesQuery = useMemoFirebase(() => collection(firestore, 'users'), [firestore])
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
    name: u.username || "MatchFlow User",
    coins: 20,
    distance: u.location || "Nearby",
    isOnline: !!presenceData[u.id],
    image: (u.profilePhotoUrls && u.profilePhotoUrls[0]) || `https://picsum.photos/seed/${u.id}/600/800`
  }))

  const displayUsers = activeTab === 'nearby' 
    ? users.filter(u => u.distance.toLowerCase().includes('km') || u.distance.toLowerCase().includes('nearby'))
    : users;

  return (
    <div className="flex flex-col min-h-svh pb-24 bg-transparent">
      <div className="pt-8 px-4 pb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative group overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-maroon-900 rounded-[2.5rem] p-6 shadow-2xl h-36 flex flex-col justify-center border border-white/20">
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-lg rounded-full flex items-center justify-center shrink-0 border border-white/20">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <p className="font-headline font-black text-lg text-white leading-tight">Voice Chat</p>
            </div>
          </div>
          <div className="relative group overflow-hidden bg-gradient-to-br from-[#FFCF4D] to-[#FFB13B] rounded-[2.5rem] p-6 shadow-2xl h-36 flex flex-col justify-center border border-white/30">
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 bg-black/10 backdrop-blur-lg rounded-full flex items-center justify-center shrink-0 border border-black/10">
                <CircleDollarSign className="w-6 h-6 text-black" />
              </div>
              <p className="font-headline font-black text-lg text-black leading-tight">Daily Gold</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 flex items-center gap-8 mb-4 sticky top-0 bg-transparent backdrop-blur-md z-20 py-4">
        {['recommend', 'nearby'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} className="relative pb-1">
            <span className={cn("text-3xl font-logo transition-all", activeTab === tab ? "text-primary scale-105" : "text-gray-400")}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </span>
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      <main className="px-4 grid grid-cols-2 gap-4 mt-2 pb-10 flex-1">
        {isLoading ? (
          <div className="col-span-2 flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
        ) : (
          displayUsers.map((user) => (
            <div key={user.id} className="group relative aspect-[3/4.2] rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-50 border-4 border-white/20 transition-all">
              <Link href={`/profile/${user.id}`} className="absolute inset-0 z-0">
                <Image src={user.image} alt={user.name} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              </Link>
              <button onClick={(e) => { e.preventDefault(); router.push(`/chat/${user.id}`); }} className="absolute top-4 right-4 w-12 h-12 bg-primary/95 backdrop-blur-md text-white rounded-2xl flex items-center justify-center shadow-2xl z-10 border border-white/20">
                <MessageCircle className="w-6 h-6 fill-white" />
              </button>
              <div className="absolute inset-x-0 bottom-0 p-5 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-black text-lg truncate">{user.name}</h3>
                  <div className={cn("w-3 h-3 rounded-full ring-2 ring-white/20", user.isOnline ? "bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.9)]" : "bg-gray-400")} />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className="bg-white/20 text-white border-none font-black text-[10px] rounded-xl shadow-xl">🪙 {user.coins}</Badge>
                  <Badge className="bg-white/20 text-white border-none font-black text-[10px] rounded-xl shadow-xl">{user.distance}</Badge>
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
