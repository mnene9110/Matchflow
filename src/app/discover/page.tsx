
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
  
  const profilesQuery = useMemoFirebase(() => collection(firestore, 'userProfiles'), [firestore])
  const { data: firestoreUsers, isLoading } = useCollection(profilesQuery)
  
  // Presence Listener for all users
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

  // Filter out the current user from the discovery list
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
    ? users.filter(u => u.distance.toLowerCase().includes('km'))
    : users;

  return (
    <div className="flex flex-col min-h-svh pb-24 bg-transparent">
      {/* Top Banner Area */}
      <div className="pt-8 px-4 pb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative group overflow-hidden bg-gradient-to-br from-primary to-primary/80 rounded-[2.5rem] p-6 shadow-2xl hover:scale-[1.03] active:scale-95 transition-all cursor-pointer h-36 flex flex-col justify-center border border-white/20">
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-lg rounded-full flex items-center justify-center shrink-0 border border-white/20 shadow-xl">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-headline font-black text-lg text-white leading-tight tracking-tight">Voice Chat</p>
                <div className="flex items-center gap-1 mt-1">
                   <TrendingUp className="w-3 h-3 text-accent" />
                   <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Connect Now</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative group overflow-hidden bg-gradient-to-br from-[#FFCF4D] to-[#FFB13B] rounded-[2.5rem] p-6 shadow-2xl hover:scale-[1.03] active:scale-95 transition-all cursor-pointer h-36 flex flex-col justify-center border border-white/30">
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-black/5 rounded-full blur-3xl group-hover:bg-black/10 transition-colors" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 bg-black/10 backdrop-blur-lg rounded-full flex items-center justify-center shrink-0 border border-black/10 shadow-lg">
                <CircleDollarSign className="w-6 h-6 text-black" />
              </div>
              <div>
                <p className="font-headline font-black text-lg text-black leading-tight tracking-tight">Daily Tasks</p>
                <div className="flex items-center gap-1 mt-1">
                   <Sparkles className="w-3 h-3 text-primary" />
                   <p className="text-[10px] text-black/60 font-bold uppercase tracking-widest">Earn Coins</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 flex items-center gap-8 mb-4 sticky top-0 bg-transparent backdrop-blur-sm z-20 py-2">
        <button 
          onClick={() => setActiveTab('recommend')}
          className="relative group pb-2"
        >
          <span className={cn(
            "text-2xl font-logo transition-all",
            activeTab === 'recommend' ? "text-primary scale-110" : "text-gray-400 group-hover:text-gray-600"
          )}>
            Recommend
          </span>
          {activeTab === 'recommend' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full animate-in fade-in slide-in-from-left-2 duration-300" />
          )}
        </button>

        <button 
          onClick={() => setActiveTab('nearby')}
          className="relative group pb-2"
        >
          <span className={cn(
            "text-2xl font-logo transition-all",
            activeTab === 'nearby' ? "text-primary scale-110" : "text-gray-400 group-hover:text-gray-600"
          )}>
            Nearby
          </span>
          {activeTab === 'nearby' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full animate-in fade-in slide-in-from-right-2 duration-300" />
          )}
        </button>
      </div>

      {/* User Grid */}
      <main className="px-4 grid grid-cols-2 gap-4 mt-2 pb-10 flex-1">
        {isLoading ? (
          <div className="col-span-2 flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm font-bold text-gray-400 animate-pulse">Finding your matches...</p>
          </div>
        ) : displayUsers.length > 0 ? (
          displayUsers.map((user) => (
            <div 
              key={user.id} 
              className="group relative aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl bg-gray-100 border-4 border-white/20 transition-all hover:shadow-primary/20"
            >
              {/* Profile Navigation Area */}
              <Link href={`/profile/${user.id}`} className="absolute inset-0 z-0">
                <Image
                  src={user.image}
                  alt={user.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                  data-ai-hint="nature river"
                />
              </Link>

              {/* Chat Button (Isolated) */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/chat/${user.id}`);
                }}
                className="absolute top-4 right-4 px-4 py-2 bg-primary/90 backdrop-blur-md text-white rounded-full flex items-center justify-center font-headline font-black text-[10px] uppercase tracking-tighter shadow-2xl hover:bg-primary transition-all z-10 border border-white/10 active:scale-90"
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                Chat
              </button>
              
              <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/95 via-black/50 to-transparent flex flex-col gap-2 pointer-events-none">
                <div className="flex items-center justify-between">
                   <h3 className="text-white font-black text-base truncate flex items-center gap-2 max-w-[70%]">
                    {user.name} 
                  </h3>
                  <span className={cn(
                    "w-2.5 h-2.5 rounded-full transition-shadow duration-500",
                    user.isOnline 
                      ? "bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" 
                      : "bg-gray-500 shadow-none"
                  )} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge className="bg-white/10 backdrop-blur-md text-white border-none font-black h-6 px-2.5 text-[9px] rounded-lg flex items-center gap-1 shadow-inner">
                     🪙 {user.coins}
                  </Badge>
                  <Badge className="bg-white/10 backdrop-blur-md text-white border-none font-medium h-6 px-2.5 text-[9px] rounded-lg">
                    {user.distance}
                  </Badge>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 text-center py-20 space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
               <TrendingUp className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-400 font-bold">No matches found in your area yet.</p>
          </div>
        )}
      </main>

      <Navbar />
    </div>
  )
}
