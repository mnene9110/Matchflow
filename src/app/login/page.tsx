
"use client"

import { useState, useEffect } from "react"
import { Mail, Lock, ChevronLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useAuth, useUser, initiateEmailSignIn, initiateEmailSignUp } from "@/firebase"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()
  const auth = useAuth()
  const { user } = useUser()
  const { toast } = useToast()

  useEffect(() => {
    if (user && !user.isAnonymous) {
      // Redirect based on whether the account is new
      const isNewUser = user.metadata.creationTime === user.metadata.lastSignInTime;
      if (isNewUser) {
        router.push("/onboarding/full")
      } else {
        router.push("/discover")
      }
    }
  }, [user, router])

  const handleSignIn = () => {
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter both email and password.",
      })
      return
    }

    setIsPending(true)
    initiateEmailSignIn(auth, email, password)
      .catch((error: any) => {
        setIsPending(false)
        toast({
          variant: "destructive",
          title: "Sign In Failed",
          description: error.message || "Invalid email or password.",
        })
      })
  }

  const handleSignUp = () => {
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter both email and password.",
      })
      return
    }

    setIsPending(true)
    initiateEmailSignUp(auth, email, password)
      .catch((error: any) => {
        setIsPending(false)
        if (error.code === 'auth/email-already-in-use') {
          toast({
            variant: "destructive",
            title: "Account Exists",
            description: "This email is already registered. Please sign in instead.",
          })
        } else {
          toast({
            variant: "destructive",
            title: "Sign Up Failed",
            description: error.message || "Could not create account.",
          })
        }
      })
  }

  return (
    <div className="flex flex-col h-svh bg-white relative overflow-hidden">
      <div className="h-10 bg-primary w-full shrink-0" />

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
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-logo text-primary">MatchFlow</h1>
          <p className="text-muted-foreground text-lg font-medium opacity-60">
            Sign in to find your perfect match
          </p>
        </div>

        <div className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-primary/40 ml-1 uppercase tracking-widest">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
              <Input 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-16 pl-12 rounded-2xl bg-secondary/50 border-none text-gray-900 placeholder:text-muted-foreground/30 text-lg focus-visible:ring-primary/50" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-primary/40 ml-1 uppercase tracking-widest">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
              <Input 
                type="password" 
                placeholder="........" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-16 pl-12 rounded-2xl bg-secondary/50 border-none text-gray-900 placeholder:text-muted-foreground/30 text-lg focus-visible:ring-primary/50" 
              />
            </div>
          </div>
        </div>

        <div className="w-full space-y-4 pt-4">
          <Button 
            className="w-full h-16 rounded-full bg-primary hover:bg-primary/90 text-white text-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center"
            onClick={handleSignIn}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Sign In"}
          </Button>

          <Button 
            variant="secondary"
            className="w-full h-16 rounded-full bg-primary/5 hover:bg-primary/10 text-primary text-xl font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center"
            onClick={handleSignUp}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Create Account"}
          </Button>
        </div>

        <footer className="pt-4">
          <p className="text-[13px] text-muted-foreground/50 text-center leading-relaxed max-w-[280px]">
            By signing in, you agree to our <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
        </footer>
      </main>
    </div>
  )
}
