
"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Star, Check, Coins, Loader2, Gem, Trophy, Sparkles, Zap, ShieldCheck, Heart, MessageCircle, Crown, UserCheck, Shield, Flame, Target, Gift, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export const VIP_CONFIG = [
  { level: 1, exp: 5000, perks: ["Blue username", "Basic VIP badge", "Daily 10 Coins", "Priority Chat"] },
  { level: 2, exp: 20000, perks: ["Visitor List", "Unblur Visitors", "Profile Badge", "Support Priority"] },
  { level: 3, exp: 50000, perks: ["Gold Name", "Profile Glow", "2 Mystery Notes", "Unique Badge"] },
  { level: 4, exp: 100000, perks: ["Elite Rank", "Hide Age", "Extra Interest", "Chat Bubble"] },
  { level: 5, exp: 250000, perks: ["Global Broadcast", "Hide Location", "Exclusive Icon", "VIP Support"] },
  { level: 6, exp: 500000, perks: ["Voice Priority", "Gold Badge+", "Daily 50 Coins", "Premium Status"] },
  { level: 7, exp: 1000000, perks: ["Invisibility", "Direct Line", "Legendary Badge", "Secret Mode"] },
  { level: 8, exp: 2000000, perks: ["Ghost Mode", "Unlimited Notes", "Global Glow+", "Elite Status"] },
  { level: 9, exp: 4000000, perks: ["Custom Tags", "Personal Manager", "Elite Ring", "Admin Priority"] },
  { level: 10, exp: 7000000, perks: ["Moderator Rights", "Legendary Status", "Diamond x1.2", "Official Crown"] },
  { level: 11, exp: 11000000, perks: ["Elite Glow", "Exclusive ID", "Daily 100 Coins", "Super VIP"] },
  { level: 12, exp: 16000000, perks: ["Ambassador", "Private Invites", "Diamond x1.5", "Global Icon"] },
  { level: 13, exp: 22000000, perks: ["God Mode", "Report Immunity", "Gold Profile", "Ultimate Rank"] },
  { level: 14, exp: 30000000, perks: ["Global Glow Max", "Admin Direct", "Daily 500 Coins", "Legacy Badge"] },
  { level: 15, exp: 40000000, perks: ["Platform God", "Infinite Boost", "Diamond x2.0", "Crown of Honor"] },
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

export function getVipDiamondMultiplier(level: number) {
  if (level >= 15) return 2.0;
  if (level >= 12) return 1.5;
  if (level >= 10) return 1.2;
  return 1.0;
}

