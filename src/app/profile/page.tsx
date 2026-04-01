"use client"

import { Navbar } from "@/components/Navbar"
import { 
  ChevronRight, 
  Copy, 
  Coins, 
  Headset, 
  Loader2,
  Pencil,
  Wallet,
  ShieldCheck
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

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

  const displayNumericId = userProfile?.numericId || ".......";

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
      <div className="flex items-center justify-center h-svh bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  const userImage = (userProfile?.profilePhotoUrls && userProfile?.profilePhotoUrls[0]) || `https://picsum.photos/seed/${currentUser?.uid}/400/400`

  return (
    <div className="flex flex-col min-h-svh bg-background text-white pb-24">
      {/* Header Section - Slightly tighter spacing */}
      <header className="flex flex-col items-center pt-12 pb-8 px-6">
        <div className="relative mb-6">
          <Avatar className="w-28 h-28 border-none ring-offset-4 ring-offset-background ring-0">
            <AvatarImage src={userImage} className="object-cover" />
            <AvatarFallback className="bg-primary text-white font-black text-2xl">
              {userProfile?.username?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <button className="absolute bottom-1 right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-4 border-background shadow-lg active:scale-90 transition-transform">
            <Pencil className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        <h1 className="text-2xl font-black mb-3 tracking-tight">
          {userProfile?.username || "Guest User"}
        </h1>

        <button 
          onClick={copyId}
          className="flex items-center gap-2 px-5 py-2 bg-white/5 border border-white/10 rounded-full active:bg-white/10 transition-colors"
        >
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">ID: {displayNumericId}</span>
          <Copy className="w-3 h-3 text-white/20" />
        </button>
      </header>

      {/* Wallet Card - Compact padding */}
      <main className="px-6 space-y-3">
        <div className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                <Coins className="w-3 h-3 text-primary" />
              </div>
              <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em]">Wallet Balance</span>
            </div>
            <span className="text-2xl font-black">
              {isCoinsLoading ? "..." : (coinAccount?.balance || 0).toLocaleString()}
            </span>
          </div>
          
          <Button 
            onClick={() => router.push('/recharge')}
            className="w-full h-14 rounded-[1.75rem] bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.1em] text-xs"
          >
            Recharge
          </Button>
        </div>

        {/* Action Buttons - Slightly smaller heights */}
        <div className="flex flex-col gap-2.5 pt-2">
          <button className="w-full h-14 rounded-full bg-[#00FF00] flex items-center justify-center gap-3 active:scale-[0.98] transition-all group">
            <Wallet className="w-4 h-4 text-black" />
            <span className="text-black font-black uppercase tracking-[0.1em] text-[10px]">Income</span>
          </button>

          <button className="w-full h-14 rounded-full bg-transparent border border-[#1A3A1A] flex items-center justify-center gap-3 active:bg-[#1A3A1A]/20 transition-all">
            <Headset className="w-4 h-4 text-[#00FF00]" />
            <span className="text-[#00FF00] font-black uppercase tracking-[0.1em] text-[10px]">Customer Support</span>
          </button>

          <button className="w-full h-14 rounded-full bg-transparent border border-white/10 flex flex-col items-center justify-center active:bg-white/5 transition-all">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-white/60 font-black uppercase tracking-[0.1em] text-[10px]">Verify Identity</span>
            </div>
          </button>
          
          <button 
            onClick={() => router.push('/settings')}
            className="w-full h-14 rounded-full bg-transparent border border-white/10 flex items-center justify-center gap-3 active:bg-white/5 transition-all"
          >
            <span className="text-white/60 font-black uppercase tracking-[0.1em] text-[10px]">Settings</span>
          </button>
        </div>
      </main>

      <Navbar />
    </div>
  )
}
