import { NextResponse } from 'next/server';
import { getBookingsFromSheet, getUsersFromSheet } from '../../../../lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [sheetData, users] = await Promise.all([
      getBookingsFromSheet(),
      getUsersFromSheet()
    ]);

    // Calendarコンポーネントやフロントエンドが期待する形式に変換（/api/bookings/route.ts と同様の処理）
    const mappedBookings = (sheetData || []).map((b: any) => {
      return {
        bookingId: b['予約ID'],
        studioId: b['スタジオ'],
        date: new Date(b['日付']).toISOString(),
        startTime: b['開始時間'],
        endTime: b['終了時間'],
        status: b['ステータス'],
        name: b['お名前'],
        memberNo: b['会員ナンバー']
      };
    });

    return NextResponse.json({
      bookings: mappedBookings,
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
