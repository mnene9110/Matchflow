
'use server';

/**
 * @fileOverview Server actions for Paystack integration.
 * Handles transaction initialization and verification.
 */

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function initializePaystackTransaction(email: string, amount: number, metadata: any) {
  if (!PAYSTACK_SECRET_KEY) {
    return { error: 'Paystack Secret Key is missing in environment variables.' };
  }

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Paystack expects amount in subunits (e.g., kobo or cents)
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/coins?status=success`,
        metadata,
      }),
    });

    const data = await response.json();

    if (!data.status) {
      return { error: data.message || 'Failed to initialize transaction.' };
    }

    return { authorization_url: data.data.authorization_url, reference: data.data.reference };
  } catch (error) {
    console.error('Paystack initialization error:', error);
    return { error: 'An internal error occurred while connecting to Paystack.' };
  }
}

export async function verifyPaystackTransaction(reference: string) {
  if (!PAYSTACK_SECRET_KEY) {
    return { error: 'Paystack Secret Key is missing.' };
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Paystack verification error:', error);
    return { error: 'Failed to verify transaction.' };
  }
}
