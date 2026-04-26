"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Building2, 
  Loader2, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Copy,
  CheckCircle,
  ArrowRight,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const PAGE_SIZE = 20
const MAX_AGENCY_MEMBERS = 100

export default function AgentCenterPage() {
  const router = useRouter()
  const { user: currentUser, profile } = useSupabaseUser()
  const { toast } = useToast()

  const [agencyName, setAgencyName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isInitialMembersLoading, setIsInitialMembersLoading] = useState(true)

  useEffect(() => {
    if (!profile?.agency_id) return

    const aid = profile.agency_id;

    // Listen to Requests
    const reqChannel = supabase.channel(`agency_reqs_${aid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agency_requests', filter: `agency_id=eq.${aid}` }, async () => {
        const { data } = await supabase.from('agency_requests').select('*').eq('agency_id', aid);
        setPendingRequests(data || []);
      })
      .subscribe();

    // Listen to Withdrawals
    const withChannel = supabase.channel(`agency_with_${aid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agency_withdrawals', filter: `agency_id=eq.${aid}` }, async () => {
        const { data } = await supabase.from('agency_withdrawals').select('*').eq('agency_id', aid);
        setWithdrawals(data || []);
      })
      .subscribe();

    const fetchInitial = async () => {
      const { data: reqs } = await supabase.from('agency_requests').select('*').eq('agency_id', aid);
      setPendingRequests(reqs || []);

      const { data: withs } = await supabase.from('agency_withdrawals').select('*').eq('agency_id', aid);
      setWithdrawals(withs || []);

      const { data: mems } = await supabase.from('profiles').select('*').eq('member_of_agency_id', aid).limit(PAGE_SIZE);
      setMembers(mems || []);
      setIsInitialMembersLoading(false);
    }
    fetchInitial();

    return () => {
      supabase.removeChannel(reqChannel);
      supabase.removeChannel(withChannel);
    }
  }, [profile?.agency_id])

  const handleCreateAgency = async () => {
    if (!agencyName.trim() || !currentUser) return
    setIsCreating(true)
    try {
      const generatedId = Math.random().toString(36).substring(2, 8).toUpperCase()
      
      const { error: agencyError } = await supabase
        .from('agencies')
        .insert({
          id: generatedId,
          name: agencyName,
          agent_id: currentUser.id,
          member_count: 1
        });

      if (agencyError) throw agencyError;

      await supabase
        .from('profiles')
        .update({ agency_id: generatedId })
        .eq('id', currentUser.id);

      toast({ title: "Agency Created", description: `Your Agency ID is: ${generatedId}` })
    } catch (e) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsCreating(false)
    }
  }

  const handleRequestAction = async (userId: string, action: 'approved' | 'rejected', requestId: string) => {
    if (!profile?.agency_id || processingId) return
    
    setProcessingId(userId)
    try {
      if (action === 'approved') {
        await supabase.from('profiles').update({
          agency_join_status: 'approved',
          member_of_agency_id: profile.agency_id
        }).eq('id', userId);
      } else {
        await supabase.from('profiles').update({
          agency_join_status: 'none',
          member_of_agency_id: null
        }).eq('id', userId);
      }

      await supabase.from('agency_requests').delete().eq('id', requestId);
      toast({ title: action === 'approved' ? "User Approved" : "User Rejected" })
    } catch (e) {
      toast({ variant: "destructive", title: "Action failed" })
    } finally {
      setProcessingId(null)
    }
  }

  const handleMarkAsPaid = async (withdrawal: any) => {
    if (!profile?.agency_id || !currentUser || processingId) return
    setProcessingId(withdrawal.id)
    try {
      const feedbackText = "✅ Your withdrawal request has been paid through the agency anchor."
      const chatId = [withdrawal.user_id, currentUser.id].sort().join("_")

      await supabase.from('agency_withdrawals').update({ status: 'paid' }).eq('id', withdrawal.id);

      await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: currentUser.id,
        message_text: feedbackText
      });

      toast({ title: "Paid", description: "Member notified via chat." })
    } catch (e) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setProcessingId(null)
    }
  }

  if (profile && !profile.is_agent) {
    return <div className="flex h-svh items-center justify-center bg-white text-zinc-400 font-black uppercase text-xs tracking-widest">Access Denied</div>
  }

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900 overflow-y-auto">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-[#3BC1A8] z-10 text-white shadow-lg">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Agent Center</h1>
      </header>

      <main className="flex-1 p-6 space-y-8 pb-32">
        {!profile?.agency_id ? (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-4"><div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center"><Building2 className="w-8 h-8 text-purple-600" /></div><h2 className="text-3xl font-black font-headline text-gray-900">Create your Agency</h2><p className="text-sm text-gray-500 font-medium leading-relaxed">As an official agent, you can manage members and payouts.</p></div>
            <div className="space-y-4"><Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Agency Name</Label><Input placeholder="e.g., Global Star Anchor" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} className="h-14 rounded-2xl bg-gray-50 border-none font-bold" /></div>
            <Button onClick={handleCreateAgency} disabled={isCreating || !agencyName.trim()} className="w-full h-16 rounded-full bg-purple-600 text-white font-black text-lg shadow-xl active:scale-95 transition-all">{isCreating ? <Loader2 className="w-6 h-6 animate-spin" /> : "Create & Generate ID"}</Button>
          </section>
        ) : (
          <div className="space-y-8">
            <section className="bg-zinc-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10"><Building2 className="w-32 h-32" /></div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/10"><Building2 className="w-5 h-5 text-purple-400" /></div><span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Your Agency</span></div>
                </div>
                <div><h2 className="text-2xl font-black font-headline uppercase truncate">{profile.username}'s Team</h2><button onClick={() => { navigator.clipboard.writeText(profile.agency_id); toast({ title: "Copied" }); }} className="flex items-center gap-2 mt-2 px-4 py-2 bg-white/10 rounded-full border border-white/5 active:scale-95 transition-all"><span className="text-xs font-black uppercase tracking-widest text-purple-200">ID: {profile.agency_id}</span><Copy className="w-3.5 h-3.5 text-purple-400" /></button></div>
              </div>
            </section>

            <Tabs defaultValue="requests" className="w-full">
              <TabsList className="w-full bg-gray-100 p-1.5 h-14 rounded-full mb-6">
                <TabsTrigger value="requests" className="flex-1 rounded-full text-[10px] font-black h-full">Requests</TabsTrigger>
                <TabsTrigger value="members" className="flex-1 rounded-full text-[10px] font-black h-full">Members</TabsTrigger>
                <TabsTrigger value="withdrawals" className="flex-1 rounded-full text-[10px] font-black h-full">Payouts</TabsTrigger>
              </TabsList>

              <TabsContent value="requests" className="space-y-4">
                {pendingRequests.map(req => (
                  <div key={req.id} className="bg-gray-50 p-4 rounded-[2rem] flex items-center justify-between">
                    <div className="flex items-center gap-3"><Avatar className="w-12 h-12"><AvatarImage src={req.photo} /><AvatarFallback>{req.username?.[0]}</AvatarFallback></Avatar><div><p className="text-sm font-black">{req.username}</p><p className="text-[9px] font-bold text-gray-400 uppercase">ID: {req.numeric_id}</p></div></div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleRequestAction(req.user_id, 'rejected', req.id)} disabled={!!processingId} className="w-10 h-10 rounded-full bg-red-50 text-red-500"><XCircle className="w-5 h-5" /></Button>
                      <Button size="icon" onClick={() => handleRequestAction(req.user_id, 'approved', req.id)} disabled={!!processingId} className="w-10 h-10 rounded-full bg-green-500 text-white"><CheckCircle2 className="w-5 h-5" /></Button>
                    </div>
                  </div>
                ))}
                {pendingRequests.length === 0 && <p className="py-10 text-center opacity-30 text-[10px] font-black">No requests</p>}
              </TabsContent>

              <TabsContent value="members" className="space-y-4">
                {members.map(member => (
                  <div key={member.id} className="bg-white border border-gray-100 p-4 rounded-[2.25rem] flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3"><Avatar className="w-12 h-12"><AvatarImage src={member.profile_photo_urls?.[0]} /><AvatarFallback>{member.username?.[0]}</AvatarFallback></Avatar><div><p className="text-sm font-black">{member.username}</p></div></div>
                    <Button size="sm" variant="ghost" onClick={() => router.push(`/chat/${member.id}`)} className="h-10 px-4 rounded-full bg-primary/5 text-primary font-black text-[9px]">Chat</Button>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="withdrawals" className="space-y-4">
                {withdrawals.map(w => (
                  <div key={w.id} className="bg-white border border-gray-100 p-5 rounded-[2.25rem] space-y-4 shadow-sm">
                    <div className="flex justify-between items-center"><div className="flex items-center gap-3"><Avatar className="w-10 h-10"><AvatarImage src={w.photo} /><AvatarFallback>{w.username?.[0]}</AvatarFallback></Avatar><div><p className="text-xs font-black">{w.username}</p></div></div><div className="text-right"><p className="text-sm font-black text-green-600">{w.amount} KES</p><span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full", w.status === 'paid' ? "bg-green-50 text-green-500" : "bg-amber-50 text-amber-500")}>{w.status}</span></div></div>
                    {w.status !== 'paid' && <Button onClick={() => handleMarkAsPaid(w)} disabled={!!processingId} className="w-full h-12 rounded-full bg-zinc-900 text-white font-black text-xs">Confirm Paid</Button>}
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  )
}