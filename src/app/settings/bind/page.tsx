"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Mail, Lock, ShieldCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth, useFirestore, useUser, linkAccountToEmail, updateDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export default function BindAccountPage() {
  const router = useRouter()
  const auth = useAuth()
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleBind = async () => {
    if (!email || !password) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill in all fields." })
      return
    }

    if (password.length < 6) {
      toast({ variant: "destructive", title: "Weak password", description: "Password must be at least 6 characters." })
      return
    }

    setIsPending(true)
    try {
      await linkAccountToEmail(auth, email, password)
      
      if (user) {
        const userRef = doc(firestore, "userProfiles", user.uid)
        updateDocumentNonBlocking(userRef, {
          email,
          authProviderId: "password",
          updatedAt: new Date().toISOString()
        })
      }

      toast({
        title: "Success!",
        description: "Account secured. You can now login with this email.",
      })
      router.push("/settings")
    } catch (error: any) {
      setIsPending(false)
      toast({
        variant: "destructive",
        title: "Linking Failed",
        description: error.message || "Could not bind account. The email might already be in use.",
      })
    }
  }

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-[#3BC1A8] z-10 shadow-lg text-white">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Secure Account</h1>
      </header>

      <main className="flex-1 p-8 space-y-10 pt-12">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-2 border border-primary/20">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black font-headline text-gray-900 leading-tight">Link your Email</h2>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              Set an email and password so you can access your profile from any device and never lose your coins.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <Input 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-16 pl-14 rounded-2xl bg-gray-50 border-gray-100 text-gray-900 placeholder:text-gray-300 text-sm font-medium focus-visible:ring-primary/50" 
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Create Password</Label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <Input 
                type="password" 
                placeholder="Min. 6 characters" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-16 pl-14 rounded-2xl bg-gray-50 border-gray-100 text-gray-900 placeholder:text-gray-300 text-sm font-medium focus-visible:ring-primary/50" 
              />
            </div>
          </div>
        </div>

        <div className="pt-8">
          <Button 
            className="w-full h-16 rounded-full bg-primary text-white text-lg font-black shadow-2xl shadow-primary/20 active:scale-95 transition-all"
            onClick={handleBind}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Secure My Account"}
          </Button>
          <p className="text-[10px] text-center text-gray-400 mt-6 font-black uppercase tracking-[0.1em]">
            Your data and coins will be safely linked
          </p>
        </div>
      </main>
    </div>
  )
}
