"use client"

import { Mail, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useAuth, initiateAnonymousSignIn } from "@/firebase"

export default function WelcomePage() {
  const router = useRouter()
  const auth = useAuth()

  const handleFastLogin = () => {
    initiateAnonymousSignIn(auth)
    // Auth state change in layout will handle redirection if needed, 
    // but for now we just push to discover after triggering
    router.push("/discover")
  }

  return (
    <div className="flex flex-col h-svh bg-white relative overflow-hidden">
      {/* Status Bar simulation as per image */}
      <div className="h-10 bg-[#7E8EF1] w-full" />

      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        {/* App Icon */}
        <div className="mb-8 relative">
          <div className="w-28 h-28 bg-[#7E8EF1] rounded-[2rem] shadow-2xl flex items-center justify-center transform rotate-3">
            <span className="text-white text-5xl font-bold font-headline -rotate-3">MF</span>
          </div>
          <div className="absolute -inset-4 bg-[#7E8EF1]/10 rounded-full blur-3xl -z-10" />
        </div>

        {/* Title */}
        <h1 className="text-5xl font-logo text-[#7E8EF1] mb-6">MatchFlow</h1>

        {/* Tagline */}
        <p className="text-muted-foreground text-lg leading-relaxed max-w-[280px] mb-20">
          Connect through voice, video, and meaningful conversations.
        </p>

        {/* Action Buttons */}
        <div className="w-full space-y-4 max-w-sm">
          <Button 
            className="w-full h-16 rounded-full bg-[#7E8EF1] hover:bg-[#6C7DE0] text-white text-lg font-bold gap-3 shadow-lg shadow-[#7E8EF1]/20"
            onClick={() => router.push("/login")}
          >
            <Mail className="w-6 h-6" />
            Continue with Email
          </Button>

          <Button 
            variant="secondary"
            className="w-full h-16 rounded-full bg-[#1F2937] hover:bg-[#111827] text-white text-lg font-bold gap-3 shadow-lg"
            onClick={handleFastLogin}
          >
            <Zap className="w-6 h-6 fill-current" />
            Fast Login
          </Button>
        </div>

        {/* Footer Text */}
        <footer className="mt-12">
          <p className="text-[11px] text-muted-foreground leading-normal max-w-[240px]">
            By continuing, you agree to our <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
        </footer>
      </main>
    </div>
  )
}
