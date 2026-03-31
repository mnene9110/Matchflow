"use client"

import { Navbar } from "@/components/Navbar"
import { Gift, User, Mail } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { cn } from "@/lib/utils"
import { useState } from "react"

const CHATS = [
  { id: "1", name: "kerry 🌚😟🥰", lastMsg: "Ata wewe uko uku? tunaweza d...", time: "03-31 11:01", unread: 1, image: PlaceHolderImages.find(i => i.id === 'user-1')?.imageUrl, online: true, tag: "0.2°C" },
  { id: "2", name: "honey cup 🌹😏", lastMsg: "hello baby 🥰🥰🥰", time: "03-31 10:59", unread: 2, image: PlaceHolderImages.find(i => i.id === 'user-2')?.imageUrl, online: false },
  { id: "3", name: "Angel 💞", lastMsg: "hi how are you 🥰Pls check my...", time: "03-31 08:40", unread: 1, image: PlaceHolderImages.find(i => i.id === 'user-5')?.imageUrl, online: false },
  { id: "4", name: "natasha956", lastMsg: "hi am doing good", time: "03-31 07:45", unread: 1, image: PlaceHolderImages.find(i => i.id === 'user-3')?.imageUrl, online: false, tag: "0.2°C" },
  { id: "5", name: "shania", lastMsg: "what are you doing darling", time: "03-31 07:44", unread: 2, image: PlaceHolderImages.find(i => i.id === 'user-4')?.imageUrl, online: false },
  { id: "6", name: "Naughty Mama❤️", lastMsg: "unataka mamaaa mwenye atak...", time: "03-31 07:41", unread: 0, image: "https://picsum.photos/seed/naughty/200/200", online: true, specialFrame: true, tag: "0.2°C" },
  { id: "7", name: "Jojo 💦💋", lastMsg: "hi how are you 🥰Pls check my...", time: "03-31 07:41", unread: 1, image: "https://picsum.photos/seed/jojo/200/200", online: false },
  { id: "8", name: "bella", lastMsg: "heey", time: "03-31 07:39", unread: 2, image: "https://picsum.photos/seed/bella/200/200", online: false, tag: "0.2°C" },
]

export default function ChatListPage() {
  const [activeTab, setActiveTab] = useState("Chat")

  return (
    <div className="flex flex-col min-h-svh pb-24 bg-transparent">
      {/* Top Header Area */}
      <header className="bg-transparent pt-10 pb-4 px-6 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab("Chat")}
              className={cn(
                "text-2xl font-headline font-black relative transition-all",
                activeTab === "Chat" ? "text-white" : "text-white/40"
              )}
            >
              Chat
              {activeTab === "Chat" && (
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-accent rounded-full" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab("Call")}
              className={cn(
                "text-2xl font-headline font-black relative transition-all",
                activeTab === "Call" ? "text-white" : "text-white/40"
              )}
            >
              Call
              {activeTab === "Call" && (
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-accent rounded-full" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer">
              <Gift className="w-4 h-4" />
            </div>
            <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer">
              <User className="w-4 h-4" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 mt-4 bg-white rounded-t-[3rem] shadow-2xl pt-6">
        <section>
          {CHATS.map((chat) => (
            <Link 
              key={chat.id} 
              href={`/chat/${chat.id}`} 
              className="flex items-center gap-4 py-4 hover:bg-gray-50/50 rounded-2xl px-2 transition-colors group"
            >
              <div className="relative shrink-0">
                <div className={cn(
                  "rounded-full p-0.5 transition-transform group-active:scale-95",
                  chat.specialFrame ? "bg-gradient-to-tr from-primary to-accent p-[2px]" : ""
                )}>
                  <Avatar className="w-14 h-14 border-2 border-white shadow-sm">
                    <AvatarImage src={chat.image} className="object-cover" />
                    <AvatarFallback>{chat.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
                {chat.online && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-md" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-sm text-gray-900 truncate">{chat.name}</h3>
                  {chat.tag && (
                    <span className="flex items-center gap-0.5 text-[9px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-md font-black italic">
                      🔥 {chat.tag}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-gray-400 truncate font-medium">
                  {chat.lastMsg}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                <span className="text-[9px] text-gray-300 font-bold tracking-tighter">
                  {chat.time}
                </span>
                {chat.unread > 0 && (
                  <div className="bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow-lg shadow-red-100">
                    {chat.unread}
                  </div>
                )}
              </div>
            </Link>
          ))}

          <div className="flex items-center gap-4 py-6 px-2 mt-2 border-t border-gray-50 opacity-60">
            <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-amber-50">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-gray-900">Expired Messages</h3>
              <p className="text-xs text-gray-400 font-medium">History of old conversations</p>
            </div>
          </div>
        </section>
      </main>

      <Navbar />
    </div>
  )
}
