
"use client"

import { Navbar } from "@/components/Navbar"
import { 
  Settings as SettingsIcon, 
  ChevronRight, 
  Copy, 
  Coins, 
  ClipboardList, 
  ShieldCheck, 
  Headset, 
  Gamepad2,
  Loader2
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export default function ProfilePage() {
  const router = useRouter()
  const { user: currentUser, isUserLoading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  const userRef = useMemoFirebase(() => {
    if (!firestore || !currentUser) return null;
    return doc(firestore, "users", currentUser.uid);
  }, [firestore, currentUser])

  const coinAccountRef = useMemoFirebase(() => {
    if (!firestore || !currentUser) return null;
    return doc(firestore, "users", currentUser.uid, "coinAccount", "primary");
  }, [firestore, currentUser])

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef)
  const { data: coinAccount, isLoading: isCoinsLoading } = useDoc(coinAccountRef)

  const displayNumericId = userProfile?.numericId || currentUser?.uid.slice(-8).toUpperCase();

  const copyId = () => {
    if (displayNumericId) {
      navigator.clipboard.writeText(displayNumericId.toString());
      toast({
        title: "Copied!",
        description: "User ID copied to clipboard.",
      });
    }
  }

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center h-svh bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const actions = [
    { label: "Tasks", icon: ClipboardList, color: "text-primary", bg: "bg-primary/5" },
  ]

  const otherTools = [
    { label: "Certified", icon: ShieldCheck },
    { label: "Service", icon: Headset },
    { label: "Settings", icon: SettingsIcon, href: "/settings" },
  ]

  const userImage = (userProfile?.profilePhotoUrls && userProfile?.profilePhotoUrls[0]) || `https://picsum.photos/seed/${currentUser?.uid}/200/200`

  return (
    <div className="flex flex-col min-h-svh bg-transparent pb-24">
      <header className="relative pt-12 pb-10 px-6 overflow-hidden bg-primary rounded-b-[3rem] shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
        
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black font-headline text-white">{userProfile?.username || "Guest User"}</h1>
              <ChevronRight className="w-4 h-4 text-white/60" />
            </div>
            
            <div className="flex items-center gap-1.5 text-white/40">
              <span className="text-[10px] font-bold tracking-tight">ID:{displayNumericId}</span>
              <div 
                className="p-0.5 hover:bg-white/5 rounded transition-colors cursor-pointer"
                onClick={copyId}
              >
                <Copy className="w-3 h-3" />
              </div>
            </div>
          </div>

          <Avatar className="w-16 h-16 shadow-2xl border-2 border-white/20">
            <AvatarImage src={userImage} className="object-cover" />
            <AvatarFallback>{userProfile?.username?.[0] || '?'}</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <main className="px-4 mt-6 space-y-6">
        <div className="grid grid-cols-1">
          <div 
            className="bg-primary rounded-[2rem] p-5 flex items-center gap-3 shadow-lg hover:scale-[1.01] transition-transform cursor-pointer"
            onClick={() => router.push('/coins')}
          >
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-white leading-none">
                {isCoinsLoading ? "..." : (coinAccount?.balance || 0)}
              </span>
              <span className="text-[10px] text-white/60 font-black uppercase tracking-widest mt-1">Recharge</span>
            </div>
          </div>
        </div>

        <section className="bg-white/80 rounded-[2.5rem] p-6 flex justify-center border border-gray-50 shadow-sm">
          {actions.map((action) => (
            <div key={action.label} className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className={`w-12 h-12 ${action.bg} rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                <action.icon className={`w-6 h-6 ${action.color}`} />
              </div>
              <span className="text-[10px] font-black text-gray-500">{action.label}</span>
            </div>
          ))}
        </section>

        <section className="space-y-6 pb-4">
          <h2 className="font-headline font-black text-base px-1">Other Tools</h2>
          <div className="grid grid-cols-4 gap-y-8">
            {otherTools.map((tool) => (
              <div 
                key={tool.label} 
                className="flex flex-col items-center gap-2 group cursor-pointer"
                onClick={() => tool.href && router.push(tool.href)}
              >
                <div className="w-11 h-11 flex items-center justify-center rounded-full group-hover:bg-primary/5 transition-colors">
                  <tool.icon className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                </div>
                <span className="text-[10px] font-black text-gray-400 group-hover:text-primary text-center transition-colors">{tool.label}</span>
              </div>
            ))}
            <div className="flex flex-col items-center gap-2 relative group cursor-pointer">
               <div className="bg-primary rounded-2xl p-3 shadow-lg shadow-primary/10 group-hover:scale-105 transition-transform">
                  <Gamepad2 className="w-6 h-6 text-white" />
               </div>
               <span className="absolute -bottom-1 bg-accent text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm text-black">PLAY</span>
            </div>
          </div>
        </section>
      </main>

      <Navbar />
    </div>
  )
}
