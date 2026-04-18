"use client"

import { useEffect, useState, useRef, use, Suspense, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Coins } from "lucide-react"
import { useFirebase, useUser, useMemoFirebase } from "@/firebase"
import { doc, runTransaction, collection, getDocs, query, where, increment as firestoreIncrement, getDoc, onSnapshot } from "firebase/firestore"
import { getPesaPalTransactionStatus } from "@/app/actions/pesapal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function PesaPalCallbackContent({ searchParams }: { searchParams: Promise<any> }) {
  const params = use(searchParams)
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore } = useFirebase()
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [coinsAwarded, setCoinsAwarded] = useState(0)
  const [errorMsg, setErrorMsg] = useState("")
  const [countdown, setCountdown] = useState(3)
  
  const orderTrackingId = params.OrderTrackingId
  const processedRef = useRef(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const userProfileDocRef = useMemoFirebase(() => {
    if (!firestore || !currentUser) return null;
    return doc(firestore, "userProfiles", currentUser.uid);
  }, [firestore, currentUser]);

  const handleManualReturn = useCallback(() => {
    // replace() ensures this screen is wiped from history
    router.replace('/recharge');
  }, [router]);

  const verifyPayment = useCallback(async () => {
    if (!orderTrackingId || !currentUser || !firestore || !userProfileDocRef || processedRef.current) return;

    try {
      const result = await getPesaPalTransactionStatus(orderTrackingId);
      
      if (result.status_code === 1 || result.payment_status_description === 'Completed') {
        processedRef.current = true;
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

        const merchantRef = result.merchant_reference;
        const mapRef = doc(firestore, "pendingPayments", merchantRef);
        const mapSnap = await getDoc(mapRef);
        const packageAmount = mapSnap.exists() ? mapSnap.data().packageAmount : 0;

        await runTransaction(firestore, async (transaction) => {
          const profileSnap = await transaction.get(userProfileDocRef);
          if (!profileSnap.exists()) return;

          // Idempotency: Check if already awarded
          const txQuery = query(collection(userProfileDocRef, "transactions"), where("orderTrackingId", "==", orderTrackingId));
          const existingTx = await getDocs(txQuery);
          
          if (existingTx.empty) {
            transaction.update(userProfileDocRef, {
              coinBalance: firestoreIncrement(packageAmount),
              updatedAt: new Date().toISOString()
            });

            const txRef = doc(collection(userProfileDocRef, "transactions"));
            transaction.set(txRef, {
              id: txRef.id,
              type: "recharge",
              amount: packageAmount,
              orderTrackingId: orderTrackingId,
              merchant_reference: merchantRef,
              transactionDate: new Date().toISOString(),
              description: `Coin Recharge (${packageAmount} coins)`
            });
            
            if (mapSnap.exists()) {
              transaction.update(mapRef, { status: 'completed', completedAt: new Date().toISOString() });
            }
          }
        });

        setCoinsAwarded(packageAmount);
        setStatus('success');
      } else if (result.status_code === 2 || result.payment_status_description === 'Failed') {
        processedRef.current = true;
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        setStatus('error');
        setErrorMsg("The payment was cancelled or declined.");
      }
    } catch (error) {
      console.error("Verification error:", error);
    }
  }, [orderTrackingId, currentUser, firestore, userProfileDocRef]);

  // 1. Listen for background updates (IPN might have finished already)
  useEffect(() => {
    if (!firestore || !orderTrackingId || processedRef.current) return;

    // Use the OrderTrackingId to find the pending payment map
    // Since we don't have MerchantRef directly, we'll rely on the polling verifyPayment
    // but we can also listen to the user profile's last transaction
    const unsub = onSnapshot(query(collection(userProfileDocRef!, "transactions"), where("orderTrackingId", "==", orderTrackingId)), (snap) => {
      if (!snap.empty && !processedRef.current) {
        processedRef.current = true;
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        const txData = snap.docs[0].data();
        setCoinsAwarded(txData.amount);
        setStatus('success');
      }
    });

    return () => unsub();
  }, [firestore, orderTrackingId, userProfileDocRef]);

  // 2. Initial check and Polling
  useEffect(() => {
    if (!orderTrackingId) {
      setStatus('error');
      setErrorMsg("Missing Order Tracking ID.");
      return;
    }

    verifyPayment();
    pollingIntervalRef.current = setInterval(verifyPayment, 3000);

    const timeout = setTimeout(() => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (!processedRef.current && status === 'verifying') {
        setStatus('error');
        setErrorMsg("Taking longer than usual. Please check your wallet in a moment.");
      }
    }, 60000);

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      clearTimeout(timeout);
    };
  }, [orderTrackingId, verifyPayment, status]);

  // 3. Automatic Redirect
  useEffect(() => {
    if (status === 'success') {
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleManualReturn();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, handleManualReturn]);

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-8 text-center overflow-hidden">
      {status === 'verifying' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="relative">
            <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center animate-pulse">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black font-headline text-gray-900">Finalizing Payment</h2>
            <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-[240px] mx-auto">
              Checking your transaction status with PesaPal...
            </p>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-8 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-green-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-green-500/20">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black font-headline text-gray-900">Payment Success!</h2>
            <div className="flex items-center justify-center gap-2 bg-amber-50 px-4 py-2 rounded-full border border-amber-100 mx-auto w-fit">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-lg font-black text-amber-700">+{coinsAwarded.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex flex-col gap-4 items-center">
            <Button 
              onClick={handleManualReturn} 
              className="h-16 w-full max-w-[240px] rounded-full bg-zinc-900 text-white font-black text-lg gap-3 shadow-xl active:scale-95 transition-all"
            >
              Finish
              <ArrowRight className="w-5 h-5" />
            </Button>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Closing in {countdown}s...
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="w-20 h-20 bg-red-50 rounded-[2.5rem] flex items-center justify-center mx-auto border border-red-100">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black font-headline text-gray-900">Check Wallet</h2>
            <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-[240px] mx-auto">
              {errorMsg || "We couldn't confirm the live status, but your coins may have already been awarded."}
            </p>
          </div>
          <Button 
            onClick={handleManualReturn} 
            variant="ghost"
            className="h-14 w-full max-w-[200px] rounded-full text-gray-400 font-black uppercase text-xs tracking-widest"
          >
            Go to Wallet
          </Button>
        </div>
      )}
    </div>
  )
}

export default function PesaPalCallbackPage({ searchParams }: { searchParams: Promise<any> }) {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <PesaPalCallbackContent searchParams={searchParams} />
    </Suspense>
  )
}
