
'use server';

/**
 * @fileOverview Server actions for PesaPal V3 integration using Firebase.
 */

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, collection, addDoc } from 'firebase/firestore';

const PESAPAL_URL = 'https://pay.pesapal.com/v3';
const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;

let cachedIpnId: string | null = null;
let tokenCache: { token: string; expiry: number } | null = null;

async function getAuthToken() {
  if (tokenCache && Date.now() < tokenCache.expiry) {
    return tokenCache.token;
  }

  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error('PesaPal API keys are missing on the server.');
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
  
  tokenCache = { token: data.token, expiry: Date.now() + 25 * 60 * 1000 };
  return data.token;
}

async function registerIPN(token: string) {
  if (cachedIpnId) return cachedIpnId;
  const ipnUrl = `https://matchflow-beta.vercel.app/api/pesapal-ipn`; // Update if needed
  
  try {
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
    if (data.ipn_id) cachedIpnId = data.ipn_id;
    return data.ipn_id || null;
  } catch (error) {
    return null;
  }
}

export async function initializePesaPalTransaction(email: string, amount: number, metadata: any) {
  try {
    if (!CONSUMER_KEY || !CONSUMER_SECRET) {
      return { error: 'PesaPal API keys are not configured.' };
    }

    const token = await getAuthToken();
    const ipnId = await registerIPN(token);

    if (!ipnId) return { error: 'PesaPal could not provide a Notification ID.' };

    const merchantRef = `MF${Date.now().toString().slice(-10)}`;
    
    const { firestore } = initializeFirebase();
    
    // Store pending payment in Firestore
    await setDoc(doc(firestore, 'pendingPayments', merchantRef), {
      userId: metadata.userId,
      packageAmount: metadata.packageAmount,
      merchantRef: merchantRef,
      status: "pending",
      createdAt: new Date().toISOString()
    });

    const orderData = {
      id: merchantRef,
      currency: 'KES',
      amount: Number(amount),
      description: `MatchFlow Coin Recharge (${metadata.packageAmount} coins)`,
      callback_url: `https://matchflow-beta.vercel.app/recharge/callback/pesapal`,
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
      await updateDoc(doc(firestore, 'pendingPayments', merchantRef), {
        orderTrackingId: result.order_tracking_id
      });
        
      return { redirect_url: result.redirect_url, order_tracking_id: result.order_tracking_id };
    } else {
      return { error: result.message || 'Failed to submit order to PesaPal' };
    }
  } catch (error: any) {
    console.error("Payment init error:", error);
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
    return { error: 'Failed to verify PesaPal transaction status' };
  }
}

export async function processServerPaymentConfirmation(orderTrackingId: string) {
  try {
    const result = await getPesaPalTransactionStatus(orderTrackingId);
    
    if (result.status_code === 1 || result.payment_status_description === 'Completed') {
      const merchantRef = result.merchant_reference;
      const { firestore } = initializeFirebase();
      
      const paymentRef = doc(firestore, 'pendingPayments', merchantRef);
      const paymentSnap = await getDoc(paymentRef);
      
      if (!paymentSnap.exists()) return { status: 'error', message: 'Mapping not found' };
      const paymentData = paymentSnap.data();
      
      if (paymentData.status === 'completed') return { status: 'already_processed', coins: paymentData.packageAmount };

      const targetUserId = paymentData.userId;
      const coinsToGain = paymentData.packageAmount;

      if (targetUserId) {
        const userProfileRef = doc(firestore, 'userProfiles', targetUserId);
        
        await updateDoc(userProfileRef, {
          coinBalance: increment(coinsToGain)
        });

        await updateDoc(paymentRef, { 
          status: 'completed', 
          orderTrackingId: orderTrackingId,
          completedAt: new Date().toISOString() 
        });

        await addDoc(collection(firestore, 'userProfiles', targetUserId, 'transactions'), {
          type: "recharge",
          amount: coinsToGain,
          description: `Coin Recharge (${coinsToGain} coins)`,
          transactionDate: new Date().toISOString()
        });
        
        return { status: 'success', coins: coinsToGain };
      }
    }
    
    return { status: 'pending', result };
  } catch (err) {
    return { status: 'error', error: err };
  }
}
