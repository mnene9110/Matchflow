
"use client"

import { 
  ChevronRight, 
  Copy, 
  Coins, 
  Headset, 
  Pencil,
  ShieldCheck,
  Settings as SettingsIcon,
  Loader2,
  CheckCircle,
  Gem,
  Gamepad2,
  ShieldAlert,
  ClipboardList,
  Building2
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useUser, useFirebase, useDoc, useMemoFirebase } from "@/firebase"
import { doc, collection, query, where, getDocs, limit } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

export default function ProfilePage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore } = useFirebase()
  const { toast } = useToast()
  
  const userRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: userProfile, isLoading } = useDoc(userRef)
  
  const [pendingReportsCount, setPendingReportsCount] = useState(0)

  useEffect(() => {
    if (!firestore || !userProfile?.isSupport) return
    const q = query(collection(firestore, "reports"), where("status", "==", "pending"), limit(1));
    getDocs(q).then(snap => setPendingReportsCount(snap.size));
  }, [firestore, userProfile?.isSupport])

  const copyId = () => {
    if (userProfile?.numericId) {
      navigator.clipboard.writeText(userProfile.numericId.toString());
      toast({ title: "ID Copied", description: "User ID copied." });
    }
  }

  const userImage = (userProfile?.profilePhotoUrls && userProfile?.profilePhotoUrls[0]) || ""
  const isVerified = !!userProfile?.isVerified

  if (isLoading) return <div className="flex h-svh items-center justify-center bg-[#FF3737]"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>

  return (
    <div className="flex flex-col h-svh w-full bg-white text-gray-900 overflow-y-auto scroll-smooth">
      {/* Brand Red Header with Gradient */}
      <header className="flex flex-col items-center pt-16 pb-10 px-6 shrink-0 relative bg-gradient-to-b from-[#FF3737] via-[#FFBDBD] to-white">
        <div className="relative mb-6">
          <Avatar className="w-32 h-32 shadow-2xl border-4 border-white ring-4 ring-white/20">
            {userImage && <AvatarImage src={userImage} className="object-cover" />}
            <AvatarFallback className="bg-primary text-white font-black text-2xl">{userProfile?.username?.[0]}</AvatarFallback>
          </Avatar>
          <button 
            onClick={() => router.push('/profile/edit')} 
            className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-zinc-900 border-2 border-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          >
            <Pencil className="w-4 h-4 text-white" />
          </button>
        </div>

        <h1 className="text-4xl font-black text-white text-center drop-shadow-sm mb-4">
          {userProfile?.username || "Guest"}
        </h1>

        {userProfile?.numericId && (
          <button 
            onClick={copyId} 
            className="flex items-center gap-2 px-6 py-2.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-full active:bg-white/40 transition-all"
          >
            <span className="text-[11px] font-black text-primary uppercase tracking-widest">ID: {userProfile.numericId}</span>
            <Copy className="w-3.5 h-3.5 text-primary/60" />
          </button>
        )}
      </header>

      <main className="flex-1 px-6 space-y-10 pb-44 -mt-4">
        {/* Wallet Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Balance Card */}
          <div className="bg-white rounded-[2.5rem] p-6 flex flex-col items-center gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-gray-50 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <Coins className="w-6 h-6 text-[#FF3737] opacity-40" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest block">Balance</span>
              <span className="text-3xl font-black text-gray-900">{(userProfile?.coinBalance || 0).toLocaleString()}</span>
            </div>
            <Button 
              onClick={() => router.push('/recharge')}
              className="w-full h-12 rounded-full bg-[#FF3737] hover:bg-[#E63232] text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20"
            >
              Recharge
            </Button>
          </div>

          {/* Earnings Card */}
          <div className="bg-[#1A1A1A] rounded-[2.5rem] p-6 flex flex-col items-center gap-4 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Gem className="w-6 h-6 text-[#FF3737]" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Earnings</span>
              <span className="text-3xl font-black text-white">{(userProfile?.diamondBalance || 0).toLocaleString()}</span>
            </div>
            <Button 
              onClick={() => router.push('/profile/income')}
              className="w-full h-12 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 font-black text-[10px] uppercase tracking-widest"
            >
              Income
            </Button>
          </div>
        </div>

        {/* Menu Sections */}
        <section className="space-y-6">
          <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2">Entertainment</h2>
          
          <div className="space-y-3">
            <button 
              onClick={() => router.push('/games')} 
              className="w-full h-20 rounded-[2rem] bg-white border border-gray-100 flex items-center px-6 gap-5 active:scale-[0.98] transition-all shadow-sm group"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#FF5722] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Gamepad2 className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-gray-900 font-black uppercase tracking-tight text-sm block">Games Center</span>
                <span className="text-gray-400 text-[11px] font-bold uppercase tracking-tighter">Play & win coins</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-200" />
            </button>

            {/* Conditional Menus */}
            {userProfile?.isAgent && (
              <button onClick={() => router.push('/profile/agent-center')} className="w-full h-20 rounded-[2rem] bg-white border border-gray-100 flex items-center px-6 gap-5 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-purple-600 flex items-center justify-center shadow-lg"><Building2 className="w-7 h-7 text-white" /></div>
                <div className="flex-1 text-left"><span className="text-gray-900 font-black uppercase tracking-tight text-sm block">Agent Center</span><span className="text-gray-400 text-[11px] font-bold uppercase tracking-tighter">Manage Agency</span></div>
                <ChevronRight className="w-5 h-5 text-gray-200" />
              </button>
            )}

            {userProfile?.isSupport && (
              <button onClick={() => router.push('/support/reports')} className="w-full h-20 rounded-[2rem] bg-white border border-gray-100 flex items-center px-6 gap-5 shadow-sm relative">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg"><ClipboardList className="w-7 h-7 text-white" /></div>
                <div className="flex-1 text-left"><span className="text-gray-900 font-black uppercase tracking-tight text-sm block">Review Reports</span><span className="text-gray-400 text-[11px] font-bold uppercase tracking-tighter">Handle Complaints</span></div>
                {pendingReportsCount > 0 && <div className="absolute top-6 right-6 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />}
                <ChevronRight className="w-5 h-5 text-gray-200" />
              </button>
            )}

            <button onClick={() => router.push('/settings')} className="w-full h-20 rounded-[2rem] bg-white border border-gray-100 flex items-center px-6 gap-5 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center shadow-sm"><SettingsIcon className="w-7 h-7 text-gray-400" /></div>
              <div className="flex-1 text-left"><span className="text-gray-900 font-black uppercase tracking-tight text-sm block">Settings</span><span className="text-gray-400 text-[11px] font-bold uppercase tracking-tighter">Privacy & Account</span></div>
              <ChevronRight className="w-5 h-5 text-gray-200" />
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
