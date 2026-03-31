import { NextResponse } from 'next/server';

/**
 * @fileOverview Route to register the PesaPal IPN URL in Production.
 * This should be called once to get a production IPN_ID from PesaPal.
 */

export async function GET(request: Request) {
  if (!process.env.PESAPAL_CONSUMER_KEY || !process.env.PESAPAL_CONSUMER_SECRET) {
    return NextResponse.json({ error: "Environment variables missing" }, { status: 500 });
  }

  const { origin } = new URL(request.url);
  const ipnUrl = `${origin}/api/pesapal/ipn`;

  try {
    // Step 1: get token from live production
    const tokenRes = await fetch("https://pay.pesapal.com/pesapalv3/api/Auth/RequestToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        consumer_key: process.env.PESAPAL_CONSUMER_KEY,
        consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return NextResponse.json({ error: `Auth failed: ${tokenRes.status}`, details: err }, { status: 500 });
    }

    const { token } = await tokenRes.json();

    if (!token) {
      return NextResponse.json({ error: "Failed to retrieve token" }, { status: 500 });
    }

    // Step 2: register IPN in live production
    const ipnRes = await fetch("https://pay.pesapal.com/pesapalv3/api/URLSetup/RegisterIPN", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        url: ipnUrl,
        ipn_notification_type: "GET",
      }),
    });

    const data = await ipnRes.json();
    return NextResponse.json({ 
      message: "IPN Registration Attempted",
      registered_url: ipnUrl,
      pesapal_response: data 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
