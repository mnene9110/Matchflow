'use server';

/**
 * @fileOverview Server actions for PesaPal V3 Production integration.
 * Handles authentication and transaction initialization.
 */

const PESAPAL_BASE_URL = 'https://pay.pesapal.com/v3';
const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;
const IPN_ID = process.env.PESAPAL_IPN_ID;

/**
 * Authenticates with PesaPal and returns an access token.
 */
async function getAuthToken() {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error('PesaPal Consumer Key or Secret is missing.');
  }

  const response = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RegisterProcess`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET,
    }),
  });

  const data = await response.json();
  if (!data.token) {
    throw new Error(data.message || 'Failed to authenticate with PesaPal.');
  }
  return data.token;
}

/**
 * Initializes a transaction with PesaPal.
 */
export async function initializePesaPalTransaction(email: string, amount: number, metadata: any) {
  try {
    const token = await getAuthToken();

    if (!IPN_ID) {
      return { error: 'PESAPAL_IPN_ID is required for V3 transactions.' };
    }

    const orderId = `MF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const response = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        id: orderId,
        currency: 'KES',
        amount: amount,
        description: `Purchase of ${metadata.packageAmount} coins`,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/coins?status=success`,
        notification_id: IPN_ID,
        billing_address: {
          email_address: email,
          phone_number: metadata.phone || '',
          first_name: metadata.username || 'User',
        },
      }),
    });

    const data = await response.json();

    if (data.redirect_url) {
      return { redirect_url: data.redirect_url, orderTrackingId: data.order_tracking_id };
    }

    return { error: data.message || 'Failed to initialize PesaPal order.' };
  } catch (error: any) {
    console.error('PesaPal Initialization Error:', error);
    return { error: error.message || 'An internal error occurred.' };
  }
}

/**
 * Checks transaction status.
 */
export async function getTransactionStatus(orderTrackingId: string) {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    return await response.json();
  } catch (error) {
    console.error('PesaPal Status Error:', error);
    return { error: 'Failed to verify transaction status.' };
  }
}
