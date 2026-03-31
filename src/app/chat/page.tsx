"use client"

import { Navbar } from "@/components/Navbar"
import { Search, Heart, Gift, User, ArrowUpDown, Mail } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
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

export function ChatListPage() {
  const [activeTab, setActiveTab] = useState("Chat")

  return (
    <div className="flex flex-col min-h-svh pb-24 bg-white">
      {/* Top Header Area */}
      <header className="bg-maroon-800/10 pt-10 pb-4 px-4 sticky top-0 z-20 backdrop-blur-sm border-b border-maroon-800/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab("Chat")}
              className={cn(
                "text-2xl font-headline font-bold relative transition-all",
                activeTab === "Chat" ? "text-black" : "text-black/40"
              )}
            >
              Chat
              {activeTab === "Chat" && (
                <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-maroon-800 rounded-full" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab("Call")}
              className={cn(
                "text-2xl font-headline font-bold relative transition-all",
                activeTab === "Call" ? "text-black" : "text-black/40"
              )}
            >
              Call
              {activeTab === "Call" && (
                <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-maroon-800 rounded-full" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/40 rounded-full flex items-center justify-center">
              <Gift className="w-5 h-5 text-black" />
            </div>
            <div className="w-10 h-10 bg-white/40 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-black" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4">
        <section className="mt-2 divide-y divide-gray-50">
          {CHATS.map((chat) => (
            <Link 
              key={chat.id} 
              href={`/chat/${chat.id}`} 
              className="flex items-center gap-3 py-4 hover:bg-gray-50/50 transition-colors"
            >
              <div className="relative shrink-0">
                <div className={cn(
                  "rounded-full p-0.5",
                  chat.specialFrame ? "bg-gradient-to-tr from-maroon-600 to-maroon-800 ring-2 ring-maroon-200" : ""
                )}>
                  <Avatar className="w-14 h-14 border-2 border-white shadow-sm">
                    <AvatarImage src={chat.image} className="object-cover" />
                    <AvatarFallback>{chat.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
                {chat.online && (
                  <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <h3 className="font-bold text-base text-gray-900 truncate">{chat.name}</h3>
                  {chat.tag && (
                    <span className="flex items-center gap-0.5 text-[10px] text-orange-400 bg-orange-50 px-1 rounded-full font-medium">
                      🔥 {chat.tag}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 truncate font-medium">
                  {chat.lastMsg}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-[10px] text-gray-300 font-medium">
                  {chat.time}
                </span>
                {chat.unread > 0 && (
                  <div className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
                    {chat.unread}
                  </div>
                )}
              </div>
            </Link>
          ))}

          <div className="flex items-center gap-3 py-4">
            <div className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center shrink-0 shadow-sm">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base text-gray-900">Expired Messages</h3>
              <p className="text-sm text-gray-400 font-medium">History of old conversations</p>
            </div>
          </div>
        </section>
      </main>

      <Navbar />
      <style jsx global>{`
        .bg-maroon-800 { background-color: #800000; }
        .bg-maroon-800\/10 { background-color: rgba(128, 0, 0, 0.1); }
        .bg-maroon-800\/20 { background-color: rgba(128, 0, 0, 0.2); }
        .from-maroon-600 { --tw-gradient-from: #b30000; --tw-gradient-to: rgb(179 0 0 / 0); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
        .to-maroon-800 { --tw-gradient-to: #800000; }
        .ring-maroon-200 { --tw-ring-color: rgba(128, 0, 0, 0.2); }
      `}</style>
    </div>
  )
}

export default ChatListPage;
