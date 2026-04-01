"use client"

import { useEffect, useRef, use, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useFirebase, useUser, useMemoFirebase } from "@/firebase"
import { doc, runTransaction, collection } from "firebase/firestore"
import { getPesaPalTransactionStatus } from "@/app/actions/pesapal"
import { useToast } from "@/hooks/use-toast"

function PesaPalCallbackContent({ searchParams }: { searchParams: Promise<any> }) {
  const params = use(searchParams)
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore } = useFirebase()
  const { toast } = useToast()
  const processedRef = useRef(false)

  const orderTrackingId = params.OrderTrackingId

  const userProfileDocRef = useMemoFirebase(() => {
    if (!firestore || !currentUser) return null;
    return doc(firestore, "userProfiles", currentUser.uid);
  }, [firestore, currentUser]);

  useEffect(() => {
    if (!orderTrackingId) {
      router.replace("/recharge");
      return;
    }

    if (!currentUser || !firestore || !userProfileDocRef || processedRef.current) return;

    const handleVerification = async () => {
      processedRef.current = true;
      
      try {
        const result = await getPesaPalTransactionStatus(orderTrackingId);
        
        // PesaPal status 1 is Completed/Success
        if (result.status_code === 1 || result.payment_status_description === 'Completed') {
          // PesaPal order details
          const amount = result.amount;
          // Calculate coins (assuming 1 KES = 10 coins as per package logic)
          const coinsToGain = amount * 10;

          await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userProfileDocRef);
            if (!userDoc.exists()) throw new Error("Profile not found");
            
            const currentBalance = userDoc.data().coinBalance || 0;
            const newBalance = currentBalance + coinsToGain;
            
            transaction.update(userProfileDocRef, {
              coinBalance: newBalance,
              updatedAt: new Date().toISOString()
            });

            const txRef = doc(collection(userProfileDocRef, "transactions"));
            transaction.set(txRef, {
              id: txRef.id,
              type: "recharge",
              amount: coinsToGain,
              transactionDate: new Date().toISOString(),
              description: `Coin Recharge via PesaPal (Ref: ${orderTrackingId})`
            });
          });

          toast({ title: "Success", description: "PesaPal payment verified successfully!" });
          router.replace("/recharge?status=success");
        } else {
          toast({ variant: "destructive", title: "Pending/Failed", description: "Transaction is not completed yet." });
          router.replace("/recharge?status=error");
        }
      } catch (error) {
        console.error("PesaPal Verification error:", error);
        router.replace("/recharge?status=error");
      }
    };

    handleVerification();
  }, [orderTrackingId, currentUser, firestore, userProfileDocRef, router, toast]);

  return (
    <div className="min-h-svh bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-blue-500 rounded-[2rem] flex items-center justify-center animate-pulse">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
        <div className="absolute -inset-4 bg-blue-500/10 rounded-full blur-3xl -z-10" />
      </div>
      <h2 className="text-2xl font-black font-headline text-gray-900 mb-2">Verifying PesaPal Payment</h2>
      <p className="text-sm font-medium text-gray-400 uppercase tracking-widest max-w-[200px]">
        Please wait while we confirm your transaction...
      </p>
    </div>
  )
}

export default function PesaPalCallbackPage({ searchParams }: { searchParams: Promise<any> }) {
  return (
    <Suspense fallback={
      <div className="min-h-svh flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    }>
      <PesaPalCallbackContent searchParams={searchParams} />
    </Suspense>
  )
}
