"use client"

import { useEffect, useRef, use, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { useFirebase } from "@/firebase/provider"
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from "firebase/firestore"
import { verifyPaystackTransaction } from "@/app/actions/paystack"
import { useToast } from "@/hooks/use-toast"

function PaystackCallbackContent({ searchParams }: { searchParams: Promise<any> }) {
  const params = use(searchParams)
  const router = useRouter()
  const { firestore } = useFirebase()
  const { user: currentUser, profile } = useSupabaseUser()
  const { toast } = useToast()
  const processedRef = useRef(false)
  const reference = params.reference

  useEffect(() => {
    if (!reference || !currentUser || !profile || processedRef.current) return;
    
    const handleVerification = async () => {
      processedRef.current = true;
      try {
        const result = await verifyPaystackTransaction(reference);
        if (result.status === true && result.data.status === 'success') {
          const metadata = result.data.metadata;
          const coinsToGain = metadata?.packageAmount || Math.round(result.data.amount / 100);
          
          const profileRef = doc(firestore, "userProfiles", currentUser.uid);
          await updateDoc(profileRef, {
            coinBalance: increment(coinsToGain),
            updatedAt: serverTimestamp()
          });

          await addDoc(collection(firestore, `userProfiles/${currentUser.uid}/transactions`), {
            type: "recharge",
            amount: coinsToGain,
            description: `Paystack Recharge`,
            transactionDate: new Date().toISOString()
          });

          toast({ title: "Recharge Success!", description: "Coins updated." });
          router.replace("/recharge?status=success");
        } else {
          router.replace("/recharge?status=error");
        }
      } catch (error) {
        console.error("Paystack callback error:", error);
        router.replace("/recharge?status=error");
      }
    };
    handleVerification();
  }, [reference, currentUser, profile, firestore, router, toast]);

  return (
    <div className="min-h-svh bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center animate-pulse mb-8"><Loader2 className="w-12 h-12 text-white animate-spin" /></div>
      <h2 className="text-2xl font-black text-gray-900 mb-2">Finalizing Payment</h2>
      <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Returning to wallet...</p>
    </div>
  )
}

export default function PaystackCallbackPage({ searchParams }: { searchParams: Promise<any> }) {
  return (
    <Suspense fallback={<div className="min-h-svh flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
      <PaystackCallbackContent searchParams={searchParams} />
    </Suspense>
  )
}
