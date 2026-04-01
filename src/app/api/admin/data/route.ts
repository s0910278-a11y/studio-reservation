import { NextResponse } from 'next/server';
import { getBookingsFromSheet, getUsersFromSheet } from '../../../../lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [bookings, users] = await Promise.all([
      getBookingsFromSheet(),
      getUsersFromSheet()
    ]);

    return NextResponse.json({
      bookings: bookings || [],
      users: users || []
    });
  } catch (error: any) {
    console.error('Admin Data API Error:', error);
    return NextResponse.json(
      { error: 'データの取得に失敗しました。', details: error.message },
      { status: 500 }
    );
  }
}
