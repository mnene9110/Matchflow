
import { NextResponse } from 'next/server';
import { getPesaPalTransactionStatus } from '@/app/actions/pesapal';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, runTransaction, collection, query, where, getDocs, increment } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { getVipLevelFromExp } from '@/app/profile/vip/page';

/**
 * @fileOverview Functional PesaPal IPN listener.
 * Receives payment notifications and updates Firestore reliably including VIP status.
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

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);

    const result = await getPesaPalTransactionStatus(orderTrackingId);
    
    if (result.status_code === 1 || result.payment_status_description === 'Completed') {
      const amount = result.amount;
      const merchantRef = result.merchant_reference;
      
      // Calculate coins and EXP
      const coinsToGain = Math.round((amount / 120) * 1000);
      const expToGain = coinsToGain;

      // Find the user associated with this merchant reference
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
          const profileSnap = await transaction.get(userRef);
          if (!profileSnap.exists()) return;

          // Check if already processed
          const txQuery = query(collection(userRef, "transactions"), where("pesapal_tracking_id", "==", orderTrackingId));
          const existingTx = await getDocs(txQuery);
          if (!existingTx.empty) return;

          const currentExp = (profileSnap.data().vipExp || 0) + expToGain;
          const newLevel = getVipLevelFromExp(currentExp);

          transaction.update(userRef, {
            coinBalance: increment(coinsToGain),
            vipExp: increment(expToGain),
            vipLevel: newLevel,
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
            description: `Auto-verified Recharge (${coinsToGain} coins) + VIP EXP`
          });
        });
        
        console.log(`✅ Credited ${coinsToGain} coins and EXP to user ${targetUserId} via IPN`);
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
