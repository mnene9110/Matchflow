
"use client"

import { useEffect, useRef, use, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useFirebase, useUser, useMemoFirebase } from "@/firebase"
import { doc, runTransaction as runFirestoreTransaction, collection, getDocs, query, where, increment as firestoreIncrement } from "firebase/firestore"
import { ref, runTransaction as runRtdbTransaction } from "firebase/database"
import { getPesaPalTransactionStatus } from "@/app/actions/pesapal"
import { useToast } from "@/hooks/use-toast"

function PesaPalCallbackContent({ searchParams }: { searchParams: Promise<any> }) {
  const params = use(searchParams)
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore, database } = useFirebase()
  const { toast } = useToast()
  const processedRef = useRef(false)

  const orderTrackingId = params.OrderTrackingId

  const userProfileDocRef = useMemoFirebase(() => {
    if (!firestore || !currentUser) return null;
    return doc(firestore, "userProfiles", currentUser.uid);
  }, [firestore, currentUser]);

  useEffect(() => {
    if (!orderTrackingId || !currentUser || !firestore || !database || !userProfileDocRef || processedRef.current) return;

    const handleVerification = async () => {
      processedRef.current = true;
      try {
        const result = await getPesaPalTransactionStatus(orderTrackingId);
        
        if (result.status_code === 1 || result.payment_status_description === 'Completed') {
          const amount = result.amount;
          const coinsToGain = Math.round((amount / 120) * 1000);

          // 1. RTDB Primary Update
          const coinRef = ref(database, `users/${currentUser.uid}/coinBalance`);
          await runRtdbTransaction(coinRef, (current) => (current || 0) + coinsToGain);

          // 2. Firestore Backup Sync & Log
          await runFirestoreTransaction(firestore, async (transaction) => {
            const txQuery = query(collection(userProfileDocRef, "transactions"), where("orderTrackingId", "==", orderTrackingId));
            const existingTx = await getDocs(txQuery);
            if (!existingTx.empty) return;

            transaction.update(userProfileDocRef, {
              coinBalance: firestoreIncrement(coinsToGain),
              updatedAt: new Date().toISOString()
            });

            const txRef = doc(collection(userProfileDocRef, "transactions"));
            transaction.set(txRef, {
              id: txRef.id,
              type: "recharge",
              amount: coinsToGain,
              orderTrackingId: orderTrackingId,
              transactionDate: new Date().toISOString(),
              description: `Coin Recharge (${coinsToGain} coins) via PesaPal`
            });
          });

          toast({ title: "Payment Verified", description: "Wallet updated successfully." });
          router.replace("/recharge?status=success");
        } else {
          router.replace("/recharge?status=error");
        }
      } catch (error) {
        console.error("Payment error:", error);
        router.replace("/recharge?status=error");
      }
    };

    handleVerification();
  }, [orderTrackingId, currentUser, firestore, database, userProfileDocRef, router, toast]);

  return (
    <div className="min-h-svh bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center animate-pulse mb-8">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
      <h2 className="text-2xl font-black font-headline text-gray-900 mb-2">Verifying Transaction</h2>
      <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Returning to wallet soon...</p>
    </div>
  )
}

export default function PesaPalCallbackPage({ searchParams }: { searchParams: Promise<any> }) {
  return (
    <Suspense fallback={<div className="min-h-svh flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
      <PesaPalCallbackContent searchParams={searchParams} />
    </Suspense>
  )
}
