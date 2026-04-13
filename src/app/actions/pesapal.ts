
'use server';

/**
 * @fileOverview Optimized Server actions for PesaPal V3 integration.
 * Handles authentication, IPN registration, and order submission.
 * Saves a 'pending' record to Firestore before redirecting.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, collection, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

const PESAPAL_URL = 'https://pay.pesapal.com/v3';
const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;

// Simple in-memory cache for IPN ID to speed up transactions
let cachedIpnId: string | null = null;

async function getAuthToken() {
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
  return data.token;
}

async function registerIPN(token: string) {
  if (cachedIpnId) return cachedIpnId;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://matchflow-12.vercel.app';
  const ipnUrl = `${baseUrl}/api/pesapal-ipn`;
  
  try {
    // First, check if IPN is already registered to avoid redundant API calls
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

    // If not found, register it
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://matchflow-12.vercel.app';
    const shortId = Date.now().toString().slice(-10);
    const merchantRef = `MF${shortId}`;

    // Initialize Firebase for pre-saving transaction
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);
    const txRef = doc(collection(db, "userProfiles", metadata.userId, "transactions"));
    
    // Save record asynchronously to not block the redirect
    setDoc(txRef, {
      id: txRef.id,
      type: "recharge_pending",
      amount: metadata.packageAmount,
      orderTrackingId: merchantRef,
      transactionDate: new Date().toISOString(),
      description: `Initiated Recharge (${metadata.packageAmount} coins)`,
      status: "pending"
    }).catch(e => console.error("Firestore background save failed", e));

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
