
"use client"

import { ChevronLeft, ChevronRight, ShieldCheck, CreditCard, MessageSquare, Ban, Info, BellOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth, useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { doc } from "firebase/firestore"
import { clearDiscoverCache } from "@/app/discover/page"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function SettingsPage() {
  const router = useRouter()
  const auth = useAuth()
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  const userRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "userProfiles", user.uid);
  }, [firestore, user])

  const { data: userProfile } = useDoc(userRef)

  const handleSignOut = async () => {
    try {
      clearDiscoverCache();
      await signOut(auth)
      router.push("/welcome")
    } catch (error) {
      toast({ variant: "destructive", title: "Sign out failed", description: "Please try again." })
    }
  }

  const isGuest = user?.email?.includes('@matchflow.app') || user?.isAnonymous
  const isAdmin = userProfile?.isAdmin === true

  const settingsItems = [
    { label: "Bind account", icon: ShieldCheck, badge: isGuest ? "Guest Mode" : "Verified", onClick: () => isGuest ? router.push("/settings/bind") : toast({ title: "Already verified", description: "Your account is linked." }) },
    { label: "Charge settings", icon: CreditCard, onClick: () => router.push("/settings/charges") },
    { label: "Blocked List", icon: Ban, onClick: () => router.push("/settings/blocked") },
    { label: "About MatchFlow", icon: Info, onClick: () => router.push("/settings/about") },
  ]

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900 overflow-y-auto">
      <header className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 flex items-center justify-between sticky top-0 bg-[#3BC1A8] z-50 shadow-lg text-white">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-9 w-9 bg-white/20 backdrop-blur-md rounded-full shadow-sm hover:bg-white/30"><ChevronLeft className="w-5 h-5" /></Button>
        <h1 className="text-lg font-black font-headline tracking-widest uppercase">Settings</h1>
        <div className="w-9" />
      </header>

      <main className="px-6 pt-6 pb-6 space-y-3">
        {settingsItems.map((item, idx) => (
          <button key={idx} onClick={item.onClick || (() => {})} className="w-full flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-[1.5rem] transition-all hover:bg-gray-100 active:scale-[0.98] group shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/5"><item.icon className="w-4 h-4 text-primary" /></div>
              <div className="flex flex-col items-start"><span className="text-[12px] font-bold text-gray-900">{item.label}</span>{item.badge && <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full mt-0.5 ${isGuest ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>{item.badge}</span>}</div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary transition-colors" />
          </button>
        ))}

        <div className="pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center justify-center gap-2 py-4 px-3 bg-red-50/50 border border-red-100/50 rounded-[1.5rem] transition-all active:scale-[0.98] group">
                <span className="text-[11px] font-black uppercase tracking-widest text-red-500">Sign Out</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2.5rem] max-w-[85%] md:max-w-sm bg-white border-none shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-headline font-black text-xl text-gray-900 text-center">Sign Out?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400 font-medium text-xs leading-relaxed text-center">
                  {isGuest ? "You are currently in Guest Mode. We recommend binding an email to never lose your coins." : "Are you sure you want to sign out?"}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex flex-col gap-2 mt-6">
                <AlertDialogAction onClick={handleSignOut} className="rounded-full h-12 bg-red-500 hover:bg-red-600 text-white font-black text-sm w-full">Sign Out</AlertDialogAction>
                <AlertDialogCancel className="rounded-full h-12 border-none bg-gray-50 font-black text-sm text-gray-400 hover:bg-gray-100 w-full">Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>

      <footer className="pb-32 flex flex-col items-center gap-4">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20"><span className="text-primary font-logo text-lg">MF</span></div>
        <div className="text-center space-y-1.5">
          <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em]">VERSION 3.1.0</p>
          <div className="flex items-center gap-4 text-[8px] font-black text-gray-400 uppercase tracking-tighter">
            <span onClick={() => router.push('/settings/privacy')} className="cursor-pointer hover:text-primary transition-colors">Privacy</span>
            <span className="w-px h-2 bg-gray-100" />
            <span onClick={() => router.push('/settings/terms')} className="cursor-pointer hover:text-primary transition-colors">Terms</span>
            {!isAdmin && <><span className="w-px h-2 bg-gray-100" /><span onClick={() => router.push('/settings/delete-account')} className="cursor-pointer hover:text-red-500 transition-colors">Delete Account</span></>}
          </div>
        </div>
      </footer>
    </div>
  )
}
