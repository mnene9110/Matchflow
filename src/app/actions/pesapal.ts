'use server';

/**
 * @fileOverview Server actions for PesaPal V3 integration.
 * Handles authentication, IPN registration, and order submission.
 * Optimized to handle existing IPN registrations to prevent "could not register IPN" errors.
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

/**
 * Checks for existing IPNs or registers a new one.
 * PesaPal V3 returns an error if you try to register an identical URL that already exists.
 */
async function registerIPN(token: string) {
  const ipnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/pesapal/ipn`;
  
  try {
    // 1. Check existing IPNs first to avoid "Duplicate" errors
    const listResponse = await fetch(`${PESAPAL_URL}/api/URLSetup/GetIpnList`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    const ipns = await listResponse.json();
    
    // Search for an existing registration with the same URL
    if (Array.isArray(ipns)) {
      const existing = ipns.find((item: any) => item.url === ipnUrl);
      if (existing && existing.ipn_id) {
        console.log('Using existing PesaPal IPN ID:', existing.ipn_id);
        return existing.ipn_id;
      }
    }

    // 2. If not found, register new
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
    
    if (data.ipn_id) return data.ipn_id;
    
    // Handle cases where registration fails but didn't throw
    console.error('PesaPal IPN Registration Response:', data);
    return null;
  } catch (error) {
    console.error('Error in registerIPN:', error);
    return null;
  }
}

export async function initializePesaPalTransaction(email: string, amount: number, metadata: any) {
  try {
    const token = await getAuthToken();
    const ipnId = await registerIPN(token);

    if (!ipnId) {
      return { error: 'Failed to secure a payment notification ID from PesaPal. Please try again or contact support.' };
    }

    // Use a unique but shorter reference ID
    const shortId = Date.now().toString().slice(-10);
    const orderData = {
      id: `MF${shortId}`,
      currency: 'KES',
      amount: Number(amount),
      description: `MatchFlow Coin Recharge (${metadata.packageAmount} coins)`,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/recharge/callback/pesapal`,
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
      const errorMessage = result.message || (result.error ? result.error.message : 'Failed to submit order to PesaPal');
      return { error: errorMessage };
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