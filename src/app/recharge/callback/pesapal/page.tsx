
"use client"

import { useEffect, useRef, use, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useFirebase, useUser, useMemoFirebase } from "@/firebase"
import { doc, runTransaction, collection, getDocs, query, where, increment as firestoreIncrement } from "firebase/firestore"
import { getPesaPalTransactionStatus } from "@/app/actions/pesapal"
import { useToast } from "@/hooks/use-toast"
import { getVipLevelFromExp } from "@/app/profile/vip/page"

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
    if (!orderTrackingId || !currentUser || !firestore || !userProfileDocRef || processedRef.current) return;

    const handleVerification = async () => {
      processedRef.current = true;
      try {
        const result = await getPesaPalTransactionStatus(orderTrackingId);
        
        if (result.status_code === 1 || result.payment_status_description === 'Completed') {
          const amount = result.amount;
          const coinsToGain = Math.round((amount / 120) * 1000);
          const expToGain = coinsToGain; // 1 Coin = 1 EXP

          await runTransaction(firestore, async (transaction) => {
            const profileSnap = await transaction.get(userProfileDocRef);
            if (!profileSnap.exists()) return;

            // Check if already processed
            const txQuery = query(collection(userProfileDocRef, "transactions"), where("orderTrackingId", "==", orderTrackingId));
            const existingTx = await getDocs(txQuery);
            if (!existingTx.empty) return;

            const currentExp = (profileSnap.data().vipExp || 0) + expToGain;
            const newLevel = getVipLevelFromExp(currentExp);

            transaction.update(userProfileDocRef, {
              coinBalance: firestoreIncrement(coinsToGain),
              vipExp: firestoreIncrement(expToGain),
              vipLevel: newLevel,
              updatedAt: new Date().toISOString()
            });

            const txRef = doc(collection(userProfileDocRef, "transactions"));
            transaction.set(txRef, {
              id: txRef.id,
              type: "recharge",
              amount: coinsToGain,
              orderTrackingId: orderTrackingId,
              transactionDate: new Date().toISOString(),
              description: `Coin Recharge (${coinsToGain} coins) + VIP EXP gained`
            });
          });

          toast({ title: "Payment Verified", description: "Wallet and VIP status updated!" });
          router.replace("/recharge?status=success");
        } else {
          toast({ variant: "destructive", title: "Payment Pending", description: "Your payment is being processed or was cancelled." });
          router.replace("/recharge?status=error");
        }
      } catch (error) {
        console.error("Payment error:", error);
        router.replace("/recharge?status=error");
      }
    };

    handleVerification();
  }, [orderTrackingId, currentUser, firestore, userProfileDocRef, router, toast]);

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
