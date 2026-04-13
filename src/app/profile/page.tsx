
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
  ClipboardList,
  Building2,
  Shield,
  Users as UsersIcon,
  Award,
  Zap,
  UserCog
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
  const isFemale = userProfile?.gender?.toLowerCase() === 'female'

  const hasManagementRole = userProfile?.isAdmin || userProfile?.isSupport || userProfile?.isCoinseller || (userProfile?.isAgent && isFemale);

  if (isLoading) return <div className="flex h-svh items-center justify-center bg-[#3BC1A8]"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>

  return (
    <div className="flex flex-col h-svh w-full bg-white text-gray-900 overflow-y-auto scroll-smooth">
      <header className="flex flex-col items-center pt-8 pb-16 px-6 shrink-0 relative bg-[#3BC1A8]">
        <div className="relative mb-4">
          <Avatar className="w-28 h-28 shadow-2xl bg-white/10 border-none">
            {userImage && <AvatarImage src={userImage} className="object-cover" />}
            <AvatarFallback className="bg-white/20 text-white font-black text-2xl uppercase border-none">{userProfile?.username?.[0]}</AvatarFallback>
          </Avatar>
          <button 
            onClick={() => router.push('/profile/edit')} 
            className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center shadow-xl active:scale-90 transition-transform border-none outline-none ring-0"
          >
            <Pencil className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        <div className="text-center space-y-1 mb-4">
          <h1 className="text-2xl font-black text-white drop-shadow-sm flex items-center justify-center gap-2">
            {userProfile?.username || "Guest"}
            {isVerified && <CheckCircle className="w-4 h-4 text-white fill-white/20" />}
          </h1>
          <p className="text-white/60 text-[9px] font-black capitalize tracking-[0.2em]">Official Profile</p>
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

      <main className="flex-1 px-6 space-y-8 pb-44 -mt-10 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-[2.25rem] p-5 flex flex-col items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-gray-50 text-center transition-transform active:scale-[0.98]">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest block">Balance</span>
              <span className="text-2xl font-black text-gray-900 font-headline">{(userProfile?.coinBalance || 0).toLocaleString()}</span>
            </div>
            <Button 
              onClick={() => router.push('/recharge')}
              className="w-full h-10 rounded-full bg-[#3BC1A8] hover:bg-[#32B098] text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-[#3BC1A8]/20 active:scale-95"
            >
              Recharge
            </Button>
          </div>

          <div className="bg-white rounded-[2.25rem] p-5 flex flex-col items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-gray-50 text-center transition-transform active:scale-[0.98]">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Gem className="w-5 h-5 text-blue-500" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest block">Earnings</span>
              <span className="text-2xl font-black text-gray-900 font-headline">{(userProfile?.diamondBalance || 0).toLocaleString()}</span>
            </div>
            <Button 
              onClick={() => router.push('/profile/income')}
              className="w-full h-10 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-black text-[9px] uppercase tracking-widest active:scale-95"
            >
              Income
            </Button>
          </div>
        </div>

        {hasManagementRole && (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-[10px] font-black text-primary capitalize tracking-[0.3em]">Management Tools</h2>
              <div className="h-px flex-1 bg-primary/10 ml-4" />
            </div>
            
            <div className="grid grid-cols-1 gap-2.5">
              {userProfile?.isAdmin && (
                <button 
                  onClick={() => router.push('/admin/roles')} 
                  className="w-full h-16 rounded-[1.5rem] bg-zinc-900 flex items-center px-5 gap-4 active:scale-[0.98] transition-all shadow-xl"
                >
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                    <UserCog className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-white font-black tracking-tight text-[13px] block">Role management</span>
                    <span className="text-white/40 text-[9px] font-bold mt-1 block">Assign support & agents</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </button>
              )}

              {(userProfile?.isCoinseller || userProfile?.isAdmin) && (
                <button 
                  onClick={() => router.push(userProfile?.isAdmin ? '/admin/award' : '/coinseller/award')} 
                  className="w-full h-16 rounded-[1.5rem] bg-white border border-amber-100 flex items-center px-5 gap-4 active:scale-[0.98] transition-all shadow-sm"
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                    <Award className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-gray-900 font-black tracking-tight text-[13px] block">Award coins</span>
                    <span className="text-gray-400 text-[9px] font-bold mt-1 block">Grant coins to users</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-200" />
                </button>
              )}

              {(userProfile?.isSupport || userProfile?.isAdmin) && (
                <button 
                  onClick={() => router.push('/support/reports')} 
                  className="w-full h-16 rounded-[1.5rem] bg-white border border-blue-50 flex items-center px-5 gap-4 active:scale-[0.98] transition-all shadow-sm relative"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-gray-900 font-black tracking-tight text-[13px] block">Support dashboard</span>
                    <span className="text-gray-400 text-[9px] font-bold mt-1 block">Handle user complaints</span>
                  </div>
                  {pendingReportsCount > 0 && (
                    <div className="absolute top-5 right-10 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-200" />
                </button>
              )}

              {isFemale && (userProfile?.isAgent || userProfile?.isAdmin) && (
                <button 
                  onClick={() => router.push('/profile/agent-center')} 
                  className="w-full h-16 rounded-[1.5rem] bg-white border border-purple-50 flex items-center px-5 gap-4 shadow-sm active:scale-[0.98] transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100">
                    <Building2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-gray-900 font-black tracking-tight text-[13px] block">Agent center</span>
                    <span className="text-gray-400 text-[9px] font-bold mt-1 block">Manage agency anchor</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-200" />
                </button>
              )}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-gray-400 capitalize tracking-[0.3em]">Account & Safety</h2>
            <div className="h-px flex-1 bg-gray-50 ml-4" />
          </div>
          
          <div className="space-y-2.5">
            {!isVerified && (
              <button 
                onClick={() => router.push('/profile/verify')} 
                className="w-full h-16 rounded-[1.5rem] bg-gradient-to-r from-blue-600 to-blue-500 flex items-center px-5 gap-4 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20"
              >
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-white font-black tracking-tight text-[13px] block leading-none">Verify profile</span>
                  <span className="text-white/60 text-[10px] font-bold tracking-tighter mt-1 block">Get official checkmark</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </button>
            )}

            <button 
              onClick={() => router.push('/chat/customer_support')} 
              className="w-full h-16 rounded-[1.5rem] bg-white border border-gray-50 flex items-center px-5 gap-4 active:scale-[0.98] transition-all shadow-sm"
            >
              <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center border border-green-100">
                <Headset className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-gray-900 font-black tracking-tight text-[13px] block leading-none">Customer support</span>
                <span className="text-gray-400 text-[10px] font-bold tracking-tighter mt-1 block">Chat with help team</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-200" />
            </button>

            {isFemale && (
              <button 
                onClick={() => router.push('/profile/agency')} 
                className="w-full h-16 rounded-[1.5rem] bg-white border border-purple-50 flex items-center px-5 gap-4 active:scale-[0.98] transition-all shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-gray-900 font-black tracking-tight text-[13px] block leading-none">Agency anchor</span>
                  <span className="text-gray-400 text-[10px] font-bold tracking-tighter mt-1 block">Join official host team</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-200" />
              </button>
            )}

            <button 
              onClick={() => router.push('/games')} 
              className="w-full h-16 rounded-[1.5rem] bg-white border border-gray-50 flex items-center px-5 gap-4 active:scale-[0.98] transition-all shadow-sm group"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF5722] to-[#FF8A65] flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-gray-900 font-black tracking-tight text-[13px] block leading-none">Games center</span>
                <span className="text-gray-400 text-[10px] font-bold tracking-tighter mt-1 block">Play & win coins</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-200" />
            </button>

            <div className="flex items-center justify-between px-2 pt-4">
              <h2 className="text-[10px] font-black text-gray-400 capitalize tracking-[0.3em]">Preferences</h2>
              <div className="h-px flex-1 bg-gray-50 ml-4" />
            </div>

            <button 
              onClick={() => router.push('/settings')} 
              className="w-full h-16 rounded-[1.5rem] bg-white border border-gray-50 flex items-center px-5 gap-4 shadow-sm active:scale-[0.98] transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100"><SettingsIcon className="w-5 h-5 text-gray-400" /></div>
              <div className="flex-1 text-left"><span className="text-gray-900 font-black tracking-tight text-[13px] block leading-none">Settings</span><span className="text-gray-400 text-[10px] font-bold tracking-tighter mt-1 block">Privacy & Account</span></div>
              <ChevronRight className="w-4 h-4 text-gray-200" />
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