export default function VIPCenterPage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore } = useFirebase()

  const meRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: profile, isLoading } = useDoc(meRef)

  const [selectedLevel, setSelectedLevel] = useState(1)

  const currentExp = profile?.vipExp || 0
  const currentLevel = profile?.vipLevel || 0

  useEffect(() => {
    if (profile && firestore) {
      const calculatedLevel = getVipLevelFromExp(currentExp)
      if (calculatedLevel !== currentLevel) {
        updateDoc(doc(firestore, "userProfiles", profile.id), {
          vipLevel: calculatedLevel,
          updatedAt: new Date().toISOString()
        })
      }
    }
  }, [currentExp, currentLevel, !!profile, !!firestore])

  useEffect(() => {
    if (currentLevel > 0) setSelectedLevel(currentLevel)
  }, [currentLevel])

  const nextLevelIndex = currentLevel < 15 ? (currentLevel === 0 ? 0 : currentLevel) : 14
  const nextLevelExp = VIP_CONFIG[nextLevelIndex].exp
  const prevLevelExp = currentLevel > 0 ? VIP_CONFIG[currentLevel - 1].exp : 0
  
  const expInCurrentTier = currentExp - prevLevelExp
  const tierRequirement = nextLevelExp - prevLevelExp
  const progress = Math.min((expInCurrentTier / tierRequirement) * 100, 100)

  const cumulativePerks = useMemo(() => {
    let perks: string[] = []
    for (let i = 0; i < selectedLevel; i++) {
      perks = [...perks, ...VIP_CONFIG[i].perks]
    }
    return Array.from(new Set(perks))
  }, [selectedLevel])

  if (isLoading) {
    return <div className="flex h-svh items-center justify-center bg-[#0a0a0a] text-[#3BC1A8]"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <div className="flex flex-col h-svh bg-[#0a0a0a] text-white overflow-y-auto font-body scroll-smooth">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-xl z-50 border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-white/5 rounded-full"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase text-[#3BC1A8]">VIP Growth</h1>
      </header>

      <main className="flex-1 p-6 space-y-8">
        <section className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 rounded-[3rem] border border-[#3BC1A8]/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10"><Crown className="w-32 h-32 text-[#3BC1A8]" /></div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#3BC1A8] to-[#2DA08F] rounded-2xl flex items-center justify-center shadow-lg">
                <Crown className="w-8 h-8 text-white fill-current" />
              </div>
              <div>
                <h2 className="text-3xl font-black font-headline tracking-tighter">VIP {currentLevel}</h2>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Total EXP: {currentExp.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end px-1">
                <span className="text-[9px] font-black uppercase text-[#3BC1A8]/60">Upgrade Progress</span>
                <span className="text-[10px] font-bold text-white/40">{currentExp.toLocaleString()} / {nextLevelExp.toLocaleString()}</span>
              </div>
              <Progress value={progress} className="h-3 bg-white/5" />
              <p className="text-[9px] font-medium text-zinc-500 text-center pt-1">Gain 1 EXP for every 1 Coin earned (+)</p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
            {VIP_CONFIG.map((tier) => (
              <button
                key={tier.level}
                onClick={() => setSelectedLevel(tier.level)}
                className={cn(
                  "flex-shrink-0 w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 relative",
                  selectedLevel === tier.level 
                    ? "border-[#3BC1A8] bg-[#3BC1A8]/10 scale-110 z-10 shadow-[0_0_20px_rgba(59,193,168,0.3)]" 
                    : "border-white/5 bg-zinc-900 text-zinc-500 opacity-60"
                )}
              >
                <span className="text-xl font-black font-headline">{tier.level}</span>
                {currentLevel >= tier.level && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#3BC1A8] rounded-full flex items-center justify-center border-2 border-[#0a0a0a]">
                    <Check className="w-3 h-3 text-white stroke-[4]" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-8 space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-2xl font-black font-headline text-[#3BC1A8]">VIP {selectedLevel} Benefits</h3>
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                  {selectedLevel <= currentLevel ? "UNLOCKED" : `${(VIP_CONFIG[selectedLevel-1].exp - currentExp).toLocaleString()} EXP TO GO`}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#3BC1A8]/10 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-[#3BC1A8]" />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] border-b border-white/5 pb-2">All Active Perks</p>
              <div className="grid grid-cols-2 gap-3">
                {cumulativePerks.map((perk, i) => {
                  const isNewPerk = VIP_CONFIG[selectedLevel - 1].perks.includes(perk);
                  return (
                    <div key={i} className={cn(
                      "flex flex-col gap-2 p-4 rounded-2xl transition-all border",
                      isNewPerk ? "bg-[#3BC1A8]/5 border-[#3BC1A8]/20" : "bg-white/5 border-white/5 opacity-60"
                    )}>
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shadow-inner",
                        isNewPerk ? "bg-[#3BC1A8]/20 text-[#3BC1A8]" : "bg-white/10 text-zinc-500"
                      )}>
                        <Zap className="w-4 h-4" />
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold leading-tight",
                        isNewPerk ? "text-white" : "text-zinc-400"
                      )}>{perk}</span>
                      {isNewPerk && <span className="text-[7px] font-black uppercase text-[#3BC1A8]">New Perk</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
        
        <div className="h-32" />
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/5 flex flex-col items-center z-[100]">
        <Button 
          onClick={() => router.push('/recharge')}
          className="w-full h-16 rounded-full bg-[#3BC1A8] hover:bg-[#2DA08F] text-white font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all"
        >
          Recharge to Level Up
        </Button>
      </footer>
    </div>
  )
}
