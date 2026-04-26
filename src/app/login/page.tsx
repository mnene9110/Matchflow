"use client"

import { useState, useEffect } from "react"
import { Mail, Lock, ChevronLeft, Loader2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/discover")
    })
  }, [router])

  const handleSignIn = async () => {
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter both email and password.",
      })
      return
    }

    setIsPending(true)
    setNeedsConfirmation(false)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setIsPending(false)
      if (error.message.toLowerCase().includes("confirm")) {
        setNeedsConfirmation(true)
      }
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: error.message,
      })
    } else {
      router.push("/discover")
    }
  }

  const handleSignUp = async () => {
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter both email and password.",
      })
      return
    }

    setIsPending(true)
    setNeedsConfirmation(false)
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: email.split('@')[0],
        }
      }
    })

    setIsPending(false)
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message,
      })
    } else {
      if (data.session) {
        // Logged in immediately (Confirm Email is OFF in Supabase)
        router.push("/onboarding/full")
      } else {
        // Email confirmation is ON in Supabase
        setNeedsConfirmation(true)
        toast({
          title: "Check your email",
          description: "We've sent a verification link to your inbox.",
        })
      }
    }
  }

  return (
    <div className="flex flex-col h-svh bg-white relative overflow-hidden text-gray-900">
      <header className="absolute top-12 left-2 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-gray-400 hover:bg-transparent"
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 w-full max-w-sm mx-auto space-y-10">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-logo text-primary">MatchFlow</h1>
          <p className="text-gray-400 text-lg font-medium">
            Sign in via Supabase Auth
          </p>
        </div>

        {needsConfirmation && (
          <Alert className="bg-amber-50 border-amber-200 text-amber-900 rounded-2xl">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertTitle className="font-black text-xs uppercase tracking-widest">Confirmation Required</AlertTitle>
            <AlertDescription className="text-[11px] font-medium leading-relaxed">
              Please check your email to verify your account. 
              <br /><br />
              <span className="font-bold italic text-amber-700">Tip: To skip this, disable "Confirm email" in your Supabase Auth settings.</span>
            </AlertDescription>
          </Alert>
        )}

        <div className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-primary ml-1 uppercase tracking-widest">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <Input 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-16 pl-12 rounded-2xl bg-gray-50 border-gray-100 text-gray-900 placeholder:text-gray-300 text-lg focus-visible:ring-primary/50" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-primary ml-1 uppercase tracking-widest">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <Input 
                type="password" 
                placeholder="........" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-16 pl-12 rounded-2xl bg-gray-50 border-gray-100 text-gray-900 placeholder:text-gray-300 text-lg focus-visible:ring-primary/50" 
              />
            </div>
          </div>
        </div>

        <div className="w-full space-y-4 pt-4">
          <Button 
            className="w-full h-16 rounded-full bg-primary hover:bg-primary/90 text-white text-xl font-bold shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center"
            onClick={handleSignIn}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Sign In"}
          </Button>

          <Button 
            variant="ghost"
            className="w-full h-16 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-900 text-xl font-bold transition-all active:scale-95 flex items-center justify-center"
            onClick={handleSignUp}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Create Account"}
          </Button>
        </div>

        <footer className="pt-4">
          <p className="text-[13px] text-gray-400 text-center leading-relaxed max-w-[280px]">
            Powered by Supabase Security
          </p>
        </footer>
      </main>
    </div>
  )
}
