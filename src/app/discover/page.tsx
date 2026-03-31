
"use client"

import { Navbar } from "@/components/Navbar"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import Image from "next/image"
import { Mic, CircleDollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"

const MOCK_USERS = [
  {
    id: "1",
    name: "honey cup 🌹😘",
    coins: 20,
    distance: "13.6km",
    status: "Online",
    image: PlaceHolderImages.find(i => i.id === 'user-1')?.imageUrl || "https://picsum.photos/seed/1/600/800"
  },
  {
    id: "2",
    name: "Joy Michael",
    coins: 25,
    distance: ">500km",
    status: "Active",
    image: PlaceHolderImages.find(i => i.id === 'user-4')?.imageUrl || "https://picsum.photos/seed/4/600/800"
  },
  {
    id: "3",
    name: "blessed 💕💸",
    coins: 23,
    distance: ">500km",
    status: "Online",
    image: PlaceHolderImages.find(i => i.id === 'user-5')?.imageUrl || "https://picsum.photos/seed/5/600/800"
  },
  {
    id: "4",
    name: "Camilla🌸🌸",
    coins: 23,
    distance: "13.6km",
    status: "Nearby",
    image: PlaceHolderImages.find(i => i.id === 'user-2')?.imageUrl || "https://picsum.photos/seed/2/600/800"
  }
]

export default function DiscoverPage() {
  const firestore = useFirestore()
  const profilesQuery = useMemoFirebase(() => collection(firestore, 'userProfiles'), [firestore])
  const { data: firestoreUsers } = useCollection(profilesQuery)
  
  const users = (firestoreUsers && firestoreUsers.length > 0) ? firestoreUsers.map(u => ({
    id: u.id,
    name: u.username || "Unknown",
    coins: 20,
    distance: u.location || "Nearby",
    status: "Online",
    image: (u.profilePhotoUrls && u.profilePhotoUrls[0]) || "https://picsum.photos/seed/1/600/800"
  })) : MOCK_USERS

  return (
    <div className="flex flex-col min-h-svh pb-24 bg-transparent">
      {/* Top Banner Area */}
      <div className="pt-8 px-4 pb-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Voice Chat Button - Refined */}
          <div className="relative group overflow-hidden bg-gradient-to-br from-[#FFCF4D] to-[#FFB13B] rounded-[2.5rem] p-6 shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer h-32 flex flex-col justify-center border border-white/20">
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-colors" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center shrink-0 shadow-inner">
                <Mic className="w-6 h-6 text-black" />
              </div>
              <div>
                <p className="font-headline font-black text-lg text-black leading-tight tracking-tight">Voice Chat</p>
                <p className="text-[10px] text-black/60 font-bold uppercase tracking-widest">Connect Now</p>
              </div>
            </div>
          </div>

          {/* Tasks Button - Refined */}
          <div className="relative group overflow-hidden bg-primary rounded-[2.5rem] p-6 shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer h-32 flex flex-col justify-center border border-white/10 backdrop-blur-sm">
            <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 border border-white/10 backdrop-blur-md rounded-full flex items-center justify-center shrink-0 shadow-lg">
                <CircleDollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-headline font-black text-lg text-white leading-tight tracking-tight">Tasks</p>
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Earn Coins</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      <main className="px-4 grid grid-cols-2 gap-4 mt-2 pb-10 flex-1">
        {users.map((user) => (
          <Link key={user.id} href={`/profile/${user.id}`} className="group relative aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl bg-gray-100 border-4 border-white/10">
            <Image
              src={user.image}
              alt={user.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              data-ai-hint="person portrait"
            />
            {/* Chat Button */}
            <div className="absolute top-4 right-4 px-4 py-1.5 bg-primary text-white rounded-full flex items-center justify-center font-headline font-black text-[10px] uppercase tracking-tighter shadow-2xl group-hover:scale-110 transition-transform z-10">
              Chat
            </div>
            
            {/* Bottom Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col gap-2">
              <h3 className="text-white font-bold text-base truncate flex items-center gap-2">
                {user.name} 
                <span className="w-2.5 h-2.5 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
              </h3>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-primary/90 hover:bg-primary text-white font-black h-6 px-3 text-[10px] rounded-lg border-none flex items-center gap-1 shadow-sm">
                   🪙 {user.coins}
                </Badge>
                <Badge className="bg-white/10 text-white font-medium h-6 px-3 text-[10px] rounded-lg border-none backdrop-blur-md">
                  {user.distance}
                </Badge>
              </div>
            </div>
          </Link>
        ))}
      </main>

      <Navbar />
    </div>
  )
}
