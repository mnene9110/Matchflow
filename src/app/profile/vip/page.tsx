"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Star, Check, Loader2, Trophy, Sparkles, Zap, Crown, Eye, ShieldCheck, Ghost, Search, MapPin, Clock, Music, Heart, MessageSquare, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { supabase } from "@/lib/supabase"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export const VIP_CONFIG = [
  { level: 1, exp: 5000, perks: ["Blue username", "Basic VIP badge", "Profile Tag", "Faster Matches"] },
  { level: 2, exp: 20000, perks: ["Visitor List", "Unblur Visitors", "Support Badge", "Priority Help"] },
  { level: 3, exp: 50000, perks: ["Gold Name", "Profile Glow", "2 Mystery Notes", "VIP Chat Badge"] },
  { level: 4, exp: 100000, perks: ["Hide Age", "Hide Location", "Extra Photo slot", "Bio Font Style"] },
  { level: 5, exp: 250000, perks: ["Global Broadcast", "Exclusive Icon", "5 Mystery Notes", "VIP Support Line"] },
  { level: 6, exp: 500000, perks: ["Voice Priority", "Premium Frame", "Premium Badge", "Auto-Match Perk"] },
  { level: 7, exp: 1000000, perks: ["Invisibility Mode", "Ghost Browsing", "Legendary Badge", "Private ID"] },
  { level: 8, exp: 2000000, perks: ["Unlimited Notes", "Global Glow+", "Elite Status", "Hidden Distance"] },
  { level: 9, exp: 4000000, perks: ["Custom Interests", "Elite Ring", "Profile Music", "Premium Wall"] },
  { level: 10, exp: 7000000, perks: ["Official Crown", "Legendary Status", "Verified Plus", "Priority List"] },
  { level: 11, exp: 11000000, perks: ["Super VIP", "Exclusive Emoji", "Elite Glow Max", "Priority Queue"] },
  { level: 12, exp: 16000000, perks: ["Global Icon", "Private Party", "Exclusive Stickers", "Luxury Theme"] },
  { level: 13, exp: 22000000, perks: ["Ultimate Rank", "Report Protection", "Gold Profile", "Elite Support"] },
  { level: 14, exp: 30000000, perks: ["Legacy Badge", "Direct Support", "Platinum Name", "Special Animation"] },
  { level: 15, exp: 40000000, perks: ["Platform God", "Crown of Honor", "Hall of Fame", "Infinite Discover"] },
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
  const { user: currentUser, profile, isLoading } = useSupabaseUser()

  const [selectedLevel, setSelectedLevel] = useState(1)

  const currentExp = Number(profile?.vip_exp || 0)
  const currentLevel = Number(profile?.vip_level || 0)

  useEffect(() => {
    if (profile && currentUser) {
      const calculatedLevel = getVipLevelFromExp(currentExp)
      if (calculatedLevel !== currentLevel) {
        supabase.from('profiles').update({
          vip_level: calculatedLevel,
          updated_at: new Date().toISOString()
        }).eq('id', currentUser.id)
      }
    }
  }, [currentExp, currentLevel, !!profile, !!currentUser])

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

  const currentLevelPerks = useMemo(() => {
    return VIP_CONFIG[selectedLevel - 1]?.perks || []
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
                <span className="text-[9px] font-black uppercase text-[#3BC1A8]/60">Level Progress</span>
                <span className="text-[10px] font-bold text-white/40">{currentExp.toLocaleString()} / {nextLevelExp.toLocaleString()}</span>
              </div>
              <Progress value={progress} className="h-3 bg-white/5" />
              <p className="text-[9px] font-medium text-zinc-500 text-center pt-1">Gained from positive coin activities (+)</p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar px-2">
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

          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3BC1A8]">New at Level {selectedLevel}</h3>
              <Sparkles className="w-4 h-4 text-[#3BC1A8]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {currentLevelPerks.map((perk, i) => (
                <div key={i} className="bg-white/5 border border-[#3BC1A8]/30 p-4 rounded-2xl flex flex-col gap-2 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-[#3BC1A8]/20 flex items-center justify-center text-[#3BC1A8]">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black uppercase leading-tight tracking-tight">{perk}</span>
                </div>
              ))}
            </div>
          </div>

          {selectedLevel > 1 && (
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Includes Previous Benefits</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 opacity-60">
                {cumulativePerks.filter(p => !currentLevelPerks.includes(p)).map((perk, i) => (
                  <div key={i} className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex items-center gap-3">
                    <Check className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-[10px] font-bold text-zinc-400">{perk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        
        <div className="h-32" />
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/5 flex flex-col items-center z-[100]">
        <Button 
          onClick={() => router.push('/recharge')}
          className="w-full h-16 rounded-full bg-[#3BC1A8] hover:bg-[#2DA08F] text-white font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all"
        >
          {selectedLevel > currentLevel ? `Recharge for VIP ${selectedLevel}` : 'Keep Growing'}
        </Button>
      </footer>
    </div>
  )
}
