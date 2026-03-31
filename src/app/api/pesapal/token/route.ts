import { NextResponse } from 'next/server';

/**
 * @fileOverview Temporary debug route to test PesaPal Sandbox token generation.
 */

export async function GET() {
  if (!process.env.PESAPAL_CONSUMER_KEY || !process.env.PESAPAL_CONSUMER_SECRET) {
    return NextResponse.json({ error: "Environment variables missing" }, { status: 500 });
  }

  try {
    const response = await fetch("https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        consumer_key: process.env.PESAPAL_CONSUMER_KEY,
        consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
