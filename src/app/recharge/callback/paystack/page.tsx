
"use client"

import { useEffect, useRef, use, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useFirebase, useUser, useMemoFirebase } from "@/firebase"
import { doc, runTransaction, collection, query, where, getDocs, updateDoc, increment as firestoreIncrement, setDoc } from "firebase/firestore"
import { verifyPaystackTransaction } from "@/app/actions/paystack"
import { useToast } from "@/hooks/use-toast"
import { getVipLevelFromExp } from "@/app/profile/vip/page"

function PaystackCallbackContent({ searchParams }: { searchParams: Promise<any> }) {
  const params = use(searchParams)
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore } = useFirebase()
  const { toast } = useToast()
  const processedRef = useRef(false)

  const reference = params.reference

  const userProfileDocRef = useMemoFirebase(() => {
    if (!firestore || !currentUser) return null;
    return doc(firestore, "userProfiles", currentUser.uid);
  }, [firestore, currentUser]);

  useEffect(() => {
    if (!reference) {
      router.replace("/recharge");
      return;
    }

    if (!currentUser || !firestore || !userProfileDocRef || processedRef.current) return;

    const handleVerification = async () => {
      processedRef.current = true;
      
      try {
        const result = await verifyPaystackTransaction(reference);
        
        if (result.status === true && result.data.status === 'success') {
          const amountInSubunits = result.data.amount;
          const metadata = result.data.metadata;
          const coinsToGain = metadata?.packageAmount || (amountInSubunits / 100);
          const expToGain = coinsToGain; // 1 Coin = 1 EXP

          await runTransaction(firestore, async (transaction) => {
            const profileSnap = await transaction.get(userProfileDocRef);
            if (!profileSnap.exists()) return;

            const txQuery = query(collection(userProfileDocRef, "transactions"), where("orderTrackingId", "==", reference));
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
              orderTrackingId: reference,
              transactionDate: new Date().toISOString(),
              description: `Coin Recharge (${coinsToGain} coins) + VIP EXP gained`
            });
          });

          toast({ title: "Success", description: "Payment verified successfully!" });
          router.replace("/recharge?status=success");
        } else {
          toast({ variant: "destructive", title: "Failed", description: result.data?.gateway_response || "Transaction not successful." });
          router.replace("/recharge?status=error");
        }
      } catch (error) {
        console.error("Verification error:", error);
        router.replace("/recharge?status=error");
      }
    };

    handleVerification();
  }, [reference, currentUser, firestore, userProfileDocRef, router, toast]);

  return (
    <div className="min-h-svh bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center animate-pulse">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
        <div className="absolute -inset-4 bg-primary/10 rounded-full blur-3xl -z-10" />
      </div>
      <h2 className="text-2xl font-black font-headline text-gray-900 mb-2">Finalizing Payment</h2>
      <p className="text-sm font-medium text-gray-400 uppercase tracking-widest max-w-[200px]">
        Returning to wallet...
      </p>
    </div>
  )
}

export default function PaystackCallbackPage({ searchParams }: { searchParams: Promise<any> }) {
  return (
    <Suspense fallback={
      <div className="min-h-svh flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <PaystackCallbackContent searchParams={searchParams} />
    </Suspense>
  )
}
