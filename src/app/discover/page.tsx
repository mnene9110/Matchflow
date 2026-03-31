"use client"

import { useState } from "react"
import { Navbar } from "@/components/Navbar"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import Image from "next/image"
import { Mic, CircleDollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"
import { cn } from "@/lib/utils"

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
      <div className="bg-maroon-800/10 pt-6 px-4 pb-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#FFCF4D] rounded-3xl p-4 flex flex-col items-center justify-between aspect-square shadow-sm hover:scale-[1.02] transition-transform cursor-pointer">
            <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center">
              <Mic className="w-7 h-7 text-black" />
            </div>
            <div className="text-center">
              <p className="font-headline font-bold text-base text-black leading-tight">Voice Chat</p>
              <p className="text-xs text-black/60">Connect now</p>
            </div>
          </div>
          <div className="bg-maroon-700 rounded-3xl p-4 flex flex-col items-center justify-between aspect-square shadow-sm hover:scale-[1.02] transition-transform cursor-pointer">
            <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center">
              <CircleDollarSign className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <p className="font-headline font-bold text-base text-white leading-tight">Tasks Center</p>
              <p className="text-xs text-white/60">Earn rewards</p>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Notification Banner */}
      <div className="px-4 py-3">
        <div className="bg-gradient-to-r from-maroon-800 to-maroon-600 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg">
          <div className="flex-1 text-xs">
            <p className="font-bold opacity-90"><span className="text-yellow-200">New Match</span> for <span className="text-blue-100">Explorer</span></p>
            <p className="opacity-80 leading-tight">Someone special just joined nearby!</p>
          </div>
          <Button size="sm" className="h-8 bg-white hover:bg-gray-100 text-black rounded-full font-bold text-[10px] px-4">
            View
          </Button>
        </div>
      </div>

      {/* Header with Title and Actions */}
      <div className="sticky top-0 z-20 bg-white px-4 py-4 flex items-center justify-between border-b border-gray-50">
        <div className="flex items-center gap-6">
          <h2 className="relative text-xl font-headline font-bold text-black scale-110">
            Recommend
            <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-maroon-800 -z-10 rounded-full" />
          </h2>
        </div>
      </div>

      {/* Users Grid */}
      <main className="px-4 grid grid-cols-2 gap-4 mt-4 pb-10">
        {users.map((user) => (
          <Link key={user.id} href={`/chat/${user.id}`} className="group relative aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-md bg-gray-100">
            <Image
              src={user.image}
              alt={user.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              data-ai-hint="person portrait"
            />
            {/* Hi Badge */}
            <div className="absolute top-3 right-3 w-11 h-11 bg-maroon-800 text-white rounded-2xl flex items-center justify-center font-headline font-black text-xl rotate-12 shadow-lg group-hover:rotate-0 transition-transform">
              H<span className="text-base">i</span>
            </div>
            
            {/* Bottom Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col gap-2">
              <h3 className="text-white font-bold text-sm truncate flex items-center gap-1">
                {user.name} 
                <span className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
              </h3>
              <div className="flex flex-wrap gap-1.5">
                <Badge className="bg-[#00D9C0] hover:bg-[#00D9C0] text-black font-bold h-5 px-2 text-[9px] rounded-lg border-none shadow-sm flex items-center gap-1">
                   🪙 {user.coins}
                </Badge>
                <Badge className="bg-white/20 text-white font-medium h-5 px-2 text-[9px] rounded-lg border-none backdrop-blur-md">
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
        .bg-maroon-600 { background-color: #b30000; }
        .bg-maroon-800\/10 { background-color: rgba(128, 0, 0, 0.1); }
        .text-maroon-800 { color: #800000; }
        .from-maroon-800 { --tw-gradient-from: #800000; --tw-gradient-to: rgb(128 0 0 / 0); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
        .to-maroon-600 { --tw-gradient-to: #b30000; }
      `}</style>
    </div>
  )
}
