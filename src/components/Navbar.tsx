
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, MessageCircle, User, Music } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue } from "firebase/database"

export function Navbar() {
  const pathname = usePathname()
  const { database } = useFirebase()
  const { user: currentUser } = useUser()
  const [totalUnread, setTotalUnread] = useState(0)

  useEffect(() => {
    if (!database || !currentUser) return

    const userChatsRef = ref(database, `users/${currentUser.uid}/chats`)
    return onValue(userChatsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        let count = 0
        Object.values(data).forEach((chat: any) => {
          if (chat.unreadCount) {
            count += chat.unreadCount
          }
        })
        setTotalUnread(count)
      } else {
        setTotalUnread(0)
      }
    })
  }, [database, currentUser])

  // Hide Navbar on sub-pages and specific routes to keep main navigation clean
  const hiddenRoutes = [
    "/welcome",
    "/login",
    "/onboarding/fast",
    "/onboarding/full",
    "/recharge",
    "/settings",
    "/admin",
    "/support",
    "/task-center",
    "/games",
    "/mystery-note"
  ]
  
  const shouldHide = 
    hiddenRoutes.some(route => pathname.startsWith(route)) || 
    pathname.startsWith("/chat/") || 
    (pathname.startsWith("/profile/") && pathname !== "/profile") ||
    pathname === "/"

  if (shouldHide) return null

  const navItems = [
    { icon: Home, label: "Home", href: "/discover" },
    { icon: Music, label: "Party", href: "/party" },
    { icon: MessageCircle, label: "Chats", href: "/chat", badge: totalUnread },
    { icon: User, label: "Profile", href: "/profile" },
  ]

  return (
    <div className="fixed bottom-6 left-6 right-6 z-50 max-w-md mx-auto">
      <nav className="h-20 w-full bg-white/90 backdrop-blur-2xl border border-white/40 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-300 flex-1",
                isActive ? "text-primary" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all relative",
                isActive ? "bg-primary/10 text-primary scale-110" : "bg-transparent"
              )}>
                <Icon className={cn("w-5 h-5", isActive ? "stroke-[3px]" : "stroke-[2px]")} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary flex items-center justify-center text-[8px] font-black text-white border-2 border-white shadow-sm">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-[0.1em] mt-0.5",
                isActive ? "text-primary" : "text-gray-400"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
