/**
 * @fileOverview PesaPal IPN listener.
 * Receives payment notifications from PesaPal.
 */

export async function POST(req: Request) {
  try {
    const body = await req.text();

    console.log("🔥 PESAPAL IPN RECEIVED:");
    console.log(body);

    // Note: In a production environment, you would parse the body (URL search params)
    // to get OrderTrackingId and then fetch the status via PesaPal API.
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.log("IPN ERROR:", err);

    return new Response("ERROR", { status: 500 });
  }
}

export async function GET() {
  return new Response("IPN endpoint working", { status: 200 });
}
