"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Sparkles, Send, Users, Loader2, Coins, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, collection, query, where, getDocs, limit, writeBatch, increment as firestoreIncrement, setDoc } from "firebase/firestore"
import { ref, push, update, increment, serverTimestamp as rtdbTimestamp, runTransaction as runRtdbTransaction } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const RECIPIENT_OPTIONS = [3, 5, 10, 20]
const COST_PER_PERSON = 10

export default function MysteryNotePage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore, database } = useFirebase()
  const { toast } = useToast()

  const [messageText, setMessageText] = useState("")
  const [recipientCount, setRecipientCount] = useState<number>(3)
  const [isSending, setIsSending] = useState(false)

  const userProfileRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: profile } = useDoc(userProfileRef)

  const totalCost = recipientCount * COST_PER_PERSON

  const handleSend = async () => {
    if (!currentUser || !profile || !messageText.trim() || isSending || !database) return

    setIsSending(true)
    try {
      // 1. Check Balance & Deduct (Atomic RTDB)
      const userCoinRef = ref(database, `users/${currentUser.uid}/coinBalance`)
      const balanceResult = await runRtdbTransaction(userCoinRef, (current) => {
        if (current === null) return current
        if (current < totalCost) return undefined
        return current - totalCost
      })

      if (!balanceResult.committed) {
        throw new Error("INSUFFICIENT_COINS")
      }

      // 2. Fetch Target Users (Opposite gender, active, limit to count)
      const targetGender = profile.gender?.toLowerCase() === 'male' ? 'female' : 'male'
      
      // Get blocked users first to filter them out
      const blockedQuery = collection(firestore, "userProfiles", currentUser.uid, "blockedUsers")
      const blockedSnap = await getDocs(blockedQuery)
      const blockedIds = new Set(blockedSnap.docs.map(d => d.id))
      blockedIds.add(currentUser.uid) // Don't send to self

      const usersQuery = query(
        collection(firestore, "userProfiles"),
        where("gender", "==", targetGender),
        limit(recipientCount + 50) // Fetch extra to account for filtering
      )
      
      const userSnap = await getDocs(usersQuery)
      const potentialTargets = userSnap.docs
        .map(d => d.id)
        .filter(id => !blockedIds.has(id))
        .slice(0, recipientCount)

      if (potentialTargets.length === 0) {
        throw new Error("NO_USERS_FOUND")
      }

      // 3. Batch Update RTDB (Messages and Chats)
      const rtdbUpdates: any = {}
      
      for (const targetId of potentialTargets) {
        const chatId = [currentUser.uid, targetId].sort().join("_")
        const msgKey = push(ref(database, `chats/${chatId}/messages`)).key
        
        const msgData = {
          messageText: `🤫 Mystery Note: ${messageText}`,
          senderId: currentUser.uid,
          sentAt: rtdbTimestamp(),
          status: 'sent'
        }

        rtdbUpdates[`/chats/${chatId}/messages/${msgKey}`] = msgData
        
        // Update my side
        rtdbUpdates[`/users/${currentUser.uid}/chats/${targetId}`] = {
          lastMessage: msgData.messageText,
          timestamp: rtdbTimestamp(),
          otherUserId: targetId,
          chatId,
          unreadCount: 0,
          hidden: false,
          userHasSent: true // Mark interaction for list visibility
        }

        // Update their side
        rtdbUpdates[`/users/${targetId}/chats/${currentUser.uid}/lastMessage`] = msgData.messageText
        rtdbUpdates[`/users/${targetId}/chats/${currentUser.uid}/timestamp`] = rtdbTimestamp()
        rtdbUpdates[`/users/${targetId}/chats/${currentUser.uid}/otherUserId`] = currentUser.uid
        rtdbUpdates[`/users/${targetId}/chats/${currentUser.uid}/chatId`] = chatId
        rtdbUpdates[`/users/${targetId}/chats/${currentUser.uid}/unreadCount`] = increment(1)
        rtdbUpdates[`/users/${targetId}/chats/${currentUser.uid}/hidden`] = false
      }

      await update(ref(database), rtdbUpdates)

      // 4. Log Transaction in RTDB (Primary)
      const logRef = push(ref(database, `userTransactions/${currentUser.uid}`));
      await set(logRef, {
        id: logRef.key,
        type: "mystery_note",
        amount: -totalCost,
        transactionDate: Date.now(),
        description: `Sent Mystery Note to ${potentialTargets.length} people`
      });

      // Sync roles/balance to RTDB if needed (handled by logic above)
      await update(ref(database, `users/${currentUser.uid}`), {
        coinBalance: profile.coinBalance - totalCost,
        updatedAt: Date.now()
      })

      toast({
        title: "Mystery Sent!",
        description: `Your note was broadcasted to ${potentialTargets.length} people.`,
      })
      router.back()

    } catch (error: any) {
      if (error.message === "INSUFFICIENT_COINS") {
        toast({ variant: "destructive", title: "Insufficient Coins", description: "Recharge to send mystery notes!" })
      } else if (error.message === "NO_USERS_FOUND") {
        toast({ variant: "destructive", title: "No users found", description: "Try again later when more users are online." })
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to send mystery note." })
      }
    } finally {
      setIsSending(false)
    }
  }

  const darkMaroon = "bg-[#5A1010]";

  return (
    <div className="flex flex-col h-svh bg-transparent text-gray-900 overflow-hidden relative font-body">
      {/* Background decoration elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/40 rounded-full blur-3xl -z-10" />

      <header className="px-4 py-8 flex items-center sticky top-0 z-50 shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-gray-900 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div className="ml-4 flex flex-col">
          <h1 className="text-xl font-black font-headline tracking-widest uppercase text-white drop-shadow-sm">Leave a message</h1>
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Share your thoughts anonymously</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-4 pb-40 space-y-10 scroll-smooth flex flex-col">
        <section className="bg-white/60 backdrop-blur-2xl border border-white p-8 rounded-[3rem] shadow-2xl flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-2">
            <h2 className="text-3xl font-black font-headline text-gray-900 leading-tight">
              Tell me a little secret <span className="text-4xl">🤫</span>..
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">{COST_PER_PERSON}coins/person</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-primary/40" />
                <Select value={recipientCount.toString()} onValueChange={(v) => setRecipientCount(Number(v))}>
                  <SelectTrigger className="h-8 border-none bg-primary/10 rounded-full px-3 text-[10px] font-black text-primary focus:ring-0">
                    <SelectValue placeholder="3" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border-none shadow-2xl">
                    {RECIPIENT_OPTIONS.map(num => (
                      <SelectItem key={num} value={num.toString()} className="font-black text-xs">{num} People</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex-1 relative flex flex-col">
            <Textarea 
              placeholder="Write down your joys/annoyances/doubts/little secrets.."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value.slice(0, 500))}
              className="flex-1 min-h-[200px] rounded-[2rem] bg-white border-2 border-primary/5 focus-visible:ring-primary/20 text-lg font-medium p-8 shadow-inner resize-none"
            />
            <div className="absolute bottom-4 right-6">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{messageText.length}/500</span>
            </div>
          </div>

          <div className="pt-4">
            <Button 
              onClick={handleSend}
              disabled={isSending || !messageText.trim()}
              className={cn(
                "w-full h-18 rounded-full text-white font-black text-xl shadow-2xl active:scale-95 transition-all gap-3 overflow-hidden relative",
                darkMaroon
              )}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Broadcasting...</span>
                </>
              ) : (
                <>
                  <span>Send to {recipientCount} People</span>
                  <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="text-xs">{totalCost}</span>
                  </div>
                </>
              )}
            </Button>
            <div className="mt-6 flex items-center justify-center gap-2 opacity-40">
              <Lock className="w-3 h-3" />
              <p className="text-[9px] font-black uppercase tracking-[0.2em]">Encrypted Delivery</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
