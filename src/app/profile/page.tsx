
"use client"

import { Navbar } from "@/components/Navbar"
import { 
  Settings as SettingsIcon, 
  ChevronRight, 
  Copy, 
  Coins, 
  Crown, 
  ClipboardList, 
  Wallet, 
  Store, 
  ShieldCheck, 
  Briefcase, 
  TrendingUp, 
  Award, 
  Headset, 
  MessageSquareText,
  Gamepad2
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const router = useRouter()
  const stats = [
    { label: "Friends", value: 0 },
    { label: "Following", value: 0 },
    { label: "Followers", value: 18 },
    { label: "Visitors", value: "11,293", hasDot: true },
  ]

  const games = [
    { name: "DeepSea Treasure", image: "https://picsum.photos/seed/deepsea/200/150", hint: "underwater ocean" },
    { name: "Gates Of Olympus", image: "https://picsum.photos/seed/olympus/200/150", hint: "mountain peak" },
    { name: "Mr. Rich", image: "https://picsum.photos/seed/rich/200/150", hint: "serene river" },
  ]

  const actions = [
    { label: "Tasks", icon: ClipboardList, color: "text-red-500", bg: "bg-red-50" },
    { label: "Income", icon: Wallet, color: "text-primary", bg: "bg-red-50" },
    { label: "Store", icon: Store, color: "text-red-500", bg: "bg-red-50" },
    { label: "Aristocracy", icon: Crown, color: "text-amber-600", bg: "bg-amber-50" },
  ]

  const otherTools = [
    { label: "Bag", icon: Briefcase },
    { label: "Level", icon: TrendingUp },
    { label: "Badge", icon: Award },
    { label: "Certified", icon: ShieldCheck },
    { label: "Service", icon: Headset },
    { label: "Feedback", icon: MessageSquareText },
    { label: "Settings", icon: SettingsIcon, href: "/settings" },
  ]

  return (
    <div className="flex flex-col min-h-svh bg-transparent pb-24">
      {/* Header Area */}
      <header className="relative pt-12 pb-8 px-6 overflow-hidden bg-primary rounded-b-[3rem] shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
        
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black font-headline text-white">MCC🤨</h1>
              <ChevronRight className="w-4 h-4 text-white/60" />
            </div>
            
            <div className="flex gap-1.5">
              <span className="bg-white/10 px-1.5 py-0.5 rounded-md text-[8px] font-black text-white italic backdrop-blur-sm">SVIP1</span>
              <span className="bg-white/10 px-1.5 py-0.5 rounded-md text-[8px] font-black text-white italic backdrop-blur-sm">V VIP4</span>
              <span className="bg-white/10 px-1.5 py-0.5 rounded-md text-[8px] font-black text-white italic backdrop-blur-sm">✦ 16.</span>
            </div>

            <div className="flex items-center gap-1.5 text-white/40">
              <span className="text-[10px] font-bold tracking-tight">ID:667541426</span>
              <div className="p-0.5 hover:bg-white/5 rounded transition-colors cursor-pointer">
                <Copy className="w-3 h-3" />
              </div>
            </div>
          </div>

          <Avatar className="w-16 h-16 shadow-2xl border-none">
            <AvatarImage src={PlaceHolderImages.find(i => i.id === 'nature-1')?.imageUrl} className="object-cover" />
            <AvatarFallback>M</AvatarFallback>
          </Avatar>
        </div>

        {/* Stats Row */}
        <div className="flex justify-between mt-6 pr-6">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <div className="flex items-center gap-0.5">
                <span className="text-lg font-black text-white">{stat.value}</span>
                {stat.hasDot && <div className="w-1.5 h-1.5 bg-accent rounded-full border border-primary" />}
              </div>
              <span className="text-[9px] text-white/50 font-black uppercase tracking-widest">{stat.label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 mt-6 space-y-6">
        {/* Wallet Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary rounded-[2rem] p-5 flex items-center gap-3 shadow-lg hover:scale-[1.01] transition-transform cursor-pointer">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-white">98</span>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-5 flex items-center justify-center shadow-lg hover:scale-[1.01] transition-transform cursor-pointer">
             <span className="text-2xl font-black text-primary italic tracking-tighter">VIP4</span>
          </div>
        </div>

        {/* Recommended Games */}
        <section className="bg-white/60 backdrop-blur-md rounded-[2.5rem] p-6 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-headline font-black text-base">Recommended Games</h2>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {games.map((game) => (
              <div key={game.name} className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                  <Image src={game.image} alt={game.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" data-ai-hint={game.hint} />
                </div>
                <span className="text-[9px] font-black text-gray-700 text-center leading-tight px-0.5">{game.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Icon Grid (Action Center) */}
        <section className="bg-white/80 rounded-[2.5rem] p-6 grid grid-cols-4 gap-y-8">
          {actions.map((action) => (
            <div key={action.label} className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className={`w-12 h-12 ${action.bg} rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                <action.icon className={`w-6 h-6 ${action.color}`} />
              </div>
              <span className="text-[10px] font-black text-gray-500">{action.label}</span>
            </div>
          ))}
        </section>

        {/* Other Tools */}
        <section className="space-y-6 pb-4">
          <h2 className="font-headline font-black text-base px-1">Other Tools</h2>
          <div className="grid grid-cols-4 gap-y-8">
            {otherTools.map((tool) => (
              <div 
                key={tool.label} 
                className="flex flex-col items-center gap-2 group cursor-pointer"
                onClick={() => tool.href && router.push(tool.href)}
              >
                <div className="w-11 h-11 flex items-center justify-center rounded-full group-hover:bg-primary/10 transition-colors">
                  <tool.icon className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                </div>
                <span className="text-[10px] font-black text-gray-400 group-hover:text-primary text-center transition-colors">{tool.label}</span>
              </div>
            ))}
            <div className="flex flex-col items-center gap-2 relative group cursor-pointer">
               <div className="bg-primary rounded-2xl p-3 shadow-lg shadow-primary/10 group-hover:scale-105 transition-transform">
                  <Gamepad2 className="w-6 h-6 text-white" />
               </div>
               <span className="absolute -bottom-1 bg-accent text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm text-black">PLAY</span>
            </div>
          </div>
        </section>
      </main>

      <Navbar />
    </div>
  )
}
