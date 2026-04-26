
"use client"

import { useState } from "react"
import { Mail, Lock, ChevronLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useFirebase } from "@/firebase/provider"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPending, setIsPending] = useState(false)
  
  const router = useRouter()
  const { auth } = useFirebase()
  const { toast } = useToast()

  const handleSignIn = async () => {
    if (!email || !password) return
    setIsPending(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push("/discover")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message })
      setIsPending(false)
    }
  }

  const handleSignUp = async () => {
    if (!email || !password) return
    setIsPending(true)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      router.push("/onboarding/full")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sign Up Failed", description: error.message })
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col h-svh bg-white relative overflow-hidden text-gray-900">
      <header className="absolute top-12 left-2 z-10">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-gray-400"><ChevronLeft className="w-8 h-8" /></Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 w-full max-w-sm mx-auto space-y-10">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-logo text-primary">MatchFlow</h1>
          <p className="text-gray-400 text-lg font-medium">Sign in to your account</p>
        </div>

        <div className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-primary ml-1 uppercase tracking-widest">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <Input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-16 pl-12 rounded-2xl bg-gray-50 border-gray-100" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-primary ml-1 uppercase tracking-widest">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <Input type="password" placeholder="........" value={password} onChange={(e) => setPassword(e.target.value)} className="h-16 pl-12 rounded-2xl bg-gray-50 border-gray-100" />
            </div>
          </div>
        </div>

        <div className="w-full space-y-4 pt-4">
          <Button className="w-full h-16 rounded-full bg-primary text-white text-xl font-bold shadow-xl shadow-primary/20 transition-all active:scale-95" onClick={handleSignIn} disabled={isPending}>
            {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Sign In"}
          </Button>
          <Button variant="ghost" className="w-full h-16 rounded-full bg-gray-50 text-gray-900 text-xl font-bold" onClick={handleSignUp} disabled={isPending}>
            Create Account
          </Button>
        </div>
      </main>
    </div>
  )
}
