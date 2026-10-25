import { NextResponse } from 'next/server';
import { getBookingsFromSheet, getUsersFromSheet } from '../../../../lib/sheets';
import { normalizeBookingStatus } from '../../../../lib/booking-status';
import { reviewReservationBehavior } from '../../../../lib/reservation-policy';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [sheetData, users] = await Promise.all([
      getBookingsFromSheet(),
      getUsersFromSheet()
    ]);

    // Calendarコンポーネントやフロントエンドが期待する形式に変換（/api/bookings/route.ts と同様の処理）
    const mappedBookings = (sheetData || []).map((b: any) => {
      let isoDate = "";
      try {
        const d = new Date(b['日付']);
        if (!isNaN(d.getTime())) isoDate = d.toISOString();
      } catch(e) {}

      return {
        bookingId: b['予約ID'],
        studioId: b['スタジオ'],
        date: isoDate,
        startTime: b['開始時間'],
        endTime: b['終了時間'],
        status: normalizeBookingStatus(b['ステータス']),
        name: b['お名前'],
        memberNo: b['会員ナンバー'],
        peopleCount: b['利用人数'],
        registeredAt: b['登録日時'] || '',
        canceledAt: b['キャンセル日時'] || '',
        cancellationSource: b['キャンセル操作元'] || '',
        cancellationMailStatus: b['キャンセル通知状態'] || ''
      };
    });

    return NextResponse.json({
      bookings: mappedBookings,
      users: (users || []).map((user: any) => ({ ...user, reservationReview: reviewReservationBehavior(user['会員ナンバー'], mappedBookings) }))
    });
  } catch (error: any) {
    console.error('Admin Data API Error:', error);
    return NextResponse.json(
      { error: 'データの取得に失敗しました。', details: error.message },
      { status: 500 }
    );
  }
}
