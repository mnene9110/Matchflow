
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/firebase"

/**
 * @fileOverview Root entry point that handles initial routing.
 * Optimized to prevent "blinking" by matching the global background theme.
 */
export default function Home() {
  const { user, isUserLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        router.replace("/discover")
      } else {
        router.replace("/welcome")
      }
    }
  }, [user, isUserLoading, router])

  // Use the app's brand red color to prevent a flash during transition
  return (
    <div className="flex h-svh w-full bg-[#FF3737]" />
  )
}
