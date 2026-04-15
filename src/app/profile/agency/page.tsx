
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, Building2, Clock, CheckCircle2, LogOut, Wallet, ArrowRight, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useUser, useDoc, useMemoFirebase, useFirebase } from "@/firebase"
import { doc, updateDoc, getDoc, setDoc, collection, addDoc, serverTimestamp, deleteDoc, getDocs, query, limit, runTransaction, increment } from "firebase/firestore"
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
  const { user: currentUser } = useUser()
  const { firestore } = useFirebase()
  const { toast } = useToast()
  
  const userRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser?.uid])
  const { data: profile, isLoading } = useDoc(userRef)

  const [agencyId, setAgencyId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState("")

  const isSaturday = new Date().getDay() === 6;

  const handleSubmit = async () => {
    if (!agencyId.trim() || !currentUser || !firestore) {
      toast({ variant: "destructive", title: "Missing ID", description: "Please enter an agency ID." })
      return
    }

    setIsSubmitting(true)
    try {
      const aid = agencyId.trim();
      const agencyRef = doc(firestore, "agencies", aid)
      const agencySnap = await getDoc(agencyRef)

      if (!agencySnap.exists()) {
        toast({ variant: "destructive", title: "Invalid ID", description: "This Agency ID does not exist." })
        setIsSubmitting(false)
        return
      }

      const membersSnap = await getDocs(query(collection(firestore, "agencies", aid, "members"), limit(101)));
      if (membersSnap.size >= 99) {
        toast({ variant: "destructive", title: "Agency Full", description: "This agency has reached its maximum capacity." });
        setIsSubmitting(false);
        return;
      }

      await setDoc(doc(firestore, "agencies", aid, "requests", currentUser.uid), {
        userId: currentUser.uid,
        username: profile?.username || "User",
        photo: profile?.profilePhotoUrls?.[0] || "",
        numericId: profile?.numericId || "",
        timestamp: serverTimestamp()
      })

      await updateDoc(doc(firestore, "userProfiles", currentUser.uid), {
        agencyJoinStatus: "pending",
        memberOfAgencyId: aid,
        updatedAt: new Date().toISOString()
      })

      toast({ title: "Application Sent", description: "Wait for the agent to review your request." })
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to submit application." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLeaveAgency = async () => {
    if (!currentUser || !profile?.memberOfAgencyId || !firestore) return
    setIsSubmitting(true)
    try {
      const aid = profile.memberOfAgencyId
      await deleteDoc(doc(firestore, "agencies", aid, "members", currentUser.uid))

      await updateDoc(doc(firestore, "userProfiles", currentUser.uid), {
        agencyJoinStatus: "none",
        memberOfAgencyId: null,
        updatedAt: new Date().toISOString()
      })

      toast({ title: "Left Agency", description: "You are no longer a member." })
    } catch (e) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWithdrawRequest = async () => {
    const amountKes = Number(withdrawAmount);
    if (!amountKes || amountKes <= 0 || !currentUser || !profile?.memberOfAgencyId || !firestore) return
    
    // Logic: 1000 diamonds = 80 KES
    const diamondsNeeded = Math.round((amountKes / 80) * 1000);

    if ((profile.diamondBalance || 0) < diamondsNeeded) {
      toast({ variant: "destructive", title: "Insufficient Diamonds", description: `You need ${diamondsNeeded.toLocaleString()} diamonds for this amount.` });
      return;
    }

    setIsSubmitting(true)
    try {
      const aid = profile.memberOfAgencyId
      const withdrawalsRef = collection(firestore, "agencies", aid, "withdrawals")
      
      await runTransaction(firestore, async (transaction) => {
        const snap = await transaction.get(userRef!);
        const currentDiamonds = snap.data()?.diamondBalance || 0;
        
        if (currentDiamonds < diamondsNeeded) throw new Error("INSUFFICIENT_DIAMONDS");

        // Deduct diamonds immediately
        transaction.update(userRef!, {
          diamondBalance: increment(-diamondsNeeded),
          updatedAt: new Date().toISOString()
        });

        // Add transaction log
        const txRef = doc(collection(userRef!, "transactions"));
        transaction.set(txRef, {
          id: txRef.id,
          type: "agency_withdrawal",
          amount: -diamondsNeeded,
          kesAmount: amountKes,
          transactionDate: new Date().toISOString(),
          description: `Withdrawal request for ${amountKes} KES`
        });

        // Create the withdrawal record for the agent
        const withdrawDocRef = doc(withdrawalsRef);
        transaction.set(withdrawDocRef, {
          id: withdrawDocRef.id,
          userId: currentUser.uid,
          username: profile.username,
          photo: profile.profilePhotoUrls?.[0] || "",
          amount: amountKes,
          diamondsDeducted: diamondsNeeded,
          status: 'pending',
          timestamp: serverTimestamp()
        });
      });

      toast({ title: "Request Sent", description: "Diamonds deducted. The agent will notify you when paid." })
      setShowWithdrawDialog(false)
      setWithdrawAmount("")
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to submit", description: e.message === "INSUFFICIENT_DIAMONDS" ? "Not enough diamonds." : "Error occurred." })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="flex h-svh items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  if (profile?.agencyJoinStatus === 'approved') {
    return (
      <div className="flex flex-col h-svh bg-white text-gray-900 font-body">
        <header className="px-4 py-6 flex items-center border-b border-gray-50 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 bg-gray-50 rounded-full"><ChevronLeft className="w-6 h-6" /></Button>
          <h1 className="flex-1 text-center text-sm font-black uppercase tracking-widest mr-10">My Agency</h1>
        </header>
        <main className="flex-1 p-8 space-y-10">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-24 h-24 bg-green-50 rounded-[2.5rem] flex items-center justify-center border-4 border-green-100">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black font-headline text-gray-900">Official Member</h2>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                Diamonds: <span className="font-bold text-gray-900">{(profile.diamondBalance || 0).toLocaleString()}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <button 
                onClick={() => isSaturday && setShowWithdrawDialog(true)} 
                disabled={!isSaturday}
                className={cn(
                  "w-full h-20 border rounded-[2rem] flex items-center px-6 gap-4 active:scale-95 transition-all shadow-sm",
                  isSaturday ? "bg-green-50 border-green-100 text-green-600" : "bg-gray-50 border-gray-100 text-gray-400 opacity-60"
                )}
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", isSaturday ? "bg-green-500/10" : "bg-gray-200")}>
                  <Wallet className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[10px] font-black uppercase block tracking-widest">Withdrawal</span>
                  <span className="text-sm font-black">{isSaturday ? "Request Agency Payout" : "Only on Saturdays"}</span>
                </div>
                {isSaturday && <ArrowRight className="w-5 h-5" />}
              </button>
              {!isSaturday && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-100">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Withdrawals open on Saturdays only</span>
                </div>
              )}
            </div>

            <button onClick={handleLeaveAgency} disabled={isSubmitting} className="w-full h-20 bg-red-50 border border-red-100 rounded-[2rem] flex items-center px-6 gap-4 active:scale-95 transition-all text-red-600">
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center"><LogOut className="w-6 h-6" /></div>
              <div className="flex-1 text-left"><span className="text-[10px] font-black uppercase text-red-400/60 block tracking-widest">Membership</span><span className="text-sm font-black">Leave Agency Anchor</span></div>
            </button>
          </div>
        </main>

        <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
          <DialogContent className="rounded-[2.5rem] bg-white border-none p-8 max-w-[85%] mx-auto shadow-2xl">
            <DialogHeader><DialogTitle className="text-xl font-black font-headline text-gray-900 text-center uppercase tracking-widest">Withdraw Request</DialogTitle></DialogHeader>
            <div className="py-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate</span>
                <span className="text-xs font-black text-gray-900">1000 💎 = 80 KES</span>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Amount (KES)</Label>
                <Input type="number" placeholder="Enter amount in KES" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="h-14 rounded-2xl bg-gray-50 border-none font-black text-lg px-6" />
              </div>
              {withdrawAmount && (
                <p className="text-[10px] font-black text-center text-primary uppercase">
                  Deducts {Math.round((Number(withdrawAmount) / 80) * 1000).toLocaleString()} Diamonds
                </p>
              )}
            </div>
            <DialogFooter className="flex flex-col gap-2">
              <Button onClick={handleWithdrawRequest} disabled={!withdrawAmount || isSubmitting} className="h-14 rounded-full bg-zinc-900 text-white font-black uppercase text-xs tracking-widest w-full">Confirm & Deduct</Button>
              <Button variant="ghost" onClick={() => setShowWithdrawDialog(false)} className="h-12 rounded-full text-gray-400 font-black uppercase text-[10px]">Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (profile?.agencyJoinStatus === 'pending') {
    return (
      <div className="flex flex-col h-svh bg-white text-gray-900 font-body">
        <header className="px-4 py-6 flex items-center border-b border-gray-50 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 bg-gray-50 rounded-full"><ChevronLeft className="w-6 h-6" /></Button>
          <h1 className="flex-1 text-center text-sm font-black uppercase tracking-widest mr-10">Application Status</h1>
        </header>
        <main className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-24 h-24 bg-amber-50 rounded-[2.5rem] flex items-center justify-center border-4 border-amber-100 animate-pulse">
            <Clock className="w-12 h-12 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black font-headline text-gray-900">Pending Review</h2>
            <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-[240px]">
              The agent is reviewing your request. You'll be notified once approved.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900 font-body">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-white z-10 border-b border-gray-50 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-gray-900 h-10 w-10 bg-gray-50 rounded-full hover:bg-gray-100"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="flex-1 text-center text-sm font-black uppercase tracking-widest mr-10">Join the anchor</h1>
      </header>

      <main className="flex-1 p-8 space-y-10">
        <div className="space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center"><Building2 className="w-8 h-8 text-primary" /></div>
          <h2 className="text-3xl font-black font-headline text-gray-900 tracking-tight">Agency ID</h2>
          <div className="relative"><Input placeholder="Please enter the agency ID" value={agencyId} onChange={(e) => setAgencyId(e.target.value)} className="h-14 bg-transparent border-0 border-b-2 border-gray-100 rounded-none px-0 text-lg font-medium focus-visible:ring-0 focus-visible:border-primary placeholder:text-gray-300" /></div>
          <p className="text-[13px] text-gray-400 font-medium leading-relaxed max-w-[300px]">After approval, you will join the official team.</p>
        </div>
        <div className="pt-20"><Button onClick={handleSubmit} disabled={isSubmitting || !agencyId.trim()} className="w-full h-16 rounded-full bg-primary text-white font-black text-lg shadow-2xl active:scale-95 transition-all">{isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Apply for Membership"}</Button></div>
      </main>
    </div>
  )
}
