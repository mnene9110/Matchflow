
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
      
      // Update the user profile to reflect they are no longer purely anonymous
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
    <div className="flex flex-col h-svh bg-white">
      <header className="px-4 py-4 flex items-center sticky top-0 bg-white z-10 border-b border-gray-50">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-gray-900 h-9 w-9">
          <ChevronLeft className="w-8 h-8" />
        </Button>
        <h1 className="text-lg font-bold font-headline ml-2">Secure Account</h1>
      </header>

      <main className="flex-1 p-6 space-y-8">
        <div className="space-y-2">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-black font-headline text-gray-900">Link your Email</h2>
          <p className="text-sm text-gray-500 font-medium">
            Set an email and password so you can access your profile from any device and never lose your progress.
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <Input 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 pl-12 rounded-2xl bg-slate-50 border-none text-sm font-medium focus-visible:ring-primary/20" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Create Password</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <Input 
                type="password" 
                placeholder="At least 6 characters" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 pl-12 rounded-2xl bg-slate-50 border-none text-sm font-medium focus-visible:ring-primary/20" 
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button 
            className="w-full h-14 rounded-full bg-primary text-white text-base font-bold shadow-xl shadow-primary/20 active:scale-95 transition-all"
            onClick={handleBind}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Secure My Account"}
          </Button>
          <p className="text-[10px] text-center text-gray-400 mt-4 font-bold uppercase tracking-tight">
            Your coins and profile will be saved
          </p>
        </div>
      </main>
    </div>
  )
}
