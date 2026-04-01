"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageCircle, User, Home } from "lucide-react"
import { cn } from "@/lib/utils"

export function Navbar() {
  const pathname = usePathname()

  // Don't show navbar on welcome screen, login, or onboarding
  if (pathname === "/welcome" || pathname === "/login" || pathname === "/onboarding/fast" || pathname === "/onboarding/full") return null
  
  // Also hide on detail pages if they are meant to be immersive
  if (pathname.startsWith("/chat/") || (pathname.startsWith("/profile/") && pathname !== "/profile")) return null

  const navItems = [
    { icon: Home, label: "Home", href: "/discover" },
    { icon: MessageCircle, label: "Chat", href: "/chat" },
    { icon: User, label: "Me", href: "/profile" },
  ]

  return (
    <nav className="fixed bottom-0 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-gray-100 flex justify-around items-center py-2 px-1 z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href === "/discover" && (pathname === "/" || pathname === "/discover"))
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 transition-all duration-300 relative py-1.5 px-5",
              isActive ? "text-white" : "text-gray-400 hover:text-primary"
            )}
          >
            {/* Active Highlight Shape */}
            {isActive && (
              <div className="absolute inset-0 bg-primary -z-10 rounded-2xl scale-[0.85] shadow-lg shadow-primary/20" 
                   style={{ clipPath: 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)' }} />
            )}
            
            <div className="relative">
              <Icon className={cn("w-5 h-5", isActive && "fill-current")} />
            </div>
            <span className={cn("text-[9px] font-black tracking-tight", isActive ? "text-white" : "text-gray-400")}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
