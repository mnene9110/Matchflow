"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, Building2, Clock, CheckCircle2, LogOut, Wallet, ArrowRight, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFirebase } from "@/firebase/provider"
import { doc, getDoc, updateDoc, addDoc, collection, runTransaction, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export default function JoinAgencyPage() {
  const router = useRouter()
  const { firestore } = useFirebase()
  const { user: currentUser, profile } = useSupabaseUser()
  const { toast } = useToast()
  
  const [agencyId, setAgencyId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState("")

  const isSaturday = new Date().getDay() === 6;

  const handleSubmit = async () => {
    if (!agencyId.trim() || !currentUser) {
      toast({ variant: "destructive", title: "Missing ID" })
      return
    }

    setIsSubmitting(true)
    try {
      const aid = agencyId.trim().toUpperCase();
      const agencyRef = doc(firestore, 'agencies', aid);
      const agencySnap = await getDoc(agencyRef);

      if (!agencySnap.exists()) {
        toast({ variant: "destructive", title: "Invalid ID", description: "Agency not found." })
        setIsSubmitting(false)
        return
      }

      await addDoc(collection(firestore, "agency_requests"), {
        agencyId: aid,
        userId: currentUser.id,
        username: profile?.username,
        photo: profile?.profilePhotoUrls?.[0] || "",
        numericId: profile?.numericId,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(firestore, "userProfiles", currentUser.id), {
        agencyJoinStatus: "pending",
        memberOfAgencyId: aid
      });

      toast({ title: "Application Sent" })
    } catch (error) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWithdrawRequest = async () => {
    const amountKes = Number(withdrawAmount);
    if (!amountKes || amountKes <= 0 || !currentUser || !profile?.memberOfAgencyId) return
    
    const diamondsNeeded = Math.round((amountKes / 80) * 1000);

    if ((profile.diamondBalance || 0) < diamondsNeeded) {
      toast({ variant: "destructive", title: "Insufficient Diamonds" });
      return;
    }

    setIsSubmitting(true)
    try {
      await runTransaction(firestore, async (transaction) => {
        const profileRef = doc(firestore, "userProfiles", currentUser.id);
        const profDoc = await transaction.get(profileRef);
        if (!profDoc.exists()) throw new Error("Profile not found");

        const currentDiamonds = profDoc.data().diamondBalance || 0;
        if (currentDiamonds < diamondsNeeded) throw new Error("INSUFFICIENT_DIAMONDS");

        transaction.update(profileRef, { diamondBalance: currentDiamonds - diamondsNeeded });

        const transRef = doc(collection(firestore, `userProfiles/${currentUser.id}/transactions`));
        transaction.set(transRef, {
          type: "agency_withdrawal",
          amount: -diamondsNeeded,
          description: `Withdrawal request for ${amountKes} KES`,
          transactionDate: new Date().toISOString()
        });

        const requestRef = doc(collection(firestore, "agency_withdrawals"));
        transaction.set(requestRef, {
          agencyId: profile.memberOfAgencyId,
          userId: currentUser.id,
          username: profile.username,
          photo: profile.profilePhotoUrls?.[0] || "",
          amount: amountKes,
          diamondsDeducted: diamondsNeeded,
          status: "pending",
          createdAt: serverTimestamp()
        });
      });

      toast({ title: "Request Sent" })
      setShowWithdrawDialog(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (profile?.agencyJoinStatus === 'approved') {
    return (
      <div className="flex flex-col h-svh bg-white text-gray-900">
        <header className="px-4 py-6 flex items-center border-b border-gray-50 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 bg-gray-50 rounded-full"><ChevronLeft className="w-6 h-6" /></Button>
          <h1 className="flex-1 text-center text-sm font-black uppercase tracking-widest mr-10">My Agency</h1>
        </header>
        <main className="flex-1 p-8 space-y-10">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-24 h-24 bg-green-50 rounded-[2.5rem] flex items-center justify-center border-4 border-green-100"><CheckCircle2 className="w-12 h-12 text-green-500" /></div>
            <div><h2 className="text-3xl font-black font-headline text-gray-900">Official Member</h2><p className="text-sm text-gray-500">Diamonds: {(profile.diamondBalance || 0).toLocaleString()}</p></div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button onClick={() => isSaturday && setShowWithdrawDialog(true)} disabled={!isSaturday} className={cn("w-full h-20 border rounded-[2rem] flex items-center px-6 gap-4 shadow-sm", isSaturday ? "bg-green-50 border-green-100 text-green-600" : "bg-gray-50 border-gray-100 text-gray-400 opacity-60")}>
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", isSaturday ? "bg-green-500/10" : "bg-gray-200")}><Wallet className="w-6 h-6" /></div>
              <div className="flex-1 text-left"><span className="text-[10px] font-black uppercase block">Withdrawal</span><span className="text-sm font-black">{isSaturday ? "Request Payout" : "Saturdays Only"}</span></div>
              {isSaturday && <ArrowRight className="w-5 h-5" />}
            </button>
          </div>
        </main>

        <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
          <DialogContent className="rounded-[2.5rem] bg-white border-none p-8 max-w-[85%] mx-auto shadow-2xl">
            <DialogHeader><DialogTitle className="text-xl font-black font-headline text-center uppercase">Withdraw Request</DialogTitle></DialogHeader>
            <div className="py-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center"><span className="text-[10px] font-black text-gray-400 uppercase">Rate</span><span className="text-xs font-black">1000 💎 = 80 KES</span></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Amount (KES)</Label><Input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="h-14 rounded-2xl bg-gray-50 border-none font-black text-lg px-6" /></div>
            </div>
            <DialogFooter className="flex flex-col gap-2">
              <Button onClick={handleWithdrawRequest} disabled={!withdrawAmount || isSubmitting} className="h-14 rounded-full bg-zinc-900 text-white font-black uppercase text-xs w-full">Confirm & Deduct</Button>
              <Button variant="ghost" onClick={() => setShowWithdrawDialog(false)} className="h-12 rounded-full text-gray-400 font-black uppercase text-[10px]">Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900">
      <header className="px-4 py-6 flex items-center border-b border-gray-50 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-gray-900 h-10 w-10 bg-gray-50 rounded-full"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="flex-1 text-center text-sm font-black uppercase tracking-widest mr-10">Join the anchor</h1>
      </header>

      <main className="flex-1 p-8 space-y-10">
        <div className="space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center"><Building2 className="w-8 h-8 text-primary" /></div>
          <h2 className="text-3xl font-black font-headline text-gray-900">Agency ID</h2>
          <Input placeholder="Enter Agency ID" value={agencyId} onChange={(e) => setAgencyId(e.target.value.toUpperCase())} className="h-14 bg-transparent border-0 border-b-2 border-gray-100 rounded-none px-0 text-lg font-medium focus-visible:ring-0 focus-visible:border-primary" />
        </div>
        <div className="pt-20"><Button onClick={handleSubmit} disabled={isSubmitting || !agencyId.trim()} className="w-full h-16 rounded-full bg-primary text-white font-black text-lg shadow-2xl active:scale-95 transition-all">Apply for Membership</Button></div>
      </main>
    </div>
  )
}
