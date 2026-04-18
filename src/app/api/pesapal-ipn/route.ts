import { NextResponse } from 'next/server';
import { processServerPaymentConfirmation } from '@/app/actions/pesapal';

/**
 * @fileOverview Background Payment Confirmation (IPN)
 * Handles awarding coins even if the user leaves the app.
 * This is the SERVER AUTHORITY.
 */

export async function POST(req: Request) {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const orderTrackingId = params.get('OrderTrackingId');
    const notificationType = params.get('OrderNotificationType');

    console.log(`[IPN] Received notification: ${orderTrackingId} (${notificationType})`);

    // PesaPal sends IPNCHANGE when status is updated
    if (!orderTrackingId || notificationType !== 'IPNCHANGE') {
      return NextResponse.json({ status: 200, message: "Handled" });
    }

    // Call the shared server-side authoritative confirmation logic
    await processServerPaymentConfirmation(orderTrackingId);
    
    // PesaPal V3 expects a JSON response with status 200 to acknowledge receipt
    return NextResponse.json({
      order_tracking_id: orderTrackingId,
      status: 200
    });
  } catch (err) {
    console.error("[IPN] Process Error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function GET() {
  return new Response("IPN endpoint active", { status: 200 });
}
