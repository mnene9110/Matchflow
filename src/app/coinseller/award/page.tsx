
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Search, Loader2, Coins, Award, UserCheck, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { useToast } from "@/hooks/use-toast"

export default function AwardCoinsPage() {
  const router = useRouter()
  const { profile } = useSupabaseUser()
  const { toast } = useToast()

  const [targetNumericId, setTargetNumericId] = useState("")
  const [awardAmount, setAwardAmount] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isAwarding, setIsAwarding] = useState(false)
  const [foundUser, setFoundUser] = useState<any>(null)

  const isEligible = profile?.is_coinseller || profile?.is_admin;

  if (!isEligible && !isSearching) {
    return <div className="flex h-svh items-center justify-center bg-white text-zinc-400 font-black uppercase text-xs tracking-widest">Access Denied</div>
  }

  const handleSearch = async () => {
    if (!targetNumericId.trim()) return
    setIsSearching(true)
    setFoundUser(null)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('numeric_id', Number(targetNumericId))
        .single();

      if (error || !data) {
        toast({ variant: "destructive", title: "User not found" })
      } else {
        setFoundUser(data)
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Search failed" })
    } finally {
      setIsSearching(false)
    }
  }

  const handleAward = async () => {
    const amount = Number(awardAmount)
    if (!foundUser || !amount || amount <= 0 || isAwarding || !profile) return
    setIsAwarding(true)
    
    try {
      // SECURE RPC CALL: Handles both Admin and Coinseller logic server-side
      const { error } = await supabase.rpc('process_coin_award', {
        p_target_numeric_id: Number(targetNumericId),
        p_amount: amount
      });

      if (error) {
        if (error.message.includes('INSUFFICIENT_FUNDS')) {
          toast({ variant: "destructive", title: "Insufficient balance" });
        } else if (error.message.includes('UNAUTHORIZED')) {
          toast({ variant: "destructive", title: "Access denied" });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: "Award Successful", description: `${amount} coins granted.` })
      router.back()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Award failed" })
    } finally {
      setIsAwarding(false)
    }
  }

  return (
    <div className="flex flex-col min-h-svh bg-white text-gray-900">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-[#3BC1A8] z-10 text-white shadow-lg">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Award Coins</h1>
      </header>
      <main className="flex-1 px-6 pb-20 space-y-8 pt-6">
        <div className="bg-zinc-900 rounded-[2.5rem] p-6 text-white shadow-xl">
           <div className="flex items-center gap-3 mb-4"><Coins className="w-5 h-5 text-amber-500" /><span className="text-[10px] font-black uppercase tracking-widest opacity-60">Your Balance</span></div>
           <p className="text-3xl font-black font-headline">{profile?.is_admin ? "UNLIMITED" : (profile?.coin_balance || 0).toLocaleString()}</p>
        </div>
        <section className="space-y-4">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3BC1A8] ml-1">Recipient Numeric ID</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Enter ID" value={targetNumericId} onChange={(e) => setTargetNumericId(e.target.value)} className="h-14 pl-12 rounded-2xl bg-gray-50 border-gray-100 text-sm font-bold shadow-sm" type="number" />
            </div>
            <Button onClick={handleSearch} disabled={isSearching || !targetNumericId} className="h-14 w-14 rounded-2xl bg-zinc-900">{isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}</Button>
          </div>
        </section>
        {foundUser && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="p-6 bg-gray-50 border border-gray-100 rounded-[2.5rem] shadow-sm flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#3BC1A8]/10 flex items-center justify-center"><UserCheck className="w-8 h-8 text-[#3BC1A8]" /></div>
              <div className="flex-1"><h3 className="font-black text-lg text-gray-900 leading-tight">{foundUser.username}</h3><p className="text-[10px] font-bold text-[#3BC1A8] uppercase tracking-widest">ID: {foundUser.numeric_id}</p></div>
            </div>
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Award Amount</Label>
              <div className="relative"><Award className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" /><Input type="number" placeholder="0" value={awardAmount} onChange={(e) => setAwardAmount(e.target.value)} className="h-16 pl-14 rounded-3xl bg-white border-2 border-amber-500/20 text-2xl font-black focus-visible:ring-amber-500/10" /></div>
            </div>
            <Button className="w-full h-16 rounded-full bg-zinc-900 text-white font-black text-lg shadow-2xl active:scale-95 transition-all gap-3" onClick={handleAward} disabled={isAwarding || !awardAmount || Number(awardAmount) <= 0}>
              {isAwarding ? <Loader2 className="w-6 h-6 animate-spin" /> : <><span className="text-sm font-black uppercase tracking-widest">Grant Coins</span><ArrowRight className="w-5 h-5" /></>}
            </Button>
          </section>
        )}
      </main>
    </div>
  )
}
