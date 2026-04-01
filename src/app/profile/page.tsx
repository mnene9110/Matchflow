"use client"

import { Navbar } from "@/components/Navbar"
import { 
  ChevronRight, 
  Copy, 
  Coins, 
  ClipboardList, 
  ShieldCheck, 
  Headset, 
  Loader2,
  Settings as SettingsIcon
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
    return doc(firestore, "userProfiles", currentUser.uid);
  }, [firestore, currentUser])

  const coinAccountRef = useMemoFirebase(() => {
    if (!firestore || !currentUser) return null;
    return doc(firestore, "coinAccounts", currentUser.uid);
  }, [firestore, currentUser])

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef)
  const { data: coinAccount, isLoading: isCoinsLoading } = useDoc(coinAccountRef)

  const displayNumericId = userProfile?.numericId || currentUser?.uid.slice(-8).toUpperCase();

  const copyId = () => {
    if (displayNumericId) {
      navigator.clipboard.writeText(displayNumericId.toString());
      toast({
        title: "Copied!",
        description: "User ID copied.",
      });
    }
  }

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center h-svh bg-white">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    )
  }

  const userImage = (userProfile?.profilePhotoUrls && userProfile?.profilePhotoUrls[0]) || `https://picsum.photos/seed/${currentUser?.uid}/200/200`

  const otherTools = [
    { label: "Certified", icon: ShieldCheck },
    { label: "Service", icon: Headset },
    { label: "Settings", icon: SettingsIcon, href: "/settings" },
  ]

  return (
    <div className="flex flex-col min-h-svh bg-transparent pb-20">
      <header className="relative pt-10 pb-8 px-6 overflow-hidden bg-primary rounded-b-[2.5rem] shadow-lg">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black font-headline text-white">{userProfile?.username || "Guest"}</h1>
              <ChevronRight className="w-3.5 h-3.5 text-white/50" />
            </div>
            
            <div className="flex items-center gap-1 text-white/30">
              <span className="text-[9px] font-bold">ID:{displayNumericId}</span>
              <div 
                className="p-0.5 hover:bg-white/5 rounded cursor-pointer"
                onClick={copyId}
              >
                <Copy className="w-2.5 h-2.5" />
              </div>
            </div>
          </div>

          <Avatar className="w-14 h-14 shadow-xl border-2 border-white/20">
            <AvatarImage src={userImage} className="object-cover" />
            <AvatarFallback>{userProfile?.username?.[0] || '?'}</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <main className="px-4 mt-5 space-y-5">
        <div 
          className="bg-primary rounded-3xl p-4 flex items-center gap-3 shadow-md active:scale-[0.98] transition-all cursor-pointer"
          onClick={() => router.push('/recharge')}
        >
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-white leading-none">
              {isCoinsLoading ? "..." : (coinAccount?.balance || 0).toLocaleString()}
            </span>
            <span className="text-[9px] text-white/50 font-black uppercase tracking-widest">Recharge</span>
          </div>
        </div>

        <section className="bg-white/80 rounded-3xl p-4 flex justify-center border border-gray-50 shadow-sm">
          <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
            <div className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center shadow-sm">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[9px] font-black text-gray-500">Tasks</span>
          </div>
        </section>

        <section className="space-y-4 pb-2">
          <h2 className="font-headline font-black text-sm px-1 text-gray-900">Other Tools</h2>
          <div className="grid grid-cols-4 gap-y-6">
            {otherTools.map((tool) => (
              <div 
                key={tool.label} 
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
                onClick={() => tool.href && router.push(tool.href)}
              >
                <div className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary/5">
                  <tool.icon className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                </div>
                <span className="text-[9px] font-black text-gray-400 text-center">{tool.label}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Navbar />
    </div>
  )
}
