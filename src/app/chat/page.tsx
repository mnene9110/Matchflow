"use client"

import { Navbar } from "@/components/Navbar"
import { Search, Heart } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { PlaceHolderImages } from "@/lib/placeholder-images"

const CHATS = [
  { id: "1", name: "Elena", lastMsg: "That sounds interesting! Tell me more? 😊", time: "10:30 AM", unread: 1, image: PlaceHolderImages.find(i => i.id === 'user-1')?.imageUrl },
  { id: "2", name: "Marcus", lastMsg: "Sent you a video call request", time: "Yesterday", unread: 0, image: PlaceHolderImages.find(i => i.id === 'user-4')?.imageUrl },
  { id: "3", name: "Sophia", lastMsg: "I love that museum too!", time: "Monday", unread: 0, image: PlaceHolderImages.find(i => i.id === 'user-5')?.imageUrl },
]

export default function ChatListPage() {
  return (
    <div className="flex flex-col min-h-svh pb-20">
      <header className="p-6 space-y-4">
        <h1 className="text-3xl font-headline font-bold text-primary">Messages</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input placeholder="Search matches..." className="pl-10 rounded-full bg-muted/50 border-none" />
        </div>
      </header>

      <main className="flex-1">
        <section className="px-6 mb-6">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">New Matches</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
             {CHATS.map(chat => (
               <div key={chat.id} className="flex flex-col items-center gap-2 flex-shrink-0">
                  <Avatar className="w-16 h-16 border-2 border-primary p-0.5">
                    <AvatarImage src={chat.image} className="rounded-full" />
                    <AvatarFallback>{chat.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] font-medium">{chat.name}</span>
               </div>
             ))}
             <div className="flex flex-col items-center gap-2 flex-shrink-0">
               <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted flex items-center justify-center bg-muted/20">
                  <Heart className="w-6 h-6 text-muted" />
               </div>
               <span className="text-[10px] font-medium text-muted">Discover</span>
             </div>
          </div>
        </section>

        <section className="px-2">
          {CHATS.map((chat) => (
            <Link key={chat.id} href={`/chat/${chat.id}`} className="flex items-center gap-4 p-4 hover:bg-primary/5 rounded-3xl transition-colors">
              <Avatar className="w-14 h-14">
                <AvatarImage src={chat.image} />
                <AvatarFallback>{chat.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-sm">{chat.name}</h3>
                  <span className="text-[10px] text-muted-foreground">{chat.time}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{chat.lastMsg}</p>
              </div>
              {chat.unread > 0 && (
                <Badge className="bg-primary hover:bg-primary rounded-full px-1.5 h-5 min-w-[1.25rem] flex justify-center items-center text-[10px]">
                  {chat.unread}
                </Badge>
              )}
            </Link>
          ))}
        </section>
      </main>

      <Navbar />
    </div>
  )
}
