
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, MessageCircle, User } from "lucide-react"
import { cn } from "@/lib/utils"

export function Navbar() {
  const pathname = usePathname()

  if (pathname === "/welcome" || pathname === "/login" || pathname === "/onboarding/fast" || pathname === "/onboarding/full") return null
  if (pathname.startsWith("/chat/") || (pathname.startsWith("/profile/") && pathname !== "/profile")) return null

  const navItems = [
    { icon: Home, label: "Home", href: "/discover" },
    { icon: MessageCircle, label: "Chats", href: "/chat" },
    { icon: User, label: "Profile", href: "/profile" },
  ]

  return (
    <div className="fixed bottom-6 left-6 right-6 z-50 max-w-md mx-auto">
      <nav className="h-20 w-full bg-white/90 backdrop-blur-2xl border border-white/40 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/discover" && (pathname === "/" || pathname === "/discover"))
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
                "p-2 rounded-2xl transition-all",
                isActive ? "bg-primary/10 text-primary scale-110" : "bg-transparent"
              )}>
                <Icon className={cn("w-5 h-5", isActive ? "stroke-[3px]" : "stroke-[2px]")} />
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
