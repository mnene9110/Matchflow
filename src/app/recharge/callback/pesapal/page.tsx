"use client"

import { useEffect, useState, useRef, use, Suspense, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Coins } from "lucide-react"
import { useFirebase, useUser, useMemoFirebase } from "@/firebase"
import { doc, collection, query, where, onSnapshot } from "firebase/firestore"
import { processServerPaymentConfirmation } from "@/app/actions/pesapal"
import { Button } from "@/components/ui/button"

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

  const handleManualReturn = useCallback(() => {
    // replace() ensures this screen is wiped from history
    router.replace('/recharge');
  }, [router]);

  // 1. Listen for background updates (The SERVER is the authority)
  useEffect(() => {
    if (!firestore || !orderTrackingId || processedRef.current) return;

    // Listen to the mapping collection for the status change triggered by the server IPN
    const q = query(collection(firestore, "pendingPayments"), where("orderTrackingId", "==", orderTrackingId));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        if (data.status === 'completed' && !processedRef.current) {
          processedRef.current = true;
          setCoinsAwarded(data.packageAmount);
          setStatus('success');
        }
      }
    });

    return () => unsub();
  }, [firestore, orderTrackingId]);

  // 2. Initial Fallback Check (Trigger server logic if IPN is slow)
  useEffect(() => {
    if (!orderTrackingId) {
      setStatus('error');
      setErrorMsg("Missing Order Tracking ID.");
      return;
    }

    const triggerServerConfirmation = async () => {
      if (processedRef.current) return;
      const res = await processServerPaymentConfirmation(orderTrackingId);
      if (res.status === 'success' && !processedRef.current) {
        processedRef.current = true;
        setCoinsAwarded(res.coins || 0);
        setStatus('success');
      } else if (res.status === 'error') {
        // We don't set error immediately, let polling/IPN continue for a bit
        console.warn("Server-side fallback check failed", res.error);
      }
    };

    // Check once immediately, then once more after 5 seconds if not yet finished
    triggerServerConfirmation();
    const timer = setTimeout(triggerServerConfirmation, 5000);

    // Timeout after 60 seconds
    const timeout = setTimeout(() => {
      if (!processedRef.current && status === 'verifying') {
        setStatus('error');
        setErrorMsg("Taking longer than usual. Please check your wallet in a moment.");
      }
    }, 60000);

    return () => {
      clearTimeout(timer);
      clearTimeout(timeout);
    };
  }, [orderTrackingId, status]);

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
              Confirming through server... This will only take a moment.
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
