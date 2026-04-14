
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Star, Check, Coins, Loader2, Gem, MessageCircle, Heart, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, runTransaction, collection, increment } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const VIP_COST = 2000 // Coins for 30 days

const VIP_PERKS = [
  { icon: Heart, label: "Elite Gold Badge", desc: "Exclusive profile decoration" },
  { icon: MessageCircle, label: "Priority Messages", desc: "Your chats appear first" },
  { icon: ShieldCheck, label: "Verified Status", desc: "Automatic verified checkmark" },
  { icon: Gem, label: "Mystery Note discount", desc: "50% off all broadcasts" },
]

export default function VIPCenterPage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore } = useFirebase()
  const { toast } = useToast()

  const [isSubscribing, setIsSubscribing] = useState(false)

  const meRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: profile } = useDoc(meRef)

  const handleSubscribe = async () => {
    if (!currentUser || !profile || isSubscribing || !firestore) return

    if ((profile.coinBalance || 0) < VIP_COST) {
      toast({
        variant: "destructive",
        title: "Insufficient Coins",
        description: `You need ${VIP_COST} coins for VIP membership.`,
        action: <Button variant="outline" size="sm" onClick={() => router.push('/recharge')}>Recharge</Button>
      })
      return
    }

    setIsSubscribing(true)
    try {
      await runTransaction(firestore, async (transaction) => {
        const profileSnap = await transaction.get(meRef!);
        const currentBalance = profileSnap.data()?.coinBalance || 0;

        if (currentBalance < VIP_COST) throw new Error("INSUFFICIENT_COINS");

        transaction.update(meRef!, {
          isVIP: true,
          isVerified: true, // VIPs get verified
          vipExpiresAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
          coinBalance: increment(-VIP_COST),
          updatedAt: new Date().toISOString()
        });

        const txRef = doc(collection(meRef!, "transactions"));
        transaction.set(txRef, {
          id: txRef.id,
          type: "vip_subscription",
          amount: -VIP_COST,
          transactionDate: new Date().toISOString(),
          description: "Purchased VIP Membership (30 Days)"
        });
      });

      toast({ 
        title: "Welcome to Elite!", 
        description: "You are now a VIP member. Enjoy your perks." 
      })
      router.replace('/profile')
    } catch (error: any) {
      toast({ variant: "destructive", title: "Subscription Failed", description: "Could not process request." })
    } finally {
      setIsSubscribing(false)
    }
  }

  return (
    <div className="flex flex-col h-svh bg-[#0a0a0a] text-white overflow-y-auto font-body">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md z-50 border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-white/5 rounded-full"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase text-amber-400">VIP Center</h1>
      </header>

      <main className="flex-1 p-8 space-y-12">
        <section className="flex flex-col items-center text-center space-y-6">
          <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.3)] animate-float">
            <Star className="w-12 h-12 text-white fill-current" />
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black font-headline text-white tracking-tight">Elite Membership</h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em]">Elevate your presence</p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4">
          {VIP_PERKS.map((perk, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-[2rem] flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 flex items-center justify-center text-amber-400">
                <perk.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-white uppercase tracking-tight">{perk.label}</h3>
                <p className="text-[10px] font-medium text-zinc-500 mt-0.5">{perk.desc}</p>
              </div>
              <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-green-500 stroke-[4]" />
              </div>
            </div>
          ))}
        </div>

        <section className="bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 rounded-[3rem] border border-amber-400/20 space-y-8 shadow-2xl">
          <div className="text-center space-y-2">
            <p className="text-[10px] font-black text-amber-400/60 uppercase tracking-[0.3em]">30 Days Subscription</p>
            <div className="flex items-center justify-center gap-3">
              <Coins className="w-8 h-8 text-amber-400" />
              <span className="text-5xl font-black font-headline text-white tracking-tighter">{VIP_COST.toLocaleString()}</span>
            </div>
          </div>

          <Button 
            onClick={handleSubscribe}
            disabled={isSubscribing}
            className="w-full h-18 rounded-full bg-amber-400 hover:bg-amber-500 text-zinc-950 font-black text-lg shadow-[0_10px_30px_rgba(251,191,36,0.3)] active:scale-95 transition-all"
          >
            {isSubscribing ? <Loader2 className="w-6 h-6 animate-spin" /> : "Unlock Elite Perks"}
          </Button>
        </section>
      </main>
    </div>
  )
}
