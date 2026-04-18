'use server';

/**
 * @fileOverview Optimized Server actions for PesaPal V3 integration.
 * Handles authentication, IPN registration, and order submission.
 * Saves a 'pending' record to Firestore before redirecting.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, collection, setDoc, updateDoc, runTransaction, increment, getDoc, getDocs, query, where } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

const PESAPAL_URL = 'https://pay.pesapal.com/v3';
const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;

// Simple in-memory cache for IPN ID to speed up transactions
let cachedIpnId: string | null = null;
let tokenCache: { token: string; expiry: number } | null = null;

async function getAuthToken() {
  if (tokenCache && Date.now() < tokenCache.expiry) {
    return tokenCache.token;
  }

  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error('PesaPal Consumer Key or Secret is missing in environment variables.');
  }

  const response = await fetch(`${PESAPAL_URL}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET,
    }),
    cache: 'no-store',
  });

  const data = await response.json();
  if (!data.token) {
    throw new Error(data.message || 'Failed to get PesaPal token.');
  }
  
  tokenCache = { token: data.token, expiry: Date.now() + 25 * 60 * 1000 }; // Cache for 25 mins
  return data.token;
}

async function registerIPN(token: string) {
  if (cachedIpnId) return cachedIpnId;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://matchflow-beta.vercel.app';
  const ipnUrl = `${baseUrl}/api/pesapal-ipn`;
  
  try {
    const listResponse = await fetch(`${PESAPAL_URL}/api/URLSetup/GetIpnList`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (listResponse.ok) {
      const ipns = await listResponse.json();
      if (Array.isArray(ipns)) {
        const existing = ipns.find((item: any) => item.url === ipnUrl);
        if (existing && existing.ipn_id) {
          cachedIpnId = existing.ipn_id;
          return existing.ipn_id;
        }
      }
    }

    const response = await fetch(`${PESAPAL_URL}/api/URLSetup/RegisterIPN`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        url: ipnUrl,
        ipn_notification_type: 'POST',
      }),
      cache: 'no-store',
    });

    const data = await response.json();
    if (data.ipn_id) {
      cachedIpnId = data.ipn_id;
    }
    return data.ipn_id || null;
  } catch (error) {
    console.error('PesaPal IPN Registration Error:', error);
    return null;
  }
}

export async function initializePesaPalTransaction(email: string, amount: number, metadata: any) {
  try {
    if (!CONSUMER_KEY) {
      return { error: 'PesaPal API keys are not configured.' };
    }

    const token = await getAuthToken();
    const ipnId = await registerIPN(token);

    if (!ipnId) {
      return { error: 'PesaPal could not provide a Notification ID.' };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://matchflow-beta.vercel.app';
    const shortId = Date.now().toString().slice(-10);
    const merchantRef = `MF${shortId}`;

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);
    
    // 1. Create a mapping for background processing (IPN source of truth)
    const mapRef = doc(db, "pendingPayments", merchantRef);
    await setDoc(mapRef, {
      userId: metadata.userId,
      packageAmount: metadata.packageAmount,
      merchantRef: merchantRef,
      createdAt: new Date().toISOString(),
      status: "pending"
    });

    const orderData = {
      id: merchantRef,
      currency: 'KES',
      amount: Number(amount),
      description: `MatchFlow Coin Recharge (${metadata.packageAmount} coins)`,
      callback_url: `${baseUrl}/recharge/callback/pesapal`,
      notification_id: ipnId,
      billing_address: {
        email_address: email,
        first_name: "MatchFlow",
        last_name: "Customer",
        line_1: "Nairobi",
        city: "Nairobi",
        country_code: "KE"
      },
    };

    const response = await fetch(`${PESAPAL_URL}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(orderData),
      cache: 'no-store',
    });

    const result = await response.json();
    
    if (result.redirect_url) {
      // Update the map with the real tracking ID so the client can find it easily
      await updateDoc(mapRef, { orderTrackingId: result.order_tracking_id });
      
      return { redirect_url: result.redirect_url, order_tracking_id: result.order_tracking_id };
    } else {
      return { error: result.message || 'Failed to submit order to PesaPal' };
    }
  } catch (error: any) {
    console.error('PesaPal Transaction Error:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}

export async function getPesaPalTransactionStatus(orderTrackingId: string) {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${PESAPAL_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    return await response.json();
  } catch (error) {
    console.error('PesaPal Status Error:', error);
    return { error: 'Failed to verify PesaPal transaction status' };
  }
}

/**
 * Authoritative Server Confirmation
 * This function can be called by either the IPN route or the UI callback.
 * It performs the coin award logic purely on the server.
 */
export async function processServerPaymentConfirmation(orderTrackingId: string) {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const db = getFirestore(app);

  try {
    const result = await getPesaPalTransactionStatus(orderTrackingId);
    
    // Status Code 1 is 'Completed'
    if (result.status_code === 1 || result.payment_status_description === 'Completed') {
      const merchantRef = result.merchant_reference;
      const mapRef = doc(db, "pendingPayments", merchantRef);
      const mapSnap = await getDoc(mapRef);
      
      if (!mapSnap.exists()) return { status: 'error', message: 'Mapping not found' };

      const paymentData = mapSnap.data();
      if (paymentData.status === 'completed') return { status: 'already_processed' };

      const targetUserId = paymentData.userId;
      const coinsToGain = paymentData.packageAmount;

      if (targetUserId) {
        const userRef = doc(db, "userProfiles", targetUserId);
        
        await runTransaction(db, async (transaction) => {
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
            type: "recharge",
            amount: coinsToGain,
            orderTrackingId: orderTrackingId,
            merchant_reference: merchantRef,
            transactionDate: new Date().toISOString(),
            description: `Coin Recharge (${coinsToGain} coins)`
          });
        });
        
        return { status: 'success', coins: coinsToGain };
      }
    }
    
    return { status: 'pending', result };
  } catch (err) {
    console.error("[Server Confirmation] Error:", err);
    return { status: 'error', error: err };
  }
}
