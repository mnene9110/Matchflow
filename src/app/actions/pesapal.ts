'use server';

/**
 * @fileOverview Server actions for PesaPal V3 Production integration.
 * Handles authentication and live transaction initiation.
 */

const PESAPAL_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://pay.pesapal.com/v3' 
  : 'https://pay.pesapal.com/v3'; // Hardcoded to production as requested

async function getAuthToken() {
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error('PesaPal credentials are not configured.');
  }

  const response = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to authenticate with PesaPal');
  }

  const data = await response.json();
  return data.token;
}

export async function initiatePesaPalPayment(amount: number, email: string, userId: string) {
  try {
    const token = await getAuthToken();
    const ipnId = process.env.PESAPAL_IPN_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';

    if (!ipnId) {
      console.warn('PESAPAL_IPN_ID is missing. Transactions might not be automatically verified.');
    }
    
    const orderData = {
      id: `MF_${Date.now()}_${userId.slice(0, 4)}`,
      currency: "KES",
      amount: amount,
      description: "MatchFlow Coins Purchase",
      callback_url: `${appUrl}/coins?status=success`,
      notification_id: ipnId || "",
      billing_address: {
        email_address: email,
      }
    };

    const response = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit PesaPal order');
    }

    const data = await response.json();
    return { redirect_url: data.redirect_url, order_tracking_id: data.order_tracking_id };
  } catch (error: any) {
    console.error('PesaPal Production Error:', error);
    return { error: error.message || 'Payment service currently unavailable' };
  }
}
