
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
    // History Trap to prevent easy accidental exits on some platforms
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    
    window.addEventListener('popstate', handlePopState);

    // Initial check for existing session
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) router.replace("/discover")
      })
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [router])

  /**
   * Persistent Fast Login Logic
   * Instead of standard anonymous auth (which is lost on sign out),
   * we use a cached email/password guest identity.
   */
  const handlePersistentFastLogin = async () => {
    setIsLoggingIn(true)
    try {
      const STORAGE_KEY = 'mf_persistent_guest';
      const savedCreds = localStorage.getItem(STORAGE_KEY);

      if (savedCreds) {
        try {
          const { email, password } = JSON.parse(savedCreds);
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          
          if (!error && data.session) {
            router.push("/discover");
            return;
          }
          // If error (e.g. account deleted), proceed to create new one
        } catch (e) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      // Create a new Persistent Guest Account
      const randomId = Math.random().toString(36).substring(2, 10);
      const guestEmail = `guest_${randomId}@matchflow.app`;
      const guestPassword = `pass_${randomId}_${Date.now()}`;

      const { data, error } = await supabase.auth.signUp({
        email: guestEmail,
        password: guestPassword,
        options: {
          data: { display_name: `Guest_${randomId}` }
        }
      });

      if (error) throw error;

      if (data.session) {
        // Cache credentials locally for future restoration
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ email: guestEmail, password: guestPassword }));
        router.push("/onboarding/fast");
      } else {
        // If email confirmation is ON, we might need a different strategy, 
        // but for Fast Login we assume Confirm Email is OFF.
        toast({ title: "Account Created", description: "Please sign in with your credentials." });
      }

    } catch (error: any) {
      setIsLoggingIn(false);
      toast({
        variant: "destructive",
        title: "Fast Login Failed",
        description: error.message || "Please use email login instead.",
      });
    }
  }

  const handleEmailClick = () => {
    setIsNavigatingEmail(true)
    router.push("/login")
  }

  return (
    <div className="flex flex-col h-svh bg-zinc-950 relative overflow-hidden">
      {/* Background Decorative Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#3BC1A8]/20 via-zinc-950 to-zinc-950 z-0" />

      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10">
        <div className="space-y-2 mb-28">
          <h1 className="text-6xl font-logo text-[#3BC1A8] drop-shadow-2xl">MatchFlow</h1>
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
            onClick={handlePersistentFastLogin} 
            disabled={isLoggingIn || isNavigatingEmail}
          >
            {isLoggingIn ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 fill-current text-[#3BC1A8]" />}
            Fast Login
          </Button>
        </div>
      </main>

      <footer className="absolute bottom-10 left-0 right-0 z-20 px-8">
        <p className="text-[10px] text-white/40 text-center leading-relaxed">
          Experience meaningful connections instantly.
        </p>
      </footer>
    </div>
  )
}
