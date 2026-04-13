
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useFirebase, useUser } from "@/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"

export function Navbar() {
  const pathname = usePathname()
  const { firestore } = useFirebase()
  const { user: currentUser } = useUser()
  const [totalUnread, setTotalUnread] = useState(0)

  useEffect(() => {
    if (!firestore || !currentUser) return

    const chatsQuery = query(
      collection(firestore, "chats"),
      where("participants", "array-contains", currentUser.uid)
    )

    return onSnapshot(chatsQuery, (snapshot) => {
      let count = 0
      snapshot.docs.forEach((doc) => {
        const data = doc.data()
        const unread = data[`unreadCount_${currentUser.uid}`] || 0
        count += unread
      })
      setTotalUnread(count)
    })
  }, [firestore, currentUser])

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
    "/mystery-note",
    "/coinseller/award",
    "/admin/award"
  ]
  
  const shouldHide = 
    hiddenRoutes.some(route => pathname.startsWith(route)) || 
    pathname.startsWith("/chat/") || 
    (pathname.startsWith("/profile/") && pathname !== "/profile") ||
    pathname === "/"

  if (shouldHide) return null

  const navItems = [
    { icon: "/home.png", label: "Home", href: "/discover" },
    { icon: "/chat.png", label: "Chats", href: "/chat", badge: totalUnread },
    { icon: "/me.png", label: "You", href: "/profile" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      <nav className="h-20 w-full flex items-center justify-around px-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all duration-300 flex-1",
                isActive ? "text-[#3BC1A8]" : "text-gray-300"
              )}
            >
              <div className="relative">
                <div className="relative w-6 h-6">
                  <Image 
                    src={item.icon} 
                    alt={item.label} 
                    fill 
                    className={cn("object-contain transition-opacity duration-300", isActive ? "opacity-100" : "opacity-40")} 
                  />
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-[#3BC1A8] flex items-center justify-center text-[8px] font-black text-white border-2 border-white shadow-sm">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[9px] font-black tracking-[0.1em]",
                isActive ? "text-[#3BC1A8]" : "text-gray-300"
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
