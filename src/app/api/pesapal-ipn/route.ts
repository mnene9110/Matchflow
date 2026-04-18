
import { NextResponse } from 'next/server';
import { getPesaPalTransactionStatus } from '@/app/actions/pesapal';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, runTransaction, collection, increment, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Background Payment Confirmation (IPN)
 * Handles awarding coins even if the user leaves the app.
 */

export async function POST(req: Request) {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const orderTrackingId = params.get('OrderTrackingId');
    const notificationType = params.get('OrderNotificationType');

    console.log(`[IPN] Received notification: ${orderTrackingId} (${notificationType})`);

    // PesaPal sends IPNCHANGE when status is updated
    if (!orderTrackingId || notificationType !== 'IPNCHANGE') {
      return NextResponse.json({ status: 200, message: "Handled" });
    }

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);
    
    // 1. Verify status with PesaPal
    const result = await getPesaPalTransactionStatus(orderTrackingId);
    
    // Status Code 1 is 'Completed'
    if (result.status_code === 1 || result.payment_status_description === 'Completed') {
      const merchantRef = result.merchant_reference;
      
      // 2. Use the map to find the user efficiently
      const mapRef = doc(db, "pendingPayments", merchantRef);
      const mapSnap = await getDoc(mapRef);
      
      if (!mapSnap.exists()) {
        console.error(`[IPN] Payment mapping not found for ref: ${merchantRef}`);
        return NextResponse.json({ status: 200, message: "Mapping not found" });
      }

      const paymentData = mapSnap.data();
      if (paymentData.status === 'completed') {
        console.log(`[IPN] Transaction ${orderTrackingId} already processed.`);
        return NextResponse.json({ status: 200, message: "Already processed" });
      }

      const targetUserId = paymentData.userId;
      const coinsToGain = paymentData.packageAmount;

      if (targetUserId) {
        const userRef = doc(db, "userProfiles", targetUserId);
        
        await runTransaction(db, async (transaction) => {
          // Double check status inside transaction
          const currentMapSnap = await transaction.get(mapRef);
          if (currentMapSnap.data()?.status === 'completed') return;

          const profileSnap = await transaction.get(userRef);
          if (!profileSnap.exists()) return;

          // Update user balance
          transaction.update(userRef, {
            coinBalance: increment(coinsToGain),
            updatedAt: new Date().toISOString()
          });

          // Mark map as completed
          transaction.update(mapRef, { 
            status: 'completed', 
            orderTrackingId: orderTrackingId,
            completedAt: new Date().toISOString() 
          });

          // Log the final transaction
          const txRef = doc(collection(userRef, "transactions"));
          transaction.set(txRef, {
            id: txRef.id,
            type: "recharge_ipn",
            amount: coinsToGain,
            orderTrackingId: orderTrackingId,
            merchant_reference: merchantRef,
            transactionDate: new Date().toISOString(),
            description: `Auto-verified Recharge (${coinsToGain} coins)`
          });
        });
        
        console.log(`[IPN] Successfully awarded ${coinsToGain} coins to ${targetUserId}`);
      }
    }
    
    // PesaPal V3 expects a JSON response with status 200
    return NextResponse.json({
      order_tracking_id: orderTrackingId,
      status: 200
    });
  } catch (err) {
    console.error("[IPN] Process Error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function GET() {
  return new Response("IPN endpoint active", { status: 200 });
}
