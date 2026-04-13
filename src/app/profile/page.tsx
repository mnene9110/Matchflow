
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
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

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
    getDocs(q).then(snap => setPendingReportsCount(snap.size))
      .catch(async (error) => {
        if (error.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'reports',
            operation: 'list'
          }));
        }
      });
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
      {/* Refined More Compact Header */}
      <header className="flex flex-col items-center pt-12 pb-8 px-6 shrink-0 relative bg-gradient-to-b from-[#FF3737] via-[#FF5E5E] to-white/10">
        <div className="relative mb-4">
          <Avatar className="w-28 h-28 shadow-[0_20px_50px_rgba(255,55,55,0.3)] bg-gray-100">
            {userImage && <AvatarImage src={userImage} className="object-cover" />}
            <AvatarFallback className="bg-primary text-white font-black text-2xl uppercase">{userProfile?.username?.[0]}</AvatarFallback>
          </Avatar>
          <button 
            onClick={() => router.push('/profile/edit')} 
            className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-zinc-900 border-2 border-white flex items-center justify-center shadow-xl active:scale-90 transition-transform"
          >
            <Pencil className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        <div className="text-center space-y-1 mb-4">
          <h1 className="text-2xl font-black text-white drop-shadow-sm flex items-center justify-center gap-2">
            {userProfile?.username || "Guest"}
            {isVerified && <CheckCircle className="w-4 h-4 text-white fill-white/20" />}
          </h1>
          <p className="text-white/60 text-[9px] font-black uppercase tracking-[0.2em]">Official Profile</p>
        </div>

        {userProfile?.numericId && (
          <button 
            onClick={copyId} 
            className="flex items-center gap-2 px-5 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full active:bg-white/30 transition-all shadow-sm"
          >
            <span className="text-[10px] font-black text-white uppercase tracking-widest">ID: {userProfile.numericId}</span>
            <Copy className="w-3 h-3 text-white/40" />
          </button>
        )}
      </header>

      <main className="flex-1 px-6 space-y-8 pb-44 -mt-4">
        {/* Wallet Cards - Reduced Padding and Height */}
        <div className="grid grid-cols-2 gap-4">
          {/* Balance Card */}
          <div className="bg-white rounded-[2rem] p-4 flex flex-col items-center gap-3 shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-gray-50 text-center transition-transform active:scale-[0.98]">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Coins className="w-5 h-5 text-[#FF3737] opacity-60" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest block">Balance</span>
              <span className="text-2xl font-black text-gray-900 font-headline">{(userProfile?.coinBalance || 0).toLocaleString()}</span>
            </div>
            <Button 
              onClick={() => router.push('/recharge')}
              className="w-full h-10 rounded-full bg-[#FF3737] hover:bg-[#E63232] text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95"
            >
              Recharge
            </Button>
          </div>

          {/* Earnings Card */}
          <div className="bg-[#1A1A1A] rounded-[2rem] p-4 flex flex-col items-center gap-3 shadow-[0_15px_45px_rgba(0,0,0,0.2)] text-center transition-transform active:scale-[0.98]">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <Gem className="w-5 h-5 text-[#FF3737]" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Earnings</span>
              <span className="text-2xl font-black text-white font-headline">{(userProfile?.diamondBalance || 0).toLocaleString()}</span>
            </div>
            <Button 
              onClick={() => router.push('/profile/income')}
              className="w-full h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 font-black text-[9px] uppercase tracking-widest active:scale-95"
            >
              Income
            </Button>
          </div>
        </div>

        {/* Menu Sections */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Entertainment</h2>
            <div className="h-px flex-1 bg-gray-50 ml-4" />
          </div>
          
          <div className="space-y-2.5">
            <button 
              onClick={() => router.push('/games')} 
              className="w-full h-16 rounded-[1.5rem] bg-white border border-gray-50 flex items-center px-5 gap-4 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.02)] group"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF5722] to-[#FF8A65] flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-gray-900 font-black uppercase tracking-tight text-[13px] block leading-none">Games Center</span>
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter mt-1 block">Play & win coins</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-200" />
            </button>

            {/* Conditional Menus */}
            {userProfile?.isAgent && (
              <button 
                onClick={() => router.push('/profile/agent-center')} 
                className="w-full h-16 rounded-[1.5rem] bg-white border border-gray-50 flex items-center px-5 gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/20"><Building2 className="w-5 h-5 text-white" /></div>
                <div className="flex-1 text-left"><span className="text-gray-900 font-black uppercase tracking-tight text-[13px] block leading-none">Agent Center</span><span className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter mt-1 block">Manage Agency</span></div>
                <ChevronRight className="w-4 h-4 text-gray-200" />
              </button>
            )}

            {userProfile?.isSupport && (
              <button 
                onClick={() => router.push('/support/reports')} 
                className="w-full h-16 rounded-[1.5rem] bg-white border border-gray-100 flex items-center px-5 gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-all relative"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/20"><ClipboardList className="w-5 h-5 text-white" /></div>
                <div className="flex-1 text-left"><span className="text-gray-900 font-black uppercase tracking-tight text-[13px] block leading-none">Review Reports</span><span className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter mt-1 block">Handle Complaints</span></div>
                {pendingReportsCount > 0 && (
                  <div className="absolute top-5 right-10 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
                <ChevronRight className="w-4 h-4 text-gray-200" />
              </button>
            )}

            <div className="flex items-center justify-between px-2 pt-4">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Preferences</h2>
              <div className="h-px flex-1 bg-gray-50 ml-4" />
            </div>

            <button 
              onClick={() => router.push('/settings')} 
              className="w-full h-16 rounded-[1.5rem] bg-white border border-gray-50 flex items-center px-5 gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100"><SettingsIcon className="w-5 h-5 text-gray-400" /></div>
              <div className="flex-1 text-left"><span className="text-gray-900 font-black uppercase tracking-tight text-[13px] block leading-none">Settings</span><span className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter mt-1 block">Privacy & Account</span></div>
              <ChevronRight className="w-4 h-4 text-gray-200" />
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
