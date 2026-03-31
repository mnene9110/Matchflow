import { NextResponse } from 'next/server';

/**
 * @fileOverview Placeholder for payment notification endpoint.
 * PesaPal IPN has been removed.
 */

export async function POST() {
  return NextResponse.json({ status: 200, message: 'Endpoint disabled' });
}

export async function GET() {
  return NextResponse.json({ status: 200, message: 'Endpoint disabled' });
}
