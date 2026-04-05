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
  Award,
  Zap,
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
      toast({ title: "Copied!", description: "User ID copied." });
    }
  }

  const handleContactSupport = async () => {
    if (!firestore) return
    try {
      const q = query(collection(firestore, "userProfiles"), where("isSupport", "==", true), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast({ variant: "destructive", title: "Support Unavailable" })
      } else {
        router.push(`/chat/${snap.docs[0].id}`)
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error" })
    }
  }

  const userImage = (userProfile?.profilePhotoUrls && userProfile?.profilePhotoUrls[0]) || ""
  const darkMaroon = "bg-[#5A1010]";
  const isVerified = !!userProfile?.isVerified

  if (isLoading) return <div className="flex h-svh items-center justify-center bg-transparent"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>

  return (
    <div className="flex flex-col h-svh w-full bg-transparent text-gray-900 overflow-y-auto scroll-smooth">
      <header className="flex flex-col items-center pt-12 pb-8 px-6 shrink-0 relative">
        <div className="relative mb-6">
          <Avatar className="w-28 h-28 shadow-lg bg-gray-50">
            {userImage && <AvatarImage src={userImage} className="object-cover" />}
            <AvatarFallback className="bg-primary text-white font-black text-2xl">{userProfile?.username?.[0]}</AvatarFallback>
          </Avatar>
          <button onClick={() => router.push('/profile/edit')} className={cn("absolute bottom-1 right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform", darkMaroon)}>
            <Pencil className="w-3.5 h-3.5 text-white" />
          </button>
          {isVerified && (<div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-sm"><CheckCircle className="w-6 h-6 text-blue-500 fill-blue-500/10" /></div>)}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <h1 className="text-2xl font-black tracking-tight text-center">{userProfile?.username || ""}</h1>
          {isVerified && <CheckCircle className="w-5 h-5 text-blue-500 fill-blue-500/10" />}
        </div>

        {userProfile?.numericId && (
          <button onClick={copyId} className="flex items-center gap-2 px-5 py-2 bg-white/40 backdrop-blur-md border border-white/30 rounded-full active:bg-white/60 transition-colors">
            <span className="text-[10px] font-bold text-green-500 uppercase tracking-[0.2em]">ID: {userProfile.numericId}</span>
            <Copy className="w-3 h-3 text-green-500/50" />
          </button>
        )}
      </header>

      <main className="flex-1 px-6 space-y-6 pb-44">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-[2.5rem] p-6 flex flex-col items-center gap-2 shadow-sm text-center">
            <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center"><Coins className="w-3 h-3 text-primary" /></div><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Coins</span></div>
            <span className="text-2xl font-black text-gray-900 font-headline">{(userProfile?.coinBalance || 0).toLocaleString()}</span>
            <Button onClick={() => router.push('/recharge')} className={cn("w-full h-10 rounded-full text-white font-black uppercase tracking-widest text-[8px] shadow-lg", darkMaroon)}>Recharge</Button>
          </div>

          <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-[2.5rem] p-6 flex flex-col items-center gap-2 shadow-sm text-center">
            <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center"><Gem className="w-3 h-3 text-blue-500" /></div><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Diamonds</span></div>
            <span className="text-2xl font-black text-gray-900 font-headline">{(userProfile?.diamondBalance || 0).toLocaleString()}</span>
            <Button onClick={() => router.push('/profile/income')} className="w-full h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"><span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Income</span></Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={() => router.push('/games')} className="w-full h-16 rounded-[2rem] bg-purple-500/10 border border-purple-500/20 flex items-center px-6 gap-4 active:scale-[0.98] transition-all shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center"><Gamepad2 className="w-5 h-5 text-white" /></div>
            <div className="flex-1 text-left"><span className="text-purple-600 font-black uppercase tracking-[0.1em] text-[10px] block">Games Center</span><span className="text-purple-500/60 text-[11px] font-bold">Lucky Spin & Bets</span></div>
            <ChevronRight className="w-5 h-5 text-purple-500/40" />
          </button>

          {userProfile?.isAgent && (
            <button onClick={() => router.push('/profile/agent-center')} className="w-full h-16 rounded-[2rem] bg-purple-900/10 border border-purple-900/20 flex items-center px-6 gap-4 active:scale-[0.98] transition-all shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-900/20"><Building2 className="w-5 h-5 text-purple-900" /></div>
              <div className="flex-1 text-left"><span className="text-gray-900 font-black uppercase tracking-[0.1em] text-[10px] block">Agent Center</span><span className="text-gray-400 text-[11px] font-bold">Manage your agency</span></div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          )}

          {userProfile?.gender?.toLowerCase() === 'female' && !userProfile?.isAgent && (
            <button onClick={() => router.push('/profile/agency')} className="w-full h-16 rounded-[2rem] bg-white/40 backdrop-blur-md border border-white/30 flex items-center px-6 gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10"><Building2 className="w-5 h-5 text-amber-600" /></div>
              <div className="flex-1 text-left"><span className="text-gray-900 font-black uppercase tracking-[0.1em] text-[10px] block">Agency</span><span className="text-gray-400 text-[11px] font-bold">Join an agency anchor</span></div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          )}

          {userProfile?.isSupport && (
            <button onClick={() => router.push('/support/reports')} className="w-full h-16 rounded-[2rem] bg-zinc-900 border border-zinc-800 flex items-center px-6 gap-4 active:scale-[0.98] transition-all shadow-xl relative">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center"><ClipboardList className="w-5 h-5 text-blue-400" /></div>
              <div className="flex-1 text-left"><span className="text-white font-black uppercase tracking-[0.1em] text-[10px] block">Review Reports</span><span className="text-zinc-500 text-[11px] font-bold">Handle user complaints</span></div>
              {pendingReportsCount > 0 && <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />}
              <ChevronRight className="w-5 h-5 text-zinc-700" />
            </button>
          )}

          {userProfile?.isCoinseller && (
            <button onClick={() => router.push('/coinseller/award')} className="w-full h-16 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex items-center px-6 gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center"><Award className="w-5 h-5 text-white" /></div>
              <div className="flex-1 text-left"><span className="text-amber-600 font-black uppercase tracking-[0.1em] text-[10px] block">Award Coins</span><span className="text-amber-500/60 text-[11px] font-bold">Transfer to users</span></div>
              <ChevronRight className="w-5 h-5 text-amber-500/40" />
            </button>
          )}

          {userProfile?.isAdmin && (
            <>
               <button onClick={() => router.push('/admin/award')} className="w-full h-16 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center px-6 gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></div>
                <div className="flex-1 text-left"><span className="text-primary font-black uppercase tracking-[0.1em] text-[10px] block">Admin Coin Grant</span><span className="text-primary/60 text-[11px] font-bold">Unlimited granting</span></div>
                <ChevronRight className="w-5 h-5 text-primary/40" />
              </button>
              <button onClick={() => router.push('/admin/roles')} className="w-full h-16 rounded-[2rem] bg-zinc-900 border border-zinc-800 flex items-center px-6 gap-4 shadow-xl">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><ShieldAlert className="w-5 h-5 text-primary" /></div>
                <div className="flex-1 text-left"><span className="text-white font-black uppercase tracking-[0.1em] text-[10px] block">Admin Panel</span><span className="text-zinc-500 text-[11px] font-bold">Manage Roles</span></div>
                <ChevronRight className="w-5 h-5 text-zinc-700" />
              </button>
            </>
          )}

          <button onClick={() => router.push('/profile/verify')} className="w-full h-16 rounded-[2rem] bg-white/40 backdrop-blur-md border border-white/30 flex items-center justify-between px-6 shadow-sm">
            <div className="flex items-center gap-4"><div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-white/50", isVerified ? "text-blue-500" : "text-gray-400")}><ShieldCheck className="w-5 h-5" /></div><span className="text-gray-900 font-black uppercase tracking-[0.1em] text-[10px]">{isVerified ? "Identity Verified" : "Verify Identity"}</span></div>
            {isVerified ? <CheckCircle className="w-5 h-5 text-blue-500" /> : <ChevronRight className="w-5 h-5 text-gray-300" />}
          </button>

          <button onClick={handleContactSupport} className="w-full h-16 rounded-[2rem] bg-white/40 backdrop-blur-md border border-white/30 flex items-center px-6 gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10"><Headset className="w-5 h-5 text-primary" /></div>
            <span className="text-gray-900 font-black uppercase tracking-[0.1em] text-[10px] flex-1 text-left">Customer Support</span>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>

          <button onClick={() => router.push('/settings')} className="w-full h-16 rounded-[2rem] bg-white/40 backdrop-blur-md border border-white/30 flex items-center px-6 gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100"><SettingsIcon className="w-5 h-5 text-gray-500" /></div>
            <span className="text-gray-900 font-black uppercase tracking-[0.1em] text-[10px] flex-1 text-left">Settings</span>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </main>
    </div>
  )
}