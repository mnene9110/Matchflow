
"use client"

import { useEffect, useState } from "react"
import { Mail, Zap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export default function WelcomePage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isNavigatingEmail, setIsNavigatingEmail] = useState(false)

  useEffect(() => {
    // History Trap
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      try { window.close(); } catch (e) {}
    };
    
    window.addEventListener('popstate', handlePopState);

    // Supabase Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/discover")
    })

    return () => window.removeEventListener('popstate', handlePopState);
  }, [router])

  const handleSupabaseMagicLink = async () => {
    // Alternative fast login: Sign in anonymously or use Magic Link
    // Supabase anonymous auth is available in newer versions
    // For now, let's treat "Fast Login" as a path to a guest account
    setIsLoggingIn(true)
    const { data, error } = await supabase.auth.signInAnonymously()
    
    if (error) {
      setIsLoggingIn(false)
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      })
    } else {
      router.push("/onboarding/fast")
    }
  }

  const handleEmailClick = () => {
    setIsNavigatingEmail(true)
    router.push("/login")
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
            Supabase Edition
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
            onClick={handleSupabaseMagicLink} 
            disabled={isLoggingIn || isNavigatingEmail}
          >
            {isLoggingIn ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 fill-current text-[#3BC1A8]" />}
            Fast Login
          </Button>
        </div>
      </main>

      <footer className="absolute bottom-10 left-0 right-0 z-20 px-8">
        <p className="text-[10px] text-white/40 text-center leading-relaxed">
          Powered by Supabase Authentication
        </p>
      </footer>
    </div>
  )
}
