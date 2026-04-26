"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, Eye, ArrowRight, Lock, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

const UNLOCK_COST = 500

export default function VisitorsPage() {
  const router = useRouter()
  const { user, profile, isLoading: isUserLoading } = useSupabaseUser()
  const { toast } = useToast()
  
  const [visitors, setVisitors] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUnlocking, setIsUnlocking] = useState(false)

  useEffect(() => {
    if (!user) return

    const fetchVisitors = async () => {
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .eq('target_user_id', user.id)
        .order('timestamp', { ascending: false });
      
      if (!error) setVisitors(data || []);
      setIsLoading(false);
    };

    fetchVisitors();

    const channel = supabase
      .channel(`visitors:${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'visitors', 
        filter: `target_user_id=eq.${user.id}` 
      }, (payload) => {
        setVisitors(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user])

  const handleUnlock = async () => {
    if (!user || !profile || isUnlocking) return
    
    if ((profile.coin_balance || 0) < UNLOCK_COST) {
      toast({ variant: "destructive", title: "Insufficient Coins", description: `You need ${UNLOCK_COST} coins to unlock.` })
      return
    }

    setIsUnlocking(true)
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          coin_balance: profile.coin_balance - UNLOCK_COST,
          visitors_unlocked: true 
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'visitor_unlock',
        amount: -UNLOCK_COST,
        description: "Unlocked profile visitors list"
      });

      toast({ title: "Unlocked!", description: "You can now see your visitors." })
      router.refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Unlock Failed" })
    } finally {
      setIsUnlocking(false)
    }
  }

  const isUnlocked = !!profile?.visitors_unlocked || profile?.is_admin || profile?.is_support

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-[#3BC1A8] z-10 shadow-lg text-white">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Visitors</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-8 pb-20 relative">
        {isLoading || isUserLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-4">
            {visitors.length > 0 ? (
              <div className="space-y-4">
                {visitors.map((v) => (
                  <div key={v.id} onClick={() => isUnlocked && router.push(`/profile/${v.visitor_id}`)} className={cn("bg-gray-50 border border-gray-100 p-4 rounded-[2rem] flex items-center gap-4", isUnlocked ? "cursor-pointer" : "cursor-default")}>
                    <Avatar className={cn("w-14 h-14 border-2 border-white shadow-sm", !isUnlocked && "blur-sm")}>
                      <AvatarImage src={v.photo} className="object-cover" />
                      <AvatarFallback className="bg-primary text-white font-black">{v.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className={cn("text-sm font-black text-gray-900 leading-tight", !isUnlocked && "blur-[4px]")}>{isUnlocked ? v.username : "Someone"}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{v.timestamp ? format(new Date(v.timestamp), "MMM d, HH:mm") : "Recently"}</p>
                    </div>
                    {isUnlocked && <ArrowRight className="w-4 h-4 text-gray-300" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 opacity-30"><Eye className="w-12 h-12" /><p className="text-[10px] font-black uppercase tracking-widest">No visitors yet</p></div>
            )}
          </div>
        )}

        {!isUnlocked && !isLoading && !isUserLoading && (
          <div className="fixed inset-0 top-[88px] z-20 bg-white/40 backdrop-blur-md flex items-center justify-center p-8">
            <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-gray-100 text-center space-y-8 w-full max-w-sm">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto border-4 border-white shadow-lg"><Lock className="w-8 h-8 text-primary" /></div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black font-headline text-gray-900">Who's viewing you?</h2>
                <p className="text-sm text-gray-500 font-medium">Unlock your visitor list to see who has been checking out your profile.</p>
              </div>
              <Button onClick={handleUnlock} disabled={isUnlocking} className="w-full h-16 rounded-full bg-zinc-900 text-white font-black text-lg gap-3">
                {isUnlocking ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>Unlock for {UNLOCK_COST} Coins</span>}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
