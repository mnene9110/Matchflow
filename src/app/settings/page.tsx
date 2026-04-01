
"use client"

import { ChevronLeft, ChevronRight, ShieldAlert } from "lucide-react"
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

  const isAnonymous = user?.isAnonymous

  const settingsItems = [
    { 
      label: "Bind account", 
      badge: isAnonymous ? "Guest Mode" : "Verified",
      onClick: () => isAnonymous ? router.push("/settings/bind") : toast({ title: "Already verified", description: "Your account is linked to an email." })
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
    <div className="flex flex-col h-svh bg-white">
      <header className="px-4 py-4 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-gray-900 h-9 w-9"
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
        <h1 className="text-lg font-bold font-headline flex-1 text-center mr-10">Settings</h1>
      </header>

      <main className="flex-1 px-4 pt-4 overflow-y-auto">
        <div className="space-y-1">
          {settingsItems.map((item, idx) => (
            <div key={idx}>
              <button
                onClick={item.onClick || (() => {})}
                className="w-full flex items-center justify-between py-4 px-2 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold text-gray-700">{item.label}</span>
                  {item.badge && (
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md mt-1 ${isAnonymous ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
              </button>
              {idx < settingsItems.length - 1 && <Separator className="bg-gray-50" />}
            </div>
          ))}

          <Separator className="bg-gray-50 my-2" />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center justify-between py-5 px-2 hover:bg-red-50 transition-colors group">
                <span className="text-sm font-bold text-red-500">Sign Out</span>
                <ChevronRight className="w-4 h-4 text-red-200" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl max-w-[90%] md:max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-headline font-black">Ready to leave?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-500 font-medium">
                  {isAnonymous 
                    ? "Warning: You are in Guest Mode. If you sign out without binding your account, you will lose access forever." 
                    : "Are you sure you want to sign out?"}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                <AlertDialogCancel className="rounded-full h-12 border-gray-100 font-bold">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleSignOut}
                  className="rounded-full h-12 bg-primary text-white font-bold"
                >
                  Sign Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>

      <footer className="pb-10 pt-6 flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
           <span className="text-primary font-logo text-xl">MF</span>
        </div>
        <div className="text-center space-y-3">
          <p className="text-[10px] font-bold text-gray-300">VERSION 3.1.0</p>
          <div className="flex items-center gap-3 text-[9px] font-black text-gray-400 uppercase tracking-tight">
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
