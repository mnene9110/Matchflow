
"use client"

import { useEffect, useRef, use, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useFirebase, useUser, useMemoFirebase } from "@/firebase"
import { doc, runTransaction, collection, getDocs, query, where } from "firebase/firestore"
import { getPesaPalTransactionStatus } from "@/app/actions/pesapal"
import { useToast } from "@/hooks/use-toast"

/**
 * @fileOverview Secure callback handler for PesaPal payments.
 * Uses Firestore transactions and idempotency checks to prevent multiple credits.
 */

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
        // SERVER-SIDE CHECK: Verify status directly with PesaPal API using secret keys
        const result = await getPesaPalTransactionStatus(orderTrackingId);
        
        // PesaPal status 1 is Completed/Success
        if (result.status_code === 1 || result.payment_status_description === 'Completed') {
          const amount = result.amount;
          // Security: Calculate coins based on the amount PAID, not a client-provided value
          const coinsToGain = Math.round((amount / 120) * 1000);

          await runTransaction(firestore, async (transaction) => {
            // IDEMPOTENCY CHECK: Ensure this specific orderTrackingId hasn't been credited yet
            // This prevents users from bypassing payment by simply reloading the success URL
            const txQuery = query(
              collection(userProfileDocRef, "transactions"), 
              where("orderTrackingId", "==", orderTrackingId)
            );
            const existingTx = await getDocs(txQuery);
            
            if (!existingTx.empty) {
              console.warn("Transaction already processed. Bypassing balance update.");
              return;
            }

            const userDoc = await transaction.get(userProfileDocRef);
            if (!userDoc.exists()) throw new Error("Profile not found");
            
            const currentBalance = userDoc.data().coinBalance || 0;
            const newBalance = currentBalance + coinsToGain;
            
            transaction.update(userProfileDocRef, {
              coinBalance: newBalance,
              updatedAt: new Date().toISOString()
            });

            // LOG TRANSACTION: Record the recharge for history and idempotency
            const txRef = doc(collection(userProfileDocRef, "transactions"));
            transaction.set(txRef, {
              id: txRef.id,
              type: "recharge",
              amount: coinsToGain,
              orderTrackingId: orderTrackingId, // Storing this is critical for security
              transactionDate: new Date().toISOString(),
              description: `Coin Recharge (${coinsToGain} coins)`
            });
          });

          toast({ title: "Payment Verified", description: "Your wallet has been updated successfully." });
          router.replace("/recharge?status=success");
        } else {
          toast({ variant: "destructive", title: "Verification Failed", description: "This transaction was not completed." });
          router.replace("/recharge?status=error");
        }
      } catch (error) {
        console.error("Payment security check error:", error);
        router.replace("/recharge?status=error");
      }
    };

    handleVerification();
  }, [orderTrackingId, currentUser, firestore, userProfileDocRef, router, toast]);

  return (
    <div className="min-h-svh bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center animate-pulse">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
        <div className="absolute -inset-4 bg-primary/10 rounded-full blur-3xl -z-10" />
      </div>
      <h2 className="text-2xl font-black font-headline text-gray-900 mb-2">Securing Transaction</h2>
      <p className="text-sm font-medium text-gray-400 uppercase tracking-widest max-w-[220px]">
        Verifying your payment with PesaPal...
      </p>
    </div>
  )
}

export default function PesaPalCallbackPage({ searchParams }: { searchParams: Promise<any> }) {
  return (
    <Suspense fallback={
      <div className="min-h-svh flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <PesaPalCallbackContent searchParams={searchParams} />
    </Suspense>
  )
}
