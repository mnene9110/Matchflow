"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageCircle, User, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

export function Navbar() {
  const pathname = usePathname()

  // Don't show navbar on welcome screen
  if (pathname === "/welcome") return null

  const navItems = [
    { icon: Zap, label: "Home", href: "/discover" },
    { icon: MessageCircle, label: "Chat", href: "/chat" },
    { icon: User, label: "Me", href: "/profile" },
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
              "flex flex-col items-center gap-1 transition-all duration-300 px-6 py-1 rounded-2xl",
              isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
            )}
          >
            <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
