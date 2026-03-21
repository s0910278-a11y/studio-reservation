import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { memberNo, banStatus } = data;
    
    if (!memberNo || typeof banStatus !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL || '';
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'updateUserBan', data: { memberNo, banStatus } })
    });

    if (!response.ok) {
      throw new Error('Failed to toggle ban status');
    }

    // BANされた場合、該当者の未来の有効予約をすべてキャンセルし、お断りメールを飛ばす
    if (banStatus === true) {
      try {
        const getRes = await fetch(`${gasUrl}?action=getBookings`, { cache: 'no-store' });
        const getJson = await getRes.json();
        const bookings = getJson.data || [];
        const now = new Date();

        for (const b of bookings) {
          if (b['会員ナンバー'] === memberNo && b['ステータス'] === 'ACTIVE') {
            const bDate = new Date(b['日付']);
            const [startH, startM] = (b['開始時間'] || '00:00').split(':').map(Number);
            bDate.setHours(startH, startM, 0, 0);

            if (bDate > now) {
              // キャンセル処理実行
              await fetch(gasUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'updateBookingStatus', data: { bookingId: b['予約ID'], status: 'CANCELED (BAN対象自動取消)' } })
              });

              // キャンセルメール(利用不可案内)送信
              const bookingPayload = {
                bookingId: b['予約ID'],
                memberNo: b['会員ナンバー'],
                name: b['お名前'],
                email: b['メールアドレス'],
                studio: b['スタジオ'],
                date: b['日付'],
                startTime: b['開始時間'],
                endTime: b['終了時間']
              };

              await fetch(gasUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'sendBanRefusalEmail', data: bookingPayload })
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to process future bookings ban unregistration:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
