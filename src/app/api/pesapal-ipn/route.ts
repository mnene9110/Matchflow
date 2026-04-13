import { NextResponse } from 'next/server';
import { getPesaPalTransactionStatus } from '@/app/actions/pesapal';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, runTransaction, collection, query, where, getDocs, increment } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Functional PesaPal IPN listener.
 * Receives payment notifications and updates Firestore reliably.
 */

export async function POST(req: Request) {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    
    const orderTrackingId = params.get('OrderTrackingId');
    const notificationType = params.get('OrderNotificationType');

    console.log("🔥 PESAPAL IPN RECEIVED:", { orderTrackingId, notificationType });

    if (!orderTrackingId || notificationType !== 'IPNCHANGE') {
      return new Response("OK", { status: 200 });
    }

    // Initialize Firebase for the server-side environment
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);

    // 1. Fetch the latest status from PesaPal
    const result = await getPesaPalTransactionStatus(orderTrackingId);
    
    if (result.status_code === 1 || result.payment_status_description === 'Completed') {
      const amount = result.amount;
      const merchantRef = result.merchant_reference; // This matches the MF... ID we generated
      
      // Calculate coins (120 KES = 1000 coins approx)
      const coinsToGain = Math.round((amount / 120) * 1000);

      // 2. Find the user who owns this transaction
      // We search for a transaction with this Merchant Reference (MF...)
      const usersSnap = await getDocs(collection(db, "userProfiles"));
      let targetUserId = null;

      for (const userDoc of usersSnap.docs) {
        const txQuery = query(collection(db, "userProfiles", userDoc.id, "transactions"), where("orderTrackingId", "==", merchantRef));
        const txSnap = await getDocs(txQuery);
        if (!txSnap.empty) {
          targetUserId = userDoc.id;
          break;
        }
      }

      if (targetUserId) {
        const userRef = doc(db, "userProfiles", targetUserId);
        
        await runTransaction(db, async (transaction) => {
          // Check if already processed by the callback
          const txQuery = query(collection(userRef, "transactions"), where("pesapal_tracking_id", "==", orderTrackingId));
          const existingTx = await getDocs(txQuery);
          if (!existingTx.empty) return;

          transaction.update(userRef, {
            coinBalance: increment(coinsToGain),
            updatedAt: new Date().toISOString()
          });

          const txRef = doc(collection(userRef, "transactions"));
          transaction.set(txRef, {
            id: txRef.id,
            type: "recharge_ipn",
            amount: coinsToGain,
            pesapal_tracking_id: orderTrackingId,
            merchant_reference: merchantRef,
            transactionDate: new Date().toISOString(),
            description: `Auto-verified Recharge (${coinsToGain} coins)`
          });
        });
        
        console.log(`✅ Credited ${coinsToGain} coins to user ${targetUserId} via IPN`);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("IPN ERROR:", err);
    return new Response("ERROR", { status: 500 });
  }
}

export async function GET() {
  return new Response("IPN endpoint active", { status: 200 });
}
