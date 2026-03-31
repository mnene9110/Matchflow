
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Heart, MessageCircle, User, Zap, Coins } from "lucide-react"
import { cn } from "@/lib/utils"

export function Navbar() {
  const pathname = usePathname()

  const navItems = [
    { icon: Zap, label: "Discover", href: "/discover" },
    { icon: MessageCircle, label: "Chat", href: "/chat" },
    { icon: Coins, label: "Coins", href: "/coins" },
    { icon: User, label: "Profile", href: "/profile" },
  ]

  return (
    <nav className="fixed bottom-0 w-full max-w-md bg-white/80 backdrop-blur-lg border-t border-border flex justify-around items-center py-3 z-50">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 px-4 py-1 rounded-2xl",
              isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
            )}
          >
            <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
            <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
