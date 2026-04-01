'use server';

/**
 * @fileOverview Server actions for PesaPal V3 integration.
 * Handles authentication, IPN registration, and order submission.
 */

const PESAPAL_URL = 'https://pay.pesapal.com/v3';
const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;

async function getAuthToken() {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error('PesaPal Consumer Key or Secret is missing.');
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
    throw new Error(data.message || 'Failed to get PesaPal token');
  }
  return data.token;
}

async function registerIPN(token: string) {
  const ipnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/pesapal/ipn`;
  
  const response = await fetch(`${PESAPAL_URL}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: 'GET',
    }),
    cache: 'no-store',
  });

  const data = await response.json();
  return data.ipn_id;
}

export async function initializePesaPalTransaction(email: string, amount: number, metadata: any) {
  try {
    const token = await getAuthToken();
    const ipnId = await registerIPN(token);

    if (!ipnId) throw new Error('Could not register IPN ID');

    const orderData = {
      id: `MF-${Date.now()}`,
      currency: 'KES',
      amount: amount,
      description: `MatchFlow Coin Recharge (${metadata.packageAmount} coins)`,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/recharge/callback/pesapal`,
      notification_id: ipnId,
      billing_address: {
        email_address: email,
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
    return { error: error.message || 'An error occurred during PesaPal initialization' };
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
