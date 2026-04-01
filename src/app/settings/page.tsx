"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useAuth, useUser } from "@/firebase"
import { signOut } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
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
  const { toast } = useToast()

  const handleSignOut = async () => {
    try {
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

  const settingsItems = [
    { 
      label: "Bind account", 
      badge: isGuest ? "Guest Mode" : "Verified",
      onClick: () => isGuest ? router.push("/settings/bind") : toast({ title: "Already verified", description: "Your account is linked to an email." })
    },
    { label: "Charge settings" },
    { label: "Rights Center" },
    { label: "Chat settings" },
    { label: "Blocked List" },
    { label: "Language" },
    { label: "Clear Cache" },
    { label: "About MatchFlow" },
  ]

  return (
    <div className="flex flex-col h-svh bg-transparent text-gray-900">
      <header className="px-4 py-3 flex items-center justify-between sticky top-0 bg-transparent z-10 border-b border-gray-100">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-gray-900 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-base font-black font-headline flex-1 text-center mr-8 uppercase tracking-[0.2em]">Settings</h1>
      </header>

      <main className="flex-1 px-4 pt-4 overflow-y-auto">
        <div className="space-y-1">
          {settingsItems.map((item, idx) => (
            <div key={idx}>
              <button
                onClick={item.onClick || (() => {})}
                className="w-full flex items-center justify-between py-5 px-3 hover:bg-gray-50/50 rounded-2xl transition-all group"
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold text-gray-700">{item.label}</span>
                  {item.badge && (
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full mt-1.5 ${isGuest ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-primary transition-colors" />
              </button>
              {idx < settingsItems.length - 1 && <Separator className="bg-gray-50" />}
            </div>
          ))}

          <Separator className="bg-gray-50 my-4" />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center justify-between py-5 px-3 hover:bg-red-50 rounded-2xl transition-all group">
                <span className="text-sm font-bold text-red-500">Sign Out</span>
                <ChevronRight className="w-4 h-4 text-red-200 group-hover:text-red-500" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2.5rem] max-w-[85%] md:max-w-sm bg-white border-none shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-headline font-black text-xl text-gray-900">Sign Out?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400 font-medium text-xs leading-relaxed">
                  {isGuest 
                    ? "You are currently in Guest Mode. Since this device is remembered, you can return later, but we recommend binding an email to never lose access." 
                    : "Are you sure you want to sign out of your account?"}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-6">
                <AlertDialogCancel className="rounded-full h-12 border-gray-100 bg-gray-50 font-bold text-xs text-gray-500 hover:bg-gray-100">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleSignOut}
                  className="rounded-full h-12 bg-red-500 hover:bg-red-600 text-white font-bold text-xs"
                >
                  Sign Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>

      <footer className="pb-12 pt-6 flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
           <span className="text-primary font-logo text-xl">MF</span>
        </div>
        <div className="text-center space-y-2">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">VERSION 3.1.0</p>
          <div className="flex items-center gap-4 text-[9px] font-black text-gray-400 uppercase tracking-tighter">
            <span>Privacy</span>
            <span className="w-px h-2 bg-gray-100" />
            <span>Terms</span>
            <span className="w-px h-2 bg-gray-100" />
            <span>Delete</span>
          </div>
        </div>
      </footer>
    </div>
  )
}