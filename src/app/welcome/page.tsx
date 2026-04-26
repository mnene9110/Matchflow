
"use client"

import { useEffect, useState } from "react"
import { Mail, Zap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useFirebase } from "@/firebase/provider"
import { useToast } from "@/hooks/use-toast"
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login"

export default function WelcomePage() {
  const router = useRouter()
  const { auth } = useFirebase()
  const { toast } = useToast()
  
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isNavigatingEmail, setIsNavigatingEmail] = useState(false)

  const handleFastLogin = async () => {
    setIsLoggingIn(true)
    try {
      await initiateAnonymousSignIn(auth);
      router.push("/discover");
    } catch (error: any) {
      setIsLoggingIn(false);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
    }
  }

  return (
    <div className="flex flex-col h-svh bg-zinc-950 relative overflow-hidden">
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
            onClick={() => router.push("/login")}
            disabled={isNavigatingEmail || isLoggingIn}
          >
            <Mail className="w-6 h-6" />
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
          Experience meaningful connections instantly.
        </p>
      </footer>
    </div>
  )
}
