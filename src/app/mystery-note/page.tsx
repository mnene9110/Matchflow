"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Send, Users, Loader2, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const RECIPIENT_OPTIONS = [3, 5, 10, 20]
const COST_PER_PERSON = 10

export default function MysteryNotePage() {
  const router = useRouter()
  const { user, profile } = useSupabaseUser()
  const { toast } = useToast()

  const [messageText, setMessageText] = useState("")
  const [recipientCount, setRecipientCount] = useState<number>(3)
  const [isSending, setIsSending] = useState(false)

  const totalCost = recipientCount * COST_PER_PERSON

  const handleSend = async () => {
    if (!user || !profile || !messageText.trim() || isSending) return

    if ((profile.coin_balance || 0) < totalCost) {
      toast({ variant: "destructive", title: "Insufficient Coins", description: "Please recharge to send notes." });
      return;
    }

    setIsSending(true)
    try {
      const targetGender = (profile.gender || 'male').toLowerCase() === 'male' ? 'female' : 'male'
      
      // 1. Fetch potential targets (online of opposite gender)
      const { data: potentialTargets, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('gender', targetGender)
        .eq('is_online', true)
        .neq('id', user.id)
        .limit(recipientCount);

      if (userError || !potentialTargets || potentialTargets.length === 0) {
        throw new Error("NO_USERS_ONLINE")
      }

      // 2. SECURE PAYMENT: Use RPC to deduct coins on server
      const { error: paymentError } = await supabase.rpc('secure_mystery_note_payment', {
        p_count: potentialTargets.length
      });

      if (paymentError) throw paymentError;

      // 3. Send notes (Standard inserts for real-time delivery)
      const noteText = `🤫 Mystery Note: ${messageText}`;
      
      for (const target of potentialTargets) {
        const chatId = [user.id, target.id].sort().join("_");
        
        await supabase.from('chats').upsert({
          id: chatId,
          participants: [user.id, target.id],
          last_message: noteText,
          last_message_at: new Date().toISOString()
        });

        await supabase.from('messages').insert({
          chat_id: chatId,
          sender_id: user.id,
          message_text: noteText
        });
      }

      toast({ title: "Mystery Sent!", description: `Broadcasted to ${potentialTargets.length} online people.` })
      router.back()
    } catch (error: any) {
      if (error.message === "NO_USERS_ONLINE") {
        toast({ variant: "destructive", title: "No users found", description: "No online users of the opposite gender were found." })
      } else if (error.message.includes('INSUFFICIENT_FUNDS')) {
        toast({ variant: "destructive", title: "Insufficient Coins" });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to send mystery note." })
      }
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col h-svh bg-[#3BC1A8] text-gray-900 overflow-hidden relative">
      <header className="px-4 py-8 flex items-center sticky top-0 z-50 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full"><ChevronLeft className="w-6 h-6" /></Button>
        <div className="ml-4 flex flex-col"><h1 className="text-xl font-black font-headline tracking-widest uppercase text-white">Leave a message</h1></div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-4 pb-40 space-y-10 flex flex-col">
        <section className="bg-white p-8 rounded-[3rem] shadow-2xl flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-black font-headline text-gray-900 leading-tight">Tell me a secret <span className="text-4xl">🤫</span>..</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-full"><Coins className="w-3.5 h-3.5 text-amber-600" /><span className="text-[10px] font-black text-amber-700 uppercase">{COST_PER_PERSON} coins/person</span></div>
              <div className="flex items-center gap-2">
                <Select value={recipientCount.toString()} onValueChange={(v) => setRecipientCount(Number(v))}>
                  <SelectTrigger className="h-8 border-none bg-primary/10 rounded-full px-3 text-[10px] font-black text-primary"><SelectValue placeholder="3" /></SelectTrigger>
                  <SelectContent className="rounded-2xl border-none">
                    {RECIPIENT_OPTIONS.map(num => (<SelectItem key={num} value={num.toString()}>{num} People</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex-1 relative flex flex-col">
            <Textarea placeholder="Write down your joys/secrets.." value={messageText} onChange={(e) => setMessageText(e.target.value.slice(0, 500))} className="flex-1 min-h-[200px] rounded-[2rem] bg-gray-50 border-none text-lg font-medium p-8 resize-none" />
          </div>

          <Button onClick={handleSend} disabled={isSending || !messageText.trim()} className="w-full h-18 rounded-full bg-zinc-900 text-white font-black text-xl shadow-2xl transition-all gap-3">
            {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>Send to {recipientCount} People</span>}
          </Button>
        </section>
      </main>
    </div>
  )
}
