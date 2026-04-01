import { NextResponse } from 'next/server';

/**
 * @fileOverview IPN Listener for PesaPal V3.
 * Receives notifications about transaction status changes.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderTrackingId = searchParams.get('OrderTrackingId');
  const notificationType = searchParams.get('OrderNotificationType');

  console.log('PesaPal IPN Received:', { orderTrackingId, notificationType });

  // In a production app, you would use orderTrackingId to fetch the status
  // and update the user's balance if the payment is successful.
  // Because this is a GET request from PesaPal, we return a 200 OK with the expected structure.

  return NextResponse.json({
    order_tracking_id: orderTrackingId,
    status: 200
  });
}

export async function POST(request: Request) {
  // PesaPal V3 IPN can be configured as POST as well.
  return GET(request);
}
