import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { bookingId } = data;
    
    if (!bookingId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL || '';
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'updateBookingStatus', data: { bookingId, status: 'CANCELED (来店なし)' } })
    });

    if (!response.ok) {
      throw new Error('Failed to process no-show');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
