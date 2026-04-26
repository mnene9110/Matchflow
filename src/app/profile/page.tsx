
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
  ClipboardList,
  Building2,
  Award,
  UserCog,
  Eye
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, isLoading } = useSupabaseUser()
  const { toast } = useToast()
  
  const [visitorsCount, setVisitorsCount] = useState(0)

  useEffect(() => {
    // This part still uses Firebase/Local logic for visitors for now or can be migrated next
  }, [user])

  const copyId = () => {
    if (profile?.numeric_id) {
      navigator.clipboard.writeText(profile.numeric_id.toString());
      toast({ title: "ID Copied" });
    }
  }

  const userImage = (profile?.profile_photo_urls && profile?.profile_photo_urls[0]) || ""
  const isVerified = !!profile?.is_verified
  const isFemale = profile?.gender?.toLowerCase() === 'female'

  if (isLoading) return <div className="flex h-svh items-center justify-center bg-[#3BC1A8]"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>

  return (
    <div className="flex flex-col h-svh w-full bg-white text-gray-900 overflow-y-auto scroll-smooth">
      <header className="flex flex-col items-center pt-8 pb-16 px-6 shrink-0 relative bg-[#3BC1A8]">
        <div className="absolute top-8 right-6 z-20">
          <button onClick={() => router.push('/profile/visitors')} className="flex flex-col items-center gap-1 group active:scale-95 transition-all">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center relative shadow-lg">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <span className="text-[8px] font-black text-white/60 uppercase tracking-widest">Visitors</span>
          </button>
        </div>
        <div className="relative mb-4">
          <Avatar className="w-28 h-28 shadow-2xl bg-white/10 border-none transition-all">
            {userImage && <AvatarImage src={userImage} className="object-cover" />}
            <AvatarFallback className="bg-white/20 text-white font-black text-2xl uppercase border-none">{profile?.username?.[0]}</AvatarFallback>
          </Avatar>
          <button onClick={() => router.push('/profile/edit')} className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center shadow-xl active:scale-90 transition-transform"><Pencil className="w-3.5 h-3.5 text-white" /></button>
        </div>
        <div className="text-center space-y-1 mb-4">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black text-white drop-shadow-sm">{profile?.username || "Guest"}</h1>
            {isVerified && <CheckCircle className="w-5 h-5 text-blue-500 fill-current" />}
          </div>
          <p className="text-white/60 text-[9px] font-black uppercase tracking-[0.2em]">Verified Official Profile</p>
        </div>
        {profile?.numeric_id && (<button onClick={copyId} className="flex items-center gap-2 px-5 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full active:bg-white/30 transition-all shadow-sm"><span className="text-[10px] font-black text-white uppercase tracking-widest">ID: {profile.numeric_id}</span><Copy className="w-3 h-3 text-white/40" /></button>)}
      </header>

      <main className="flex-1 px-6 space-y-8 pb-44 -mt-10 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-[2.25rem] p-5 flex flex-col items-center gap-3 shadow-xl border border-gray-50 text-center">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Coins className="w-5 h-5 text-primary" /></div>
            <div className="space-y-0.5"><span className="text-[9px] font-black text-gray-300 uppercase tracking-widest block">Balance</span><span className="text-2xl font-black text-gray-900 font-headline">{(profile?.coin_balance || 0).toLocaleString()}</span></div>
            <Button onClick={() => router.push('/recharge')} className="w-full h-10 rounded-full bg-[#3BC1A8] text-white font-black text-[9px] uppercase tracking-widest">Recharge</Button>
          </div>
          <div className="bg-white rounded-[2.25rem] p-5 flex flex-col items-center gap-3 shadow-xl border border-gray-50 text-center">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><Gem className="w-5 h-5 text-blue-500" /></div>
            <div className="space-y-0.5"><span className="text-[9px] font-black text-gray-300 uppercase tracking-widest block">Earnings</span><span className="text-2xl font-black text-gray-900 font-headline">{(profile?.diamond_balance || 0).toLocaleString()}</span></div>
            <Button onClick={() => router.push('/profile/income')} className="w-full h-10 rounded-full bg-zinc-900 text-white font-black text-[9px] uppercase tracking-widest">Income</Button>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-2"><h2 className="text-[10px] font-black text-gray-400 capitalize tracking-[0.3em]">Account & Safety</h2><div className="h-px flex-1 bg-gray-50 ml-4" /></div>
          <div className="space-y-2.5">
            {!isVerified && (<button onClick={() => router.push('/profile/verify')} className="w-full h-16 rounded-[1.5rem] bg-gradient-to-r from-blue-600 to-blue-500 flex items-center px-5 gap-4 shadow-lg"><div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-white" /></div><div className="flex-1 text-left"><span className="text-white font-black text-[13px] block">Verify profile</span></div><ChevronRight className="w-4 h-4 text-white/40" /></button>)}
            <button onClick={() => router.push('/chat/customer_support')} className="w-full h-16 rounded-[1.5rem] bg-white border border-gray-50 flex items-center px-5 gap-4"><div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center"><Headset className="w-5 h-5 text-green-600" /></div><div className="flex-1 text-left"><span className="text-gray-900 font-black text-[13px] block">Customer support</span></div><ChevronRight className="w-4 h-4 text-gray-200" /></button>
            <button onClick={() => router.push('/settings')} className="w-full h-16 rounded-[1.5rem] bg-white border border-gray-50 flex items-center px-5 gap-4"><div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100"><SettingsIcon className="w-5 h-5 text-gray-400" /></div><div className="flex-1 text-left"><span className="text-gray-900 font-black text-[13px] block">Settings</span></div><ChevronRight className="w-4 h-4 text-gray-200" /></button>
          </div>
        </section>
      </main>
    </div>
  )
}
