
"use client"

import { useEffect, useState } from "react"
import { Mail, Zap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useAuth, useUser, initiateAnonymousSignIn, useFirebase } from "@/firebase"
import { doc, getDoc } from "firebase/firestore"

export default function WelcomePage() {
  const router = useRouter()
  const auth = useAuth()
  const { firestore } = useFirebase()
  const { user, isUserLoading } = useUser()
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  useEffect(() => {
    if (user && !isUserLoading && firestore) {
      getDoc(doc(firestore, "userProfiles", user.uid)).then(snap => {
        if (snap.exists()) {
          router.replace("/discover")
        } else {
          router.replace("/onboarding/fast")
        }
      })
    }
  }, [user, isUserLoading, firestore, router])

  const handleFastLogin = () => {
    setIsLoggingIn(true)
    initiateAnonymousSignIn(auth)
      .then(async (cred) => {
        if (firestore) {
          const snap = await getDoc(doc(firestore, "userProfiles", cred.user.uid))
          if (snap.exists()) {
            router.push("/discover")
          } else {
            router.push("/onboarding/fast")
          }
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
          <div className="w-48 h-48 bg-zinc-950 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center border border-white/10 animate-float overflow-hidden relative">
            <div className="relative w-24 h-24 mb-2 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-full h-full text-primary fill-current filter drop-shadow-[0_0_15px_rgba(179,102,102,0.9)]" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <h2 className="text-white font-logo text-3xl tracking-tight">MatchFlow</h2>
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none" />
          </div>
          <div className="absolute -inset-10 bg-primary/20 rounded-full blur-[90px] -z-10 opacity-30" />
        </div>

        <h1 className="text-5xl font-logo text-primary mb-2 drop-shadow-md">MatchFlow</h1>
        <p className="text-[#5A1010]/80 text-[15px] font-black uppercase tracking-[0.1em] leading-relaxed max-w-[240px] mb-12">Connect with Heart</p>

        <div className="w-full space-y-4 max-w-xs">
          <Button className="w-full h-16 rounded-full bg-[#5A1010] text-white hover:bg-[#5A1010]/90 text-lg font-black gap-3 shadow-[0_15px_40px_rgba(0,0,0,0.2)] transition-all active:scale-95" onClick={() => router.push("/login")}>
            <Mail className="w-6 h-6" /> Continue with Email
          </Button>
          <Button variant="ghost" className="w-full h-16 rounded-full bg-white/40 text-gray-900 border border-white/30 hover:bg-white/60 text-lg font-black gap-3 transition-all active:scale-95 backdrop-blur-md shadow-sm" onClick={handleFastLogin} disabled={isLoggingIn}>
            {isLoggingIn ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 fill-current text-primary" />} Fast Login
          </Button>
        </div>
        <footer className="mt-12"><p className="text-[10px] text-gray-900 font-black uppercase tracking-[0.25em] leading-normal max-w-[200px] opacity-40">SECURE ACCESS • PRIVATE DATA</p></footer>
      </main>
    </div>
  )
}
