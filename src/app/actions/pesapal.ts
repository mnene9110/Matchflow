
'use server';

/**
 * @fileOverview Server actions for PesaPal V3 integration.
 * Handles authentication and transaction initiation.
 */

const PESAPAL_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://pay.pesapal.com/v3' 
  : 'https://cyb3r.pesapal.com/v3';

async function getAuthToken() {
  const response = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
  });

  if (!response.ok) throw new Error('Failed to authenticate with PesaPal');
  const data = await response.json();
  return data.token;
}

export async function initiatePesaPalPayment(amount: number, email: string, userId: string) {
  try {
    const token = await getAuthToken();
    
    // In a real app, you would register an IPN ID first. 
    // For this prototype, we'll assume a pre-registered or default IPN logic.
    const orderData = {
      id: `order_${Date.now()}_${userId.slice(0, 5)}`,
      currency: "KES",
      amount: amount,
      description: "MatchFlow Coin Recharge",
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/coins?status=success`,
      notification_id: process.env.PESAPAL_IPN_ID || "",
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
    console.error('PesaPal Error:', error);
    // Fallback for development/testing if keys aren't set
    return { error: error.message || 'Payment service unavailable' };
  }
}
