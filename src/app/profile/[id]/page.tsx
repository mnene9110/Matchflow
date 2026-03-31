
"use client"

import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, MoreHorizontal, Phone, Plus, Globe, GraduationCap, CigaretteOff, GlassWater, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import Image from "next/image"

const MOCK_USERS = {
  "1": { name: "Lucy lucii", id: "260776900", bio: "I like to associate with new people", image: PlaceHolderImages.find(i => i.id === 'user-1')?.imageUrl, distance: "13.66km", country: "Kenya" },
  "2": { name: "honey cup", id: "260776901", bio: "Sweet and spicy personality.", image: PlaceHolderImages.find(i => i.id === 'user-2')?.imageUrl, distance: "15.2km", country: "Nigeria" },
  "3": { name: "blessed 💕💸", id: "260776902", bio: "Living life one day at a time.", image: PlaceHolderImages.find(i => i.id === 'user-5')?.imageUrl, distance: "12.1km", country: "Ghana" },
  "4": { name: "Camilla🌸🌸", id: "260776903", bio: "Lover of art and nature.", image: PlaceHolderImages.find(i => i.id === 'user-2')?.imageUrl, distance: "8.4km", country: "South Africa" },
}

export default function ProfileDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const user = MOCK_USERS[id as keyof typeof MOCK_USERS] || MOCK_USERS["1"]

  const infoTags = [
    { label: "Sometimes", icon: Globe },
    { label: "Undergraduate", icon: GraduationCap },
    { label: "Never", icon: CigaretteOff },
    { label: "Socially", icon: GlassWater },
    { label: "Change the world with one click", icon: Sparkles },
  ]

  return (
    <div className="flex flex-col min-h-svh bg-black relative">
      {/* Header Image Section */}
      <div className="relative aspect-[3/4] w-full shrink-0">
        <Image 
          src={user.image || "https://picsum.photos/seed/profile/600/800"} 
          alt={user.name} 
          fill 
          className="object-cover"
        />
        
        {/* Top Actions */}
        <div className="absolute top-12 left-4 right-4 flex justify-between items-center z-10">
          <Button variant="ghost" size="icon" className="text-white hover:bg-black/20" onClick={() => router.back()}>
            <ChevronLeft className="w-8 h-8" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-black/20">
            <MoreHorizontal className="w-8 h-8" />
          </Button>
        </div>

        {/* Online Status on Image */}
        <div className="absolute bottom-32 left-6 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
          <span className="text-white text-[10px] font-black uppercase tracking-tight">Online</span>
        </div>

        {/* Thumbnail gallery */}
        <div className="absolute bottom-24 right-4 flex gap-2">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
               <img src={`https://picsum.photos/seed/${user.id}-${i}/100/100`} className="w-full h-full object-cover" alt="gallery" />
            </div>
          ))}
        </div>
      </div>

      {/* Profile Details Container */}
      <div className="flex-1 bg-white rounded-t-[3rem] -mt-16 relative z-20 px-6 pt-8 pb-32">
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black font-headline text-gray-900 leading-tight">{user.name}</h1>
            <p className="text-xs font-bold text-gray-400">ID:{user.id}</p>
          </div>

          <div className="flex flex-wrap gap-2">
             <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-md text-[10px] font-black italic">
                <span>👤</span> 🪙 20
             </div>
             <div className="bg-amber-100/50 text-amber-600 px-2.5 py-1 rounded-md text-[10px] font-black italic">
                Online · {user.distance}
             </div>
             <div className="bg-primary/5 text-primary/70 px-2.5 py-1 rounded-md text-[10px] font-black italic">
                {user.country}
             </div>
             <div className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-md text-[10px] font-black italic">
                <span className="bg-primary text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] not-italic">A</span> 2
             </div>
          </div>

          <p className="text-sm text-gray-500 font-medium leading-relaxed">
            {user.bio}
          </p>

          <div className="pt-8 border-t border-gray-50">
             <div className="flex gap-8 mb-6 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                <span className="font-headline font-black text-xl text-gray-900 relative shrink-0">
                  Basic Information
                  <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary rounded-full" />
                </span>
                <span className="font-headline font-black text-xl text-gray-300 shrink-0">Moments</span>
                <span className="font-headline font-black text-xl text-gray-300 shrink-0">Honor</span>
             </div>

             <div className="space-y-4">
                <h3 className="text-[11px] font-black uppercase text-gray-400 tracking-widest">Basic Information</h3>
                <div className="flex flex-wrap gap-2.5">
                   {infoTags.map((tag) => (
                     <div key={tag.label} className="flex items-center gap-2 px-3.5 py-2 border-2 border-primary/20 rounded-full text-[11px] font-bold text-primary bg-primary/5">
                        <tag.icon className="w-3.5 h-3.5" />
                        {tag.label}
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 z-50 flex items-center gap-4">
        <Button 
          className="flex-1 h-14 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl shadow-primary/20 transition-transform active:scale-95"
          onClick={() => router.push(`/chat/${id}`)}
        >
          Chat
        </Button>
        <Button variant="secondary" size="icon" className="w-14 h-14 rounded-full bg-gray-100 shadow-inner shrink-0 transition-transform active:scale-95">
          <Phone className="w-6 h-6 text-gray-600 fill-current" />
        </Button>
        <Button variant="secondary" size="icon" className="w-14 h-14 rounded-full bg-gray-100 shadow-inner shrink-0 transition-transform active:scale-95">
          <Plus className="w-6 h-6 text-gray-600" />
        </Button>
      </div>
    </div>
  )
}
