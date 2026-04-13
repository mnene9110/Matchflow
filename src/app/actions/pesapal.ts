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
    throw new Error(data.message || 'Failed to get PesaPal token. Check your Consumer Key and Secret.');
  }
  return data.token;
}

/**
 * Checks for existing IPNs or registers a new one.
 * PesaPal V3 returns an error if you try to register an identical URL that already exists.
 */
async function registerIPN(token: string) {
  // Use NEXT_PUBLIC_APP_URL, or the user's provided vercel link, or VERCEL_URL as fallback.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                  'https://matchflow-12.vercel.app' ||
                  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  
  const ipnUrl = `${baseUrl}/api/pesapal/ipn`;
  
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

    if (listResponse.ok) {
      const ipns = await listResponse.json();
      // Search for an existing registration with the same URL
      if (Array.isArray(ipns)) {
        const existing = ipns.find((item: any) => item.url === ipnUrl);
        if (existing && existing.ipn_id) {
          console.log('Reusing existing PesaPal IPN ID:', existing.ipn_id);
          return existing.ipn_id;
        }
      }
    }

    // 2. If not found or list failed, attempt to register new
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
    
    // 3. If registration failed because it's a duplicate but list didn't find it
    // Some PesaPal environments behave differently. We'll try to fetch the list one last time.
    if (data.error && (data.error.message?.includes('Duplicate') || data.message?.includes('Duplicate'))) {
       const retryListResponse = await fetch(`${PESAPAL_URL}/api/URLSetup/GetIpnList`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        cache: 'no-store',
      });
      if (retryListResponse.ok) {
        const retryIpns = await retryListResponse.json();
        const found = Array.isArray(retryIpns) && retryIpns.find((item: any) => item.url === ipnUrl);
        if (found && found.ipn_id) return found.ipn_id;
      }
    }

    console.error('PesaPal IPN Registration Error:', data);
    return null;
  } catch (error) {
    console.error('Critical failure in registerIPN:', error);
    return null;
  }
}

export async function initializePesaPalTransaction(email: string, amount: number, metadata: any) {
  try {
    if (!CONSUMER_KEY || CONSUMER_KEY === 'your_pesapal_consumer_key') {
      return { error: 'PesaPal API keys are not configured in Vercel environment variables.' };
    }

    const token = await getAuthToken();
    const ipnId = await registerIPN(token);

    if (!ipnId) {
      return { error: 'PesaPal could not provide a Notification ID. This usually means the callback URL is invalid or already in use. Please check your Vercel logs.' };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://matchflow-12.vercel.app';

    const shortId = Date.now().toString().slice(-10);
    const orderData = {
      id: `MF${shortId}`,
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
      const errorMessage = result.message || (result.error ? result.error.message : 'Failed to submit order to PesaPal');
      return { error: errorMessage };
    }
  } catch (error: any) {
    console.error('PesaPal Transaction Error:', error);
    return { error: error.message || 'An unexpected error occurred while connecting to PesaPal.' };
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
