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
        let isoDate = "";
        try {
          const d = new Date(b['日付']);
          if (!isNaN(d.getTime())) isoDate = d.toISOString();
        } catch(e) {}

        const base = {
          bookingId: b['予約ID'],
          studioId: b['スタジオ'],
          date: isoDate,
          startTime: b['開始時間'],
          endTime: b['終了時間'],
          status: b['ステータス']
        };
        if (isAdmin) {
          return { ...base, name: b['お名前'], memberNo: b['会員ナンバー'], peopleCount: b['利用人数'] };
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

    // Normalize member number helper
    const normalizeMemberNo = (no: any) => {
      if (!no) return "";
      // 全角→半角変換, 空白/ハイフン除去, 大文字化
      return String(no)
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/[-\s]/g, "")
        .toUpperCase();
    };

    // Robust field getter (ignores spaces and casing in header keys)
    const getField = (obj: any, fieldName: string) => {
      if (!obj) return "";
      if (obj[fieldName] !== undefined) return obj[fieldName];
      // Search with normalized keys
      const searchKey = fieldName.trim();
      const actualKey = Object.keys(obj).find(k => k.trim() === searchKey);
      return actualKey ? obj[actualKey] : "";
    };

    // 1. Membership Validation & Creation
    let finalMemberNo = normalizeMemberNo(memberNo);
    
    if (memberNo && memberNo !== 'ADMIN') {
      const targetNo = normalizeMemberNo(memberNo);
      // Existing Member Flow
      const users = await getUsersFromSheet();
      const existingUser = users.find((u: any) => normalizeMemberNo(getField(u, '会員ナンバー')) === targetNo);
      
      if (!existingUser) {
        // もし「会員ナンバー」で見つからない場合、全列をチェックする最後の手段
        console.warn(`Member not found by key for: ${targetNo}. Checking all columns...`);
        const desperateMatch = users.find((u: any) => 
          Object.values(u).some(val => normalizeMemberNo(val) === targetNo)
        );
        
        if (!desperateMatch) {
          return NextResponse.json({ error: 'ご入力の会員ナンバーは登録されていません。' }, { status: 404 });
        }
        
        // Populate missing info from sheet
        name = getField(desperateMatch, 'お名前');
        phone = getField(desperateMatch, '電話番号');
        email = getField(desperateMatch, 'メールアドレス');
        finalMemberNo = getField(desperateMatch, '会員ナンバー') || targetNo;
        
        const isStopped = String(getField(desperateMatch, '利用停止フラグ')).toLowerCase() === 'true';
        const isRefused = String(getField(desperateMatch, '予約拒否')).toLowerCase() === 'true';
        if (isStopped || isRefused) isBanCandidate = true;
      } else {
        // Populate missing info from sheet
        name = getField(existingUser, 'お名前');
        phone = getField(existingUser, '電話番号');
        email = getField(existingUser, 'メールアドレス');
        finalMemberNo = getField(existingUser, '会員ナンバー') || targetNo;
        
        const isStopped = String(getField(existingUser, '利用停止フラグ')).toLowerCase() === 'true';
        const isRefused = String(getField(existingUser, '予約拒否')).toLowerCase() === 'true';
        if (isStopped || isRefused) isBanCandidate = true;
      }

    } else if (!memberNo && name) {
      // New User Flow
      if (!phone || !email) {
        return NextResponse.json({ error: 'お客様情報が不足しています。すべて入力してください。' }, { status: 400 });
      }

      const users = await getUsersFromSheet();
      
      const normName = (name || "").replace(/\s+/g, '');
      const normPhone = (phone || "").replace(/[^\d]/g, '');
      const normEmail = (email || "").toLowerCase();

      let matchScore = 0;
      let matchedUser = null;

      for (const u of users) {
        let score = 0;
        let pName = (getField(u, 'お名前') || "").replace(/\s+/g, '') === normName;
        let pPhone = (getField(u, '電話番号') || "").replace(/[^\d]/g, '') === normPhone;
        let pEmail = (getField(u, 'メールアドレス') || "").toLowerCase() === normEmail;
        
        if (pName) score += 2;
        if (pPhone) score += 1;
        if (pEmail) score += 1;

        if (score >= 2) {
          if (!matchedUser || score > matchScore) {
            matchedUser = u;
            matchScore = score;
            const isStopped = String(getField(u, '利用停止フラグ')).toLowerCase() === 'true';
            const isRefused = String(getField(u, '予約拒否')).toLowerCase() === 'true';
            isBanCandidate = isStopped || isRefused;
          }
        }
      }

      if (matchedUser) {
         finalMemberNo = getField(matchedUser, '会員ナンバー') || getField(matchedUser, 'memberNo') || "";
         if (isBanCandidate) {
            name = "[BAN疑い] " + name;
         }
      } 
      
      if (!finalMemberNo) {
        const generateRandomId = () => {
           const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
           let id = 'A';
           for (let i = 0; i < 3; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
           return id;
        }

        let newId = generateRandomId();
        while (users.some((u:any) => normalizeMemberNo(getField(u, '会員ナンバー')) === newId)) {
           newId = generateRandomId();
        }
        finalMemberNo = newId;

        const userCreateRes = await createUserInSheet({
           memberNo: finalMemberNo,
           name,
           phone,
           email
        });
        console.log(`User created successfully: ${finalMemberNo} at row ${userCreateRes.row || 'unknown'}`);
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
    const newStartMins = startH * 60 + startM;
    const newEndMins = newStartMins + Number(durationHours) * 60;

    // 営業時間バリデーション: 11:00〜19:00
    if (newEndMins > 1140) { // 19:00 = 1140 mins
      return NextResponse.json({ error: '営業時間は19:00までです。終了時間がこれを超える予約はできません。' }, { status: 400 });
    }
    if (startH < 11) {
      return NextResponse.json({ error: '営業時間は11:00からです。' }, { status: 400 });
    }

    const bookings = await getBookingsFromSheet();
    const conflict = bookings.find((b: any) => {
      // 日付とスタジオが一致するか？
      const bDate = (b['日付'] || "").substring(0, 10);
      const dDate = new Date(date).toISOString().substring(0, 10);
      const isSameDate = bDate === dDate;
      const isSameStudio = b['スタジオ'].includes(studio.includes('Studio A') ? 'Studio A' : 'Studio B');
      if (!isSameDate || !isSameStudio || b['ステータス'] !== 'ACTIVE') return false;

      // 既存の予約の開始/終了を分に変換
      const [exStartH, exStartM] = (b['開始時間'] || '00:00').split(':').map(Number);
      const [exEndH, exEndM] = (b['終了時間'] || '00:00').split(':').map(Number);
      const exStartMins = exStartH * 60 + exStartM;
      const exEndMins = exEndH * 60 + exEndM;

      // 重複判定
      return newStartMins < exEndMins && newEndMins > exStartMins;
    });

    if (conflict) {
      return NextResponse.json({ error: `指定された時間帯（${startTime}〜${endTime}）には、既に他の予約（${conflict['開始時間']}〜${conflict['終了時間']}）が入っています。` }, { status: 409 });
    }

    const bookingStatus = isBanCandidate ? 'CANCELED' : 'ACTIVE';

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
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://zeroemission-reserve.netlify.app',
      gasUrl: "https://script.google.com/macros/s/AKfycbxOE4x6w2NNbbrXJ_NSqf2CaTT5LaWvKflPzQnB-jkOuh9mg2IwA9nPcky6fPqcM3Tz4w/exec"
    };

    if (isBanCandidate) {
      const gasUrl = "https://script.google.com/macros/s/AKfycbxOE4x6w2NNbbrXJ_NSqf2CaTT5LaWvKflPzQnB-jkOuh9mg2IwA9nPcky6fPqcM3Tz4w/exec";
      try {
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ 
            action: 'sendBanRefusalEmail', 
            data: { ...bookingPayload, name: name.replace("[BAN疑い] ", "") } 
          })
        });
      } catch (err) {
        console.error('Failed to trigger BAN email via GAS', err);
      }
      return NextResponse.json({ 
        success: true, 
        booking: bookingPayload, 
        memberNo: finalMemberNo, 
        message: '規約により受付不可となりました。' 
      }, { status: 201 });
    }

    await createBookingInSheet(bookingPayload);

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
       const gasUrl = "https://script.google.com/macros/s/AKfycbxOE4x6w2NNbbrXJ_NSqf2CaTT5LaWvKflPzQnB-jkOuh9mg2IwA9nPcky6fPqcM3Tz4w/exec";

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
