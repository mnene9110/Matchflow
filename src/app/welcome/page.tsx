
"use client"

import { useEffect, useState } from "react"
import { Mail, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useAuth, useUser, initiateAnonymousSignIn } from "@/firebase"

/**
 * @fileOverview Refined landing page with rounded-corner branding.
 */
export default function WelcomePage() {
  const router = useRouter()
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  useEffect(() => {
    if (user) {
      router.replace("/discover")
    }
  }, [user, router])

  const handleFastLogin = () => {
    setIsLoggingIn(true)
    initiateAnonymousSignIn(auth)
      .then((cred) => {
        const isNew = cred.user.metadata.creationTime === cred.user.metadata.lastSignInTime;
        if (isNew) {
          router.push("/onboarding/fast")
        } else {
          router.push("/discover")
        }
      })
      .catch((error) => {
        setIsLoggingIn(false)
        console.error("Fast login failed:", error)
      })
  }

  if (isUserLoading || user) {
    return (
      <div className="flex h-svh w-full bg-[#B36666]" />
    )
  }

  return (
    <div className="flex flex-col h-svh bg-transparent relative overflow-hidden">
      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10">
        <div className="mb-10 relative">
          {/* Recreating the iconic rounded-corner branding from the screenshot */}
          <div className="w-48 h-48 bg-zinc-950 rounded-[3.5rem] shadow-2xl flex flex-col items-center justify-center border border-white/10 animate-float overflow-hidden relative">
            <div className="relative w-20 h-20 mb-3">
              <svg viewBox="0 0 24 24" className="w-full h-full text-primary fill-current filter drop-shadow-[0_0_12px_rgba(179,102,102,0.8)]" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <h2 className="text-white font-logo text-2xl tracking-tight">MatchFlow</h2>
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none" />
          </div>
          <div className="absolute -inset-10 bg-primary/20 rounded-full blur-[80px] -z-10 opacity-30" />
        </div>

        <h1 className="text-4xl font-logo text-primary mb-2">MatchFlow</h1>

        <p className="text-gray-600 text-[14px] font-medium leading-relaxed max-w-[240px] mb-12 drop-shadow-sm">
          Connect through voice, video, and premium conversations.
        </p>

        <div className="w-full space-y-4 max-w-xs">
          <Button 
            className="w-full h-16 rounded-full bg-primary text-white hover:bg-primary/90 text-lg font-black gap-3 shadow-[0_15px_40px_rgba(179,102,102,0.3)] transition-all active:scale-95"
            onClick={() => router.push("/login")}
          >
            <Mail className="w-6 h-6" />
            Continue with Email
          </Button>

          <Button 
            variant="ghost"
            className="w-full h-16 rounded-full bg-white/40 text-gray-900 border border-white/30 hover:bg-white/60 text-lg font-black gap-3 transition-all active:scale-95 backdrop-blur-md"
            onClick={handleFastLogin}
            disabled={isLoggingIn}
          >
            <Zap className="w-6 h-6 fill-current text-primary" />
            Fast Login
          </Button>
        </div>

        <footer className="mt-12">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.25em] leading-normal max-w-[200px] opacity-60">
            SECURE ACCESS • PRIVATE DATA
          </p>
        </footer>
      </main>
    </div>
  )
}
