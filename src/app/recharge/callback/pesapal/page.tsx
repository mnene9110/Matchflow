"use client"

import { useEffect, useState, useRef, use, Suspense, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Coins } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { processServerPaymentConfirmation } from "@/app/actions/pesapal"
import { Button } from "@/components/ui/button"

function PesaPalCallbackContent({ searchParams }: { searchParams: Promise<any> }) {
  const params = use(searchParams)
  const router = useRouter()
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [coinsAwarded, setCoinsAwarded] = useState(0)
  const [errorMsg, setErrorMsg] = useState("")
  const [countdown, setCountdown] = useState(3)
  
  const orderTrackingId = params.OrderTrackingId
  const processedRef = useRef(false)
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleManualReturn = useCallback(() => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    router.replace('/profile');
  }, [router]);

  // Authoritative Server Check
  useEffect(() => {
    if (!orderTrackingId) {
      setStatus('error');
      setErrorMsg("Missing Order Tracking ID.");
      return;
    }

    let interval: NodeJS.Timeout;

    const triggerServerConfirmation = async () => {
      if (processedRef.current) return;
      
      try {
        const res = await processServerPaymentConfirmation(orderTrackingId);
        if (res.status === 'success' || res.status === 'already_processed') {
          processedRef.current = true;
          if (res.coins) setCoinsAwarded(res.coins);
          setStatus('success');
        }
      } catch (e) {
        console.error("Verification failed, will retry...");
      }
    };

    triggerServerConfirmation();
    interval = setInterval(triggerServerConfirmation, 2500);

    const timeout = setTimeout(() => {
      if (!processedRef.current && status === 'verifying') {
        setStatus('error');
        setErrorMsg("Taking longer than usual. Please check your wallet in a moment.");
      }
    }, 45000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [orderTrackingId, status]);

  // Real-time Supabase Listener for the payment status
  useEffect(() => {
    if (!orderTrackingId || processedRef.current) return;

    const channel = supabase
      .channel('payment_sync')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pending_payments',
        filter: `order_tracking_id=eq.${orderTrackingId}`
      }, (payload) => {
        if (payload.new.status === 'completed' && !processedRef.current) {
          processedRef.current = true;
          setCoinsAwarded(payload.new.package_amount);
          setStatus('success');
        }
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn("Real-time channel failed - checking table existence.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderTrackingId]);

  // Automatic Redirect
  useEffect(() => {
    if (status === 'success') {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleManualReturn();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, handleManualReturn]);

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-8 text-center overflow-hidden">
      {status === 'verifying' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center animate-pulse">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black font-headline text-gray-900">Confirming...</h2>
            <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-[240px] mx-auto">
              Finalizing your transaction.
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
            <h2 className="text-3xl font-black font-headline text-gray-900">Success!</h2>
            <div className="flex items-center justify-center gap-2 bg-amber-50 px-4 py-2 rounded-full border border-amber-100 mx-auto w-fit">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-lg font-black text-amber-700">Coins Awarded</span>
            </div>
          </div>
          <div className="flex flex-col gap-4 items-center">
            <Button 
              onClick={handleManualReturn} 
              className="h-16 w-full min-w-[200px] rounded-full bg-zinc-900 text-white font-black text-lg shadow-xl active:scale-95 transition-all"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </Button>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Auto-redirecting in {countdown}s...
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
            <h2 className="text-2xl font-black font-headline text-gray-900">Verification Pending</h2>
            <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-[240px] mx-auto">
              {errorMsg || "Your coins may take a moment to reflect. Please check your wallet in a moment."}
            </p>
          </div>
          <Button 
            onClick={handleManualReturn} 
            variant="ghost"
            className="h-14 w-full max-w-[200px] rounded-full text-gray-400 font-black uppercase text-xs tracking-widest"
          >
            Go to Profile
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