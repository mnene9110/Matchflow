"use client"

import { useState, useEffect } from "react"
import { Mail, Lock, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useAuth, useUser, initiateEmailSignIn, initiateEmailSignUp } from "@/firebase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()
  const auth = useAuth()
  const { user } = useUser()

  // Redirect to discover if already logged in
  useEffect(() => {
    if (user) {
      router.push("/discover")
    }
  }, [user, router])

  const handleSignIn = () => {
    if (email && password) {
      initiateEmailSignIn(auth, email, password)
    }
  }

  const handleSignUp = () => {
    if (email && password) {
      initiateEmailSignUp(auth, email, password)
    }
  }

  return (
    <div className="flex flex-col h-svh bg-white relative overflow-hidden">
      {/* Status Bar simulation */}
      <div className="h-10 bg-[#7E8EF1] w-full shrink-0" />

      {/* Back Button */}
      <header className="absolute top-12 left-2 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-muted-foreground/40 hover:bg-transparent"
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 w-full max-w-sm mx-auto space-y-10">
        {/* Logo Section */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-logo text-[#7E8EF1]">MatchFlow</h1>
          <p className="text-muted-foreground text-lg font-medium opacity-60">
            Sign in to find your perfect match
          </p>
        </div>

        {/* Input Section */}
        <div className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground/30 ml-1 uppercase tracking-widest">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
              <Input 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-16 pl-12 rounded-2xl bg-[#1F2937] border-none text-white placeholder:text-muted-foreground/30 text-lg focus-visible:ring-primary/50" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground/30 ml-1 uppercase tracking-widest">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
              <Input 
                type="password" 
                placeholder="........" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-16 pl-12 rounded-2xl bg-[#1F2937] border-none text-white placeholder:text-muted-foreground/30 text-lg focus-visible:ring-primary/50" 
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-4 pt-4">
          <Button 
            className="w-full h-16 rounded-full bg-[#7E8EF1] hover:bg-[#6C7DE0] text-white text-xl font-bold shadow-lg shadow-[#7E8EF1]/20 transition-all active:scale-95"
            onClick={handleSignIn}
          >
            Sign In
          </Button>

          <Button 
            variant="secondary"
            className="w-full h-16 rounded-full bg-[#1F2937] hover:bg-[#111827] text-white text-xl font-bold shadow-lg transition-all active:scale-95"
            onClick={handleSignUp}
          >
            Create Account
          </Button>
        </div>

        {/* Legal Footer */}
        <footer className="pt-4">
          <p className="text-[13px] text-muted-foreground/50 text-center leading-relaxed max-w-[280px]">
            By signing in, you agree to our <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
        </footer>
      </main>
    </div>
  )
}
