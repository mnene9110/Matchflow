"use client"

import { useEffect, useState } from "react"
import { Mail, Zap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useAuth, useUser, initiateAnonymousSignIn, useFirebase } from "@/firebase"
import { doc, getDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export default function WelcomePage() {
  const router = useRouter()
  const auth = useAuth()
  const { firestore } = useFirebase()
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()
  
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isNavigatingEmail, setIsNavigatingEmail] = useState(false)

  useEffect(() => {
    // 1. History Trap: Prevent back button from leaving this page
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      // Attempt to close the app (works in some mobile browsers/standalone modes)
      try {
        window.close();
      } catch (e) {
        // Fallback: stay on page
      }
    };
    
    window.addEventListener('popstate', handlePopState);

    // 2. Auth handling
    if (user && !isUserLoading && firestore && !isLoggingIn) {
      getDoc(doc(firestore, "userProfiles", user.uid)).then(snap => {
        if (snap.exists()) {
          router.replace("/discover")
        } else {
          router.replace("/onboarding/fast")
        }
      })
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, isUserLoading, firestore, router, isLoggingIn])

  const handleFastLogin = async () => {
    if (isLoggingIn || isNavigatingEmail) return
    setIsLoggingIn(true)
    
    try {
      const cred = await initiateAnonymousSignIn(auth)
      if (firestore) {
        const snap = await getDoc(doc(firestore, "userProfiles", cred.user.uid))
        if (snap.exists()) {
          router.push("/discover")
        } else {
          router.push("/onboarding/fast")
        }
      }
    } catch (error: any) {
      setIsLoggingIn(false)
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "An error occurred during fast login.",
      })
    }
  }

  const handleEmailClick = () => {
    setIsNavigatingEmail(true)
    router.push("/login")
  }

  if (isUserLoading || (user && !isLoggingIn)) {
    return (
      <div className="flex h-svh w-full flex-col items-center justify-center bg-[#3BC1A8]">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <h1 className="text-5xl font-logo text-white drop-shadow-2xl">
            MatchFlow
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-svh bg-zinc-950 relative overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-50"
      >
        <source src="/background.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/20 z-0" />

      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10">
        <div className="space-y-2 mb-28">
          <h1 className="text-3xl font-logo text-[#3BC1A8]">MatchFlow</h1>
          <p className="text-white/70 text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed max-w-[240px] mx-auto">
            Connect with Heart
          </p>
        </div>

        <div className="w-full space-y-4 max-w-xs">
          <Button 
            className="w-full h-16 rounded-full bg-[#3BC1A8] text-white hover:bg-[#34b098] text-lg font-black gap-3 shadow-xl transition-all active:scale-95 flex items-center justify-center border-none" 
            onClick={handleEmailClick}
            disabled={isNavigatingEmail || isLoggingIn}
          >
            {isNavigatingEmail ? <Loader2 className="w-6 h-6 animate-spin" /> : <Mail className="w-6 h-6" />}
            Continue with Email
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full h-16 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 text-lg font-black gap-3 transition-all active:scale-95 shadow-sm flex items-center justify-center" 
            onClick={handleFastLogin} 
            disabled={isLoggingIn || isNavigatingEmail}
          >
            {isLoggingIn ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 fill-current text-[#3BC1A8]" />}
            Fast Login
          </Button>
        </div>
      </main>

      <footer className="absolute bottom-10 left-0 right-0 z-20 px-8">
        <p className="text-[10px] text-white/40 text-center leading-relaxed">
          By signing up, you agree to our{" "}
          <span 
            className="underline cursor-pointer hover:text-white transition-colors"
            onClick={() => router.push('/settings/terms')}
          >
            Terms of Service
          </span>{" "}
          and{" "}
          <span 
            className="underline cursor-pointer hover:text-white transition-colors"
            onClick={() => router.push('/settings/privacy')}
          >
            Privacy Policy
          </span>.
        </p>
      </footer>
    </div>
  )
}
