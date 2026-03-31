
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageCircle, User, Zap, Orbit, Home } from "lucide-react"
import { cn } from "@/lib/utils"

export function Navbar() {
  const pathname = usePathname()

  // Don't show navbar on welcome screen or login
  if (pathname === "/welcome" || pathname === "/login") return null

  const navItems = [
    { icon: Home, label: "Home", href: "/discover" },
    { icon: Orbit, label: "Moment", href: "/moment" },
    { icon: MessageCircle, label: "Chat", href: "/chat", badge: "99+" },
    { icon: User, label: "Me", href: "/profile", dot: true },
  ]

  return (
    <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 flex justify-around items-center py-2 px-2 z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href === "/discover" && (pathname === "/" || pathname === "/discover"))
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 relative py-2 px-4 rounded-2xl",
              isActive ? "text-black bg-[#E9FF97]" : "text-gray-400 hover:text-black"
            )}
          >
            <div className="relative">
              <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
              {item.badge && (
                <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-white min-w-[1.4rem] h-5 flex justify-center items-center shadow-sm">
                  {item.badge}
                </span>
              )}
              {item.dot && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm" />
              )}
            </div>
            <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
