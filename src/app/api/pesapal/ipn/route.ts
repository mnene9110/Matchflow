import { NextResponse } from 'next/server';
import { getTransactionStatus } from '@/app/actions/pesapal';

/**
 * @fileOverview IPN Listener for PesaPal.
 * PesaPal calls this endpoint when a transaction status changes.
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { OrderTrackingId, OrderNotificationType } = body;

    if (OrderNotificationType === 'IPNCHANGE' && OrderTrackingId) {
      // In a real app, you would fetch status and update Firestore here.
      // Since this is a server action context, we handle the status check:
      const status = await getTransactionStatus(OrderTrackingId);
      console.log('IPN Status Update:', status);
    }

    return NextResponse.json({ status: 200, message: 'IPN Received' });
  } catch (error) {
    return NextResponse.json({ status: 500, error: 'Internal Server Error' });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const OrderTrackingId = searchParams.get('OrderTrackingId');
  const OrderNotificationType = searchParams.get('OrderNotificationType');

  if (OrderTrackingId && OrderNotificationType) {
    console.log('GET IPN Received:', { OrderTrackingId, OrderNotificationType });
  }

  return NextResponse.json({ status: 200, message: 'IPN Received' });
}
