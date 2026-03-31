import { NextResponse } from 'next/server';

/**
 * @fileOverview Temporary debug route to register the PesaPal IPN URL in Production.
 * This should be called once to get a production IPN_ID from PesaPal.
 */

export async function GET() {
  if (!process.env.PESAPAL_CONSUMER_KEY || !process.env.PESAPAL_CONSUMER_SECRET) {
    return NextResponse.json({ error: "Environment variables missing" }, { status: 500 });
  }

  try {
    // Step 1: get token
    const tokenRes = await fetch("https://pay.pesapal.com/pesapalv3/api/Auth/RequestToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        consumer_key: process.env.PESAPAL_CONSUMER_KEY,
        consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
      }),
    });

    const tokenData = await tokenRes.json();
    const token = tokenData.token;

    if (!token) {
      return NextResponse.json({ error: "Failed to retrieve token", details: tokenData }, { status: 500 });
    }

    // Step 2: register IPN
    const ipnRes = await fetch("https://pay.pesapal.com/pesapalv3/api/URLSetup/RegisterIPN", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/pesapal/ipn`,
        ipn_notification_type: "GET",
      }),
    });

    const data = await ipnRes.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
