
"use client"

import { ChevronLeft, ChevronRight, ShieldCheck, CreditCard, Award, MessageSquare, Ban, Languages, Trash2, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth, useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { doc } from "firebase/firestore"
import { clearDiscoverCache } from "@/app/discover/page"
import { clearChatCache } from "@/app/chat/page"
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
      // Clear economical caches
      clearDiscoverCache();
      clearChatCache();
      
      await signOut(auth)
      router.push("/welcome")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description: "An error occurred while signing out. Please try again.",
      })
    }
  }

  const isGuest = user?.email?.includes('@matchflow.app') || user?.isAnonymous
  const isAdmin = userProfile?.isAdmin === true

  const settingsItems = [
    { 
      label: "Bind account", 
      icon: ShieldCheck,
      badge: isGuest ? "Guest Mode" : "Verified",
      onClick: () => isGuest ? router.push("/settings/bind") : toast({ title: "Already verified", description: "Your account is linked to an email." })
    },
    { label: "Charge settings", icon: CreditCard, onClick: () => router.push("/settings/charges") },
    { label: "Chat settings", icon: MessageSquare },
    { label: "Blocked List", icon: Ban, onClick: () => router.push("/settings/blocked") },
    { label: "About MatchFlow", icon: Info, onClick: () => router.push("/settings/about") },
  ]

  return (
    <div className="flex flex-col h-svh bg-transparent text-gray-900 overflow-y-auto">
      <header className="px-4 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-transparent z-50 backdrop-blur-md">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-gray-900 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-black font-headline tracking-widest uppercase">Settings</h1>
        <div className="w-10" />
      </header>

      <main className="px-6 pt-2 pb-6 space-y-3">
        {settingsItems.map((item, idx) => (
          <button
            key={idx}
            onClick={item.onClick || (() => {})}
            className="w-full flex items-center justify-between p-5 bg-white/40 backdrop-blur-md border border-white/40 rounded-[1.75rem] transition-all hover:bg-white/60 active:scale-[0.98] group shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/5">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[13px] font-bold text-gray-900">{item.label}</span>
                {item.badge && (
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full mt-1 ${isGuest ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                    {item.badge}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
          </button>
        ))}

        <div className="pt-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center justify-center gap-2 py-5 px-3 bg-red-50/50 border border-red-100/50 rounded-[1.75rem] transition-all active:scale-[0.98] group">
                <span className="text-xs font-black uppercase tracking-widest text-red-500">Sign Out</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2.5rem] max-w-[85%] md:max-w-sm bg-white border-none shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-headline font-black text-xl text-gray-900 text-center">Sign Out?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400 font-medium text-xs leading-relaxed text-center">
                  {isGuest 
                    ? "You are currently in Guest Mode. We recommend binding an email to never lose your coins and profile access." 
                    : "Are you sure you want to sign out of your account?"}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex flex-col gap-2 mt-6">
                <AlertDialogAction 
                  onClick={handleSignOut}
                  className="rounded-full h-14 bg-red-500 hover:bg-red-600 text-white font-black text-sm w-full"
                >
                  Sign Out
                </AlertDialogAction>
                <AlertDialogCancel className="rounded-full h-14 border-none bg-gray-50 font-black text-sm text-gray-400 hover:bg-gray-100 w-full">Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>

      <footer className="pb-32 flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
           <span className="text-primary font-logo text-xl">MF</span>
        </div>
        <div className="text-center space-y-2">
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em]">VERSION 3.1.0</p>
          <div className="flex items-center gap-4 text-[9px] font-black text-gray-400 uppercase tracking-tighter">
            <span onClick={() => router.push('/settings/privacy')} className="cursor-pointer hover:text-primary transition-colors">Privacy</span>
            <span className="w-px h-2 bg-gray-100" />
            <span onClick={() => router.push('/settings/terms')} className="cursor-pointer hover:text-primary transition-colors">Terms</span>
            {!isAdmin && (
              <>
                <span className="w-px h-2 bg-gray-100" />
                <span 
                  onClick={() => router.push('/settings/delete-account')}
                  className="cursor-pointer hover:text-red-500 transition-colors"
                >
                  Delete Account
                </span>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
