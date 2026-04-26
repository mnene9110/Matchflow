"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Star, Check, ShieldCheck, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const HOST_SUBSCRIPTION_COST = 4000

const HOST_PERKS = [
  "Create unlimited party rooms",
  "Appoint room assistants/moderators",
  "Earn diamonds from room gifts",
  "Special 'Official Host' profile badge",
  "Priority room listing in Discover",
  "Manage room music and lock settings"
]

export default function SubscribeHostPage() {
  const router = useRouter()
  const { user: currentUser, profile } = useSupabaseUser()
  const { toast } = useToast()

  const [isSubscribing, setIsSubscribing] = useState(false)

  const handleSubscribe = async () => {
    if (!currentUser || !profile || isSubscribing) return

    if ((profile.coin_balance || 0) < HOST_SUBSCRIPTION_COST) {
      toast({
        variant: "destructive",
        title: "Insufficient Coins",
        description: `You need ${HOST_SUBSCRIPTION_COST} coins to become a host.`,
        action: <Button variant="outline" size="sm" onClick={() => router.push('/recharge')}>Buy Coins</Button>
      })
      return
    }

    setIsSubscribing(true)
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_party_admin: true,
          coin_balance: profile.coin_balance - HOST_SUBSCRIPTION_COST,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (profileError) throw profileError;

      await supabase.from('transactions').insert({
        user_id: currentUser.id,
        type: "host_subscription",
        amount: -HOST_SUBSCRIPTION_COST,
        description: "Purchased Official Host Subscription"
      });

      toast({ 
        title: "Welcome, Host!", 
        description: "You are now an official Party Admin. Your Host Console is ready." 
      })
      router.replace('/profile')
    } catch (error: any) {
      toast({ variant: "destructive", title: "Subscription Failed", description: "Could not process request." })
    } finally {
      setIsSubscribing(false)
    }
  }

  const darkMaroon = "bg-[#5A1010]";

  return (
    <div className="flex flex-col min-h-svh bg-transparent text-gray-900 overflow-y-auto pb-20">
      <header className="px-4 py-8 flex items-center bg-transparent shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-white h-10 w-10 bg-black/10 backdrop-blur-md rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-black font-headline ml-4 tracking-widest uppercase text-white drop-shadow-md">Become a Host</h1>
      </header>

      <main className="flex-1 px-6 pt-4 space-y-8">
        <section className="bg-zinc-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Star className="w-32 h-32" /></div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/10">
                <Sparkles className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Official Status</span>
                <h2 className="text-3xl font-black font-headline leading-none">Party Admin</h2>
              </div>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-white/5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Exclusive Benefits:</p>
              <div className="grid grid-cols-1 gap-3">
                {HOST_PERKS.map((perk, i) => (
                  <div key={i} className="flex items-center gap-3 group">
                    <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-green-500" />
                    </div>
                    <span className="text-[11px] font-medium text-zinc-300 group-hover:text-white transition-colors">{perk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/50 shadow-2xl space-y-8">
          <div className="text-center space-y-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">One-time Subscription</p>
            <div className="flex items-center justify-center gap-3">
              <div className="bg-primary/10 w-10 h-10 rounded-xl flex items-center justify-center">
                <span className="text-primary font-black text-xl italic">S</span>
              </div>
              <span className="text-5xl font-black font-headline tracking-tighter">{HOST_SUBSCRIPTION_COST.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-4">
            <Button 
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className={cn("w-full h-18 rounded-full text-white font-black text-lg shadow-2xl active:scale-95 transition-all gap-3", darkMaroon)}
            >
              {isSubscribing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-6 h-6" />
                  Unlock Host Access
                </>
              )}
            </Button>
            <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
              Your status will be updated immediately upon payment.<br />Subscription is permanent.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
