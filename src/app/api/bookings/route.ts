import { NextResponse } from 'next/server';
import { getBookingsFromSheet, createBookingInSheet, getUsersFromSheet, createUserInSheet } from '../../../lib/sheets';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// GET: Fetch booked slots for the month
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === 'true';

    const sheetData = await getBookingsFromSheet();
    const bookings = sheetData
      .filter((b: any) => b['ステータス'] === 'ACTIVE' || (isAdmin && b['ステータス'] === 'CANCELED'))
      .map((b: any) => {
        const base = {
          bookingId: b['予約ID'],
          studioId: b['スタジオ'],
          date: new Date(b['日付']).toISOString(),
          startTime: b['開始時間'],
          endTime: b['終了時間'],
          status: b['ステータス']
        };
        if (isAdmin) {
          return { ...base, name: b['お名前'], memberNo: b['会員ナンバー'] };
        }
        return base;
      });
    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

// POST: Process a new booking with spreadsheet
export async function POST(request: Request) {
  try {
    const data = await request.json();
    let { name, phone, email, memberNo, studio, date, startTime, peopleCount, durationHours = 1 } = data;
    let isBanCandidate = false;

    // 1. Membership Validation & Creation
    let finalMemberNo = memberNo;
    
    if (memberNo && memberNo !== 'ADMIN') {
      // Existing Member Flow
      const users = await getUsersFromSheet();
      const existingUser = users.find((u: any) => u['会員ナンバー'] === memberNo);
      
      if (!existingUser) {
        return NextResponse.json({ error: 'ご入力の会員ナンバーは登録されていません。' }, { status: 404 });
      }
      
      // Populate missing info from sheet
      name = existingUser['お名前'];
      phone = existingUser['電話番号'];
      email = existingUser['メールアドレス'];
      
      if (existingUser['利用停止フラグ'] === 'true' || existingUser['利用停止フラグ'] === true) {
        isBanCandidate = true;
      }

    } else if (!memberNo && name) {
      // New User Flow
      if (!phone || !email) {
        return NextResponse.json({ error: 'お客様情報が不足しています。すべて入力してください。' }, { status: 400 });
      }

      const users = await getUsersFromSheet();
      
      const normName = name.replace(/\s+/g, '');
      const normPhone = phone.replace(/[^\d]/g, '');
      const normEmail = email.toLowerCase();

      let matchScore = 0;
      let matchedUser = null;

      for (const u of users) {
        let score = 0;
        let pName = u['お名前']?.replace(/\s+/g, '') === normName;
        let pPhone = u['電話番号']?.replace(/[^\d]/g, '') === normPhone;
        let pEmail = u['メールアドレス']?.toLowerCase() === normEmail;
        
        if (pName) score += 2; // 名前一致は強い候補
        if (pPhone) score += 1;
        if (pEmail) score += 1;

        if (score >= 2) { // 2要素以上の一致、または名前のみ一致(2点)で既存会員扱い
          if (!matchedUser || score > matchScore) {
            matchedUser = u;
            matchScore = score;
            // BAN検知: 名前違い(偽装)だが電話・メアドが一致してスコア2に達し、かつBAN済みの場合
            isBanCandidate = (!pName && (u['利用停止フラグ'] === 'true' || u['利用停止フラグ'] === true));
          }
        }
      }

      if (matchedUser) {
         finalMemberNo = matchedUser['会員ナンバー'];
         if (isBanCandidate) {
            // カレンダー名や管理情報で目立つよう名前に警告を付与する
            name = "[BAN疑い] " + name;
         }
      } else {
        // 推測困難なA + 英大文字数字の4桁ランダム生成
        const generateRandomId = () => {
           const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 間違えやすい I, O, 0, 1 を除外
           let id = 'A';
           for (let i = 0; i < 3; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
           return id;
        }

        let newId = generateRandomId();
        while (users.some((u:any) => u['会員ナンバー'] === newId)) {
           newId = generateRandomId(); // 衝突時は再生成
        }
        finalMemberNo = newId;

        // Create new user in sheet
        await createUserInSheet({
           memberNo: finalMemberNo,
           name,
           phone,
           email
        });
      }
    } else if (memberNo === 'ADMIN') {
      finalMemberNo = 'ADMIN';
    }

    if (!name || (!memberNo && !email) || !studio || !date || !startTime || !peopleCount) {
      return NextResponse.json({ error: '必要な情報が不足しています' }, { status: 400 });
    }

    // 日付バリデーション: 当日から28日以内
    const bookingDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 28);
    if (memberNo !== 'ADMIN' && (bookingDate < today || bookingDate > maxDate)) {
      return NextResponse.json({ error: '予約可能期間は当日から1か月以内です。' }, { status: 400 });
    }

    const [startH, startM] = startTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(startH + Number(durationHours), startM, 0, 0);
    const endH = String(endDate.getHours()).padStart(2, '0');
    const endM = String(endDate.getMinutes()).padStart(2, '0');
    const endTime = `${endH}:${endM}`;

    // Conflict check (Strict Overlap Validation)
    // Overlap condition: MAX(start1, start2) < MIN(end1, end2)
    // Or simpler: newStart < existingEnd && newEnd > existingStart
    const newStartMins = startH * 60 + startM;
    const newEndMins = newStartMins + Number(durationHours) * 60;

    const bookings = await getBookingsFromSheet();
    const conflict = bookings.find((b: any) => {
      // 日付とスタジオが一致するか？
      const isSameDate = b['日付'].substring(0, 10) === new Date(date).toISOString().substring(0, 10);
      const isSameStudio = b['スタジオ'].includes(studio.includes('Studio A') ? 'Studio A' : 'Studio B');
      if (!isSameDate || !isSameStudio || b['ステータス'] !== 'ACTIVE') return false;

      // 既存の予約の開始/終了を分に変換
      const [exStartH, exStartM] = (b['開始時間'] || '00:00').split(':').map(Number);
      const [exEndH, exEndM] = (b['終了時間'] || '00:00').split(':').map(Number);
      const exStartMins = exStartH * 60 + exStartM;
      const exEndMins = exEndH * 60 + exEndM;

      // 重複判定: 新しい予約の開始が既存の終了より前 ＆ 新しい予約の終了が既存の開始より後
      return newStartMins < exEndMins && newEndMins > exStartMins;
    });

    if (conflict) {
      return NextResponse.json({ error: `指定された時間帯（${startTime}〜${endTime}）には、既に他の予約（${conflict['開始時間']}〜${conflict['終了時間']}）が入っています。` }, { status: 409 });
    }

    const bookingStatus = isBanCandidate ? 'CANCELED (BAN受付不可)' : 'ACTIVE';

    const bookingPayload = {
      bookingId: `BK-${Date.now()}`,
      memberNo: finalMemberNo,
      name: isBanCandidate ? `[BAN停止中] ${name}` : name,
      email,
      studio: studio.includes('Studio A') ? 'Studio A' : 'Studio B',
      date: new Date(date).toISOString(),
      startTime,
      endTime,
      peopleCount: Number(peopleCount),
      totalPrice: Number(peopleCount) * 440 * Number(durationHours),
      status: bookingStatus,
      cancelToken: crypto.randomUUID(),
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'
    };

    await createBookingInSheet(bookingPayload);

    // Skip audit log table equivalent for Sheet API to reduce latency for now.

    if (isBanCandidate) {
      // Send Ban Refusal Email via GAS
      const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL || '';
      try {
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'sendBanRefusalEmail', data: bookingPayload })
        });
      } catch (err) {
        console.error('Failed to trigger BAN email via GAS', err);
      }
      return NextResponse.json({ success: true, booking: bookingPayload, memberNo: finalMemberNo, message: '規約により受付不可となりました。' }, { status: 201 });
    }

    const storeEmail = 'hoowada-gakki@zero-emission.co.jp';
    const emailBody = `
件名: 【HARD OFF MUSIC STUDIO】ご予約ありがとうございます

${name} 様
この度はハードオフ八王子大和田店 楽器スタジオをご予約いただき、誠にありがとうございます。
■ ご予約内容
・スタジオ: ${bookingPayload.studio}
・ご利用日: ${date}
・お時間帯: ${startTime} ～ ${endTime}
・ご利用人数: ${peopleCount}名様
・ご予約者番号: ${finalMemberNo}

=======================================
▼ 画面保存のお願い
こちらの予約完了メールの画面を保存またはスクリーンショット撮影し、ご来店時にスタッフへご提示ください。
=======================================
`;
    console.log(`[FROM: ${storeEmail}] -> [TO: ${email}]\n${emailBody}`);

    return NextResponse.json({ success: true, booking: bookingPayload, memberNo: finalMemberNo }, { status: 201 });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update booking status (Cancel / Restore)
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { action, bookingId, status } = data;
    if (action === 'updateStatus' && bookingId && status) {
       const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL || '';

       if (status === 'ACTIVE') {
         // 復元時の重複チェック
         const getRes = await fetch(`${gasUrl}?action=getBookings`, { cache: 'no-store' });
         const getJson = await getRes.json();
         const bookings = getJson.data || [];

         const target = bookings.find((bk: any) => bk['予約ID'] === bookingId);
         if (target) {
            const tStudio = target['スタジオ'];
            const tDate = new Date(target['日付']).toISOString().substring(0, 10);
            
            const [tH, tM] = (target['開始時間'] || '00:00').split(':').map(Number);
            const [eH, eM] = (target['終了時間'] || '00:00').split(':').map(Number);
            const tStartMins = tH * 60 + tM;
            const tEndMins = eH * 60 + eM;

            const hasOverlap = bookings.some((bk: any) => {
               if (bk['予約ID'] === bookingId) return false;
               if (bk['ステータス'] !== 'ACTIVE') return false;
               if (!bk['スタジオ']?.includes(tStudio.includes('Studio A') ? 'Studio A' : 'Studio B')) return false;
               
               const bDate = new Date(bk['日付']).toISOString().substring(0, 10);
               if (bDate !== tDate) return false;
               
               const [bkStartH, bkStartM] = (bk['開始時間'] || '00:00').split(':').map(Number);
               const [bkEndH, bkEndM] = (bk['終了時間'] || '00:00').split(':').map(Number);
               const bkStartMins = bkStartH * 60 + bkStartM;
               const bkEndMins = bkEndH * 60 + bkEndM;

               return (tStartMins < bkEndMins && tEndMins > bkStartMins);
            });

            if (hasOverlap) {
               return NextResponse.json({ error: '既にほかの人から予約が入ったため、復元に失敗しました。' }, { status: 409 });
            }
         }
       }

       const response = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'updateBookingStatus', data: { bookingId, status } })
       });
       if (!response.ok) throw new Error('Failed to update status in GAS');
       return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
