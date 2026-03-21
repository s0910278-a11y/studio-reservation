import { NextResponse } from 'next/server';
import { getBookingsFromSheet } from '../../../../lib/sheets';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { token } = data;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Customer cancellation validation
    const bookings = await getBookingsFromSheet();
    const booking = bookings.find((b: any) => b['キャンセル用トークン'] === token);

    if (!booking) return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
    if (booking['ステータス'] !== 'ACTIVE') return NextResponse.json({ error: 'Already cancelled or invalid status' }, { status: 400 });

    // Update in Google Sheets via GAS
    const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL || '';
    const response = await fetch(gasUrl, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ action: 'updateBookingStatus', data: { bookingId: booking['予約ID'], status: 'CANCELED' } })
    });

    if (!response.ok) {
       throw new Error('Failed to update status in GAS');
    }

    return NextResponse.json({ success: true, message: '予約をキャンセルしました。' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
