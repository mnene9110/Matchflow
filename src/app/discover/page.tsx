
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
    <div className="flex flex-col min-h-svh pb-24 bg-white">
      {/* Top Banner Area */}
      <div className="bg-maroon-800/5 pt-8 px-4 pb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#FFCF4D] rounded-3xl p-5 flex items-center gap-4 shadow-md hover:scale-[1.02] transition-transform cursor-pointer h-28">
            <div className="w-12 h-12 bg-white/40 rounded-full flex items-center justify-center shrink-0">
              <Mic className="w-6 h-6 text-black" />
            </div>
            <div>
              <p className="font-headline font-bold text-base text-black leading-tight">Voice Chat</p>
              <p className="text-xs text-black/60 font-medium">Connect now</p>
            </div>
          </div>
          <div className="bg-maroon-700 rounded-3xl p-5 flex items-center gap-4 shadow-md hover:scale-[1.02] transition-transform cursor-pointer h-28">
            <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center shrink-0">
              <CircleDollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-headline font-bold text-base text-white leading-tight">Tasks</p>
              <p className="text-xs text-white/60 font-medium">Earn rewards</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      <main className="px-4 grid grid-cols-2 gap-4 mt-6 pb-10">
        {users.map((user) => (
          <Link key={user.id} href={`/chat/${user.id}`} className="group relative aspect-[3/4] rounded-[2rem] overflow-hidden shadow-sm bg-gray-100">
            <Image
              src={user.image}
              alt={user.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              data-ai-hint="person portrait"
            />
            {/* Chat Button (Replaces Hi Badge) */}
            <div className="absolute top-3 right-3 px-3 py-1.5 bg-maroon-800 text-white rounded-full flex items-center justify-center font-headline font-black text-[10px] uppercase tracking-tighter shadow-lg group-hover:scale-110 transition-transform">
              Chat
            </div>
            
            {/* Bottom Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col gap-2">
              <h3 className="text-white font-bold text-sm truncate flex items-center gap-1.5">
                {user.name} 
                <span className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              </h3>
              <div className="flex flex-wrap gap-1.5">
                <Badge className="bg-[#00D9C0] hover:bg-[#00D9C0] text-black font-black h-5 px-2 text-[10px] rounded-md border-none flex items-center gap-1">
                   🪙 {user.coins}
                </Badge>
                <Badge className="bg-white/10 text-white font-medium h-5 px-2 text-[10px] rounded-md border-none backdrop-blur-md">
                  {user.distance}
                </Badge>
              </div>
            </div>
          </Link>
        ))}
      </main>

      <Navbar />
      <style jsx global>{`
        .bg-maroon-800 { background-color: #800000; }
        .bg-maroon-700 { background-color: #990000; }
        .bg-maroon-900 { background-color: #660000; }
        .bg-maroon-800\/5 { background-color: rgba(128, 0, 0, 0.05); }
      `}</style>
    </div>
  )
}
