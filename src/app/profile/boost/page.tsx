
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Rocket, Coins, Loader2, Zap, ArrowRight, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const BOOST_COST = 500 // Coins for 1 hour

export default function ProfileBoostPage() {
  const router = useRouter()
  const { user: currentUser, profile } = useSupabaseUser()
  const { toast } = useToast()

  const [isBoosting, setIsBoosting] = useState(false)

  const handleBoost = async () => {
    if (!currentUser || !profile || isBoosting) return

    if ((profile.coin_balance || 0) < BOOST_COST) {
      toast({
        variant: "destructive",
        title: "Insufficient Coins",
        description: `You need ${BOOST_COST} coins to boost your profile.`,
        action: <Button variant="outline" size="sm" onClick={() => router.push('/recharge')}>Recharge</Button>
      })
      return
    }

    setIsBoosting(true)
    try {
      // 1. Calculate boost expiry
      const boostedUntil = new Date(Date.now() + (60 * 60 * 1000)).toISOString();

      // 2. Update Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          boosted_until: boostedUntil,
          coin_balance: profile.coin_balance - BOOST_COST,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (profileError) throw profileError;

      // 3. Log Transaction
      await supabase.from('transactions').insert({
        user_id: currentUser.id,
        type: "profile_boost",
        amount: -BOOST_COST,
        description: "Purchased Profile Boost (1 Hour)"
      });

      toast({ 
        title: "Profile Boosted!", 
        description: "Your profile is now featured at the top of Discover for 1 hour." 
      })
      router.replace('/profile')
    } catch (error: any) {
      toast({ variant: "destructive", title: "Boost Failed", description: "Could not process request." })
    } finally {
      setIsBoosting(false)
    }
  }

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900 overflow-y-auto">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-[#3BC1A8] z-50 shadow-lg text-white">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Boost Center</h1>
      </header>

      <main className="flex-1 p-8 space-y-10 pt-12">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="relative">
            <div className="w-32 h-32 bg-orange-100 rounded-[3rem] flex items-center justify-center border-4 border-orange-50 animate-pulse">
              <Rocket className="w-16 h-16 text-orange-500" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-xl border-2 border-white">
              <Zap className="w-6 h-6 text-amber-400 fill-current" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black font-headline text-gray-900 leading-tight">Get Noticed.</h2>
            <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-[280px] mx-auto">
              Boost your profile to be featured at the top of everyone's Discover grid.
            </p>
          </div>
        </div>

        <section className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 space-y-8 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center"><Timer className="w-5 h-5 text-orange-500" /></div>
              <span className="text-xs font-black uppercase tracking-widest">Boost Duration</span>
            </div>
            <span className="text-lg font-black text-gray-900">1 Hour</span>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Coins className="w-5 h-5 text-amber-500" /></div>
              <span className="text-xs font-black uppercase tracking-widest">Cost</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black font-headline text-gray-900">{BOOST_COST}</span>
              <span className="text-[10px] font-black text-gray-400 uppercase">Coins</span>
            </div>
          </div>
        </section>

        <div className="pt-4">
          <Button 
            onClick={handleBoost}
            disabled={isBoosting}
            className="w-full h-18 rounded-full bg-zinc-900 text-white font-black text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {isBoosting ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Activate Boost <ArrowRight className="w-5 h-5" /></>}
          </Button>
        </div>
      </main>
    </div>
  )
}
