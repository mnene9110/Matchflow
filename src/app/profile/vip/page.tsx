
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Star, Check, Coins, Loader2, Gem, MessageCircle, Heart, ShieldCheck, Trophy, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export const VIP_CONFIG = [
  { level: 1, exp: 1000, perks: ["Blue username", "Basic VIP badge"] },
  { level: 2, exp: 3000, perks: ["Avatar frame", "Chat bubble"] },
  { level: 3, exp: 7000, perks: ["5% gift discount", "Unique entry effect"] },
  { level: 4, exp: 15000, perks: ["Priority Support", "Profile visitor list"] },
  { level: 5, exp: 30000, perks: ["Gold Discover name", "10% gift discount"] },
  { level: 6, exp: 60000, perks: ["Exclusive Crown", "Voice chat priority"] },
  { level: 7, exp: 120000, perks: ["15% gift discount", "Hide location option"] },
  { level: 8, exp: 250000, perks: ["Animated profile", "Global broadcast badge"] },
  { level: 9, exp: 500000, perks: ["Invisibility mode", "20% gift discount"] },
  { level: 10, exp: 1000000, perks: ["Legendary Status", "Personal manager"] },
]

export function getVipLevelFromExp(exp: number) {
  let level = 0;
  for (let i = VIP_CONFIG.length - 1; i >= 0; i--) {
    if (exp >= VIP_CONFIG[i].exp) {
      level = VIP_CONFIG[i].level;
      break;
    }
  }
  return level;
}

export default function VIPCenterPage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore } = useFirebase()

  const meRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: profile, isLoading } = useDoc(meRef)

  if (isLoading) {
    return <div className="flex h-svh items-center justify-center bg-[#0a0a0a]"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>
  }

  const currentExp = profile?.vipExp || 0;
  const currentLevel = profile?.vipLevel || 0;
  const nextLevelIndex = currentLevel < 10 ? currentLevel : 9;
  const nextLevelExp = VIP_CONFIG[nextLevelIndex].exp;
  const progress = Math.min((currentExp / nextLevelExp) * 100, 100);

  return (
    <div className="flex flex-col h-svh bg-[#0a0a0a] text-white overflow-y-auto font-body">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md z-50 border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-white/5 rounded-full"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase text-amber-400">VIP Growth</h1>
      </header>

      <main className="flex-1 p-8 space-y-10">
        <section className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 rounded-[3rem] border border-amber-400/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10"><Trophy className="w-32 h-32" /></div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Star className="w-8 h-8 text-white fill-current" />
              </div>
              <div>
                <h2 className="text-3xl font-black font-headline tracking-tighter">VIP {currentLevel}</h2>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Total EXP: {currentExp.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end px-1">
                <span className="text-[9px] font-black uppercase text-amber-400/60">Level Progress</span>
                <span className="text-[10px] font-bold text-white/40">{currentExp.toLocaleString()} / {nextLevelExp.toLocaleString()}</span>
              </div>
              <Progress value={progress} className="h-3 bg-white/5" />
              <p className="text-[9px] font-medium text-zinc-500 text-center pt-1">Recharge 1 Coin to gain 1 VIP EXP</p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">VIP Tiers & Rewards</h2>
            </div>
          </div>

          <div className="space-y-3 pb-20">
            {VIP_CONFIG.map((tier) => (
              <div 
                key={tier.level} 
                className={cn(
                  "p-5 rounded-[2rem] border transition-all duration-500",
                  currentLevel >= tier.level 
                    ? "bg-amber-400/10 border-amber-400/20" 
                    : "bg-white/5 border-white/5 opacity-60"
                )}
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm",
                      currentLevel >= tier.level ? "bg-amber-400 text-zinc-950" : "bg-zinc-800 text-zinc-500"
                    )}>
                      {tier.level}
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest">VIP {tier.level}</h3>
                      <p className="text-[8px] font-bold text-zinc-500">{tier.exp.toLocaleString()} EXP required</p>
                    </div>
                  </div>
                  {currentLevel >= tier.level && (
                    <div className="w-6 h-6 bg-amber-400/20 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-amber-400 stroke-[4]" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {tier.perks.map((perk, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-amber-400/40" />
                      <span className="text-[9px] font-medium text-zinc-400">{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-[#0a0a0a]/80 backdrop-blur-xl border-t border-white/5 flex flex-col items-center">
        <Button 
          onClick={() => router.push('/recharge')}
          className="w-full h-14 rounded-full bg-amber-400 hover:bg-amber-500 text-zinc-950 font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
        >
          Recharge to Level Up
        </Button>
      </footer>
    </div>
  )
}
