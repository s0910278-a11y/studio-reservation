const SPREADSHEET_ID = '11o6PgYQ172yAROy3LtJqj5QwtpBygqT4JPVr12zuXas';

// 指定されたシートを取得し、存在しない場合は作成してヘッダーを初期化する
function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // 初回のみヘッダー行を追加
    if (sheetName === '予約一覧') {
      sheet.appendRow(["予約ID", "会員ナンバー", "お名前", "スタジオ", "日付", "開始時間", "終了時間", "利用人数", "合計金額", "ステータス", "キャンセル用トークン", "登録日時"]);
    } else if (sheetName === '顧客リスト') {
      sheet.appendRow(["会員ナンバー", "お名前", "メールアドレス", "電話番号", "利用停止フラグ", "キャンセル回数", "登録日時"]);
    }
  }
  return sheet;
}

// GETリクエスト（データ取得用）
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'getBookings') {
      const sheet = getSheet('予約一覧');
      const data = getSheetDataAsJson(sheet);
      return createJsonResponse({ success: true, data: data });
    }
    
    if (action === 'getUsers') {
      const sheet = getSheet('顧客リスト');
      const data = getSheetDataAsJson(sheet);
      return createJsonResponse({ success: true, data: data });
    }

    return createJsonResponse({ error: 'action not specified or invalid' }, 400);
  } catch (error) {
    return createJsonResponse({ error: error.toString() }, 500);
  }
}

// POSTリクエスト（データ登録・更新用）
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    if (action === 'createBooking') {
      const sheet = getSheet('予約一覧');
      const b = payload.data;
      const cancelToken = b.cancelToken || Utilities.getUuid();
      const bookingId = b.bookingId || Utilities.getUuid();
      let status = b.status || 'ACTIVE';

      // 予約完了メール（自動送信）
      if (b.email && b.email !== 'admin-manual-booking@zero-emission.co.jp') {
        try {
          const body = `
${b.name} 様

この度はハードオフ八王子大和田店 楽器スタジオをご予約いただき、誠にありがとうございます。
以下の内容でご予約を承りました。

■ ご予約内容
・ご予約者番号（会員ナンバー）: ${b.memberNo}
・スタジオ: ${b.studio}
・ご利用日: ${b.date.substring(0, 10)}
・お時間帯: ${b.startTime} ～ ${b.endTime}
・ご利用人数: ${b.peopleCount}名様
・ご料金目安: ¥${b.totalPrice}

=======================================
【重要】こちらの予約メールをスクリーンショット撮影していただき、ご来店時にご提示ください。
=======================================

▼ キャンセルの場合は以下のURLよりお手続きをお願いいたします。
${b.baseUrl || 'http://localhost:3001'}/cancel?token=${cancelToken}
※当日の無断キャンセル等は、次回以降のご予約をお断りする場合がございます。
※本メールにお心当たりがない場合、誠に恐れ入りますが破棄をお願いいたします。

またのご利用をお待ちしております。
ハードオフ八王子大和田店 楽器スタジオ
`;
          GmailApp.sendEmail(
            b.email,
            "【ご予約確定】ハードオフ八王子大和田店 楽器スタジオ",
            body.trim(),
            {
               name: "【予約完了】ハードオフ八王子大和田店 楽器スタジオ",
               bcc: "hoowada-gakki@zero-emission.co.jp"
            }
          );
        } catch (err) {
          // 失敗した場合はステータス欄に履歴を残す
          status = status + ` (メール送信失敗: ${err.message})`;
        }
      }

      // "予約ID", "会員ナンバー", "お名前", "スタジオ", "日付", "開始時間", "終了時間", "利用人数", "合計金額", "ステータス", "キャンセル用トークン", "登録日時"
      sheet.appendRow([
        bookingId,
        b.memberNo,
        b.name,
        b.studio,
        b.date,
        b.startTime,
        b.endTime,
        b.peopleCount,
        b.totalPrice,
        status,
        cancelToken,
        new Date().toISOString()
      ]);
      return createJsonResponse({ success: true });
    }

    if (action === 'sendBanRefusalEmail') {
      const b = payload.data;
      if (b.email) {
        try {
          const body = `
${b.name} 様

ハードオフ八王子大和田店 楽器スタジオをご検討いただき、誠にありがとうございます。

誠に恐れ入りますが、過去のご利用状況等に鑑み、当スタジオの利用規約に基づきまして
現在、${b.name}様からの新規ご予約を控えさせていただいております。

今回お送りいただきました以下のご予約リクエストにつきましては、
大変申し訳ございませんが【受付不可（キャンセル扱い）】とさせていただきます。

■ リクエスト内容
・スタジオ: ${b.studio}
・ご利用日: ${b.date ? b.date.substring(0, 10) : '未入力'}

何卒、ご理解とご了承のほどお願い申し上げます。
ご不明な点がございましたら、店舗までお問い合わせください。

-------------------------------------
ハードオフ八王子大和田店 楽器スタジオ
-------------------------------------
`;
          GmailApp.sendEmail(
            b.email,
            "【ご予約受付不可のお知らせ】ハードオフ八王子大和田店 楽器スタジオ",
            body.trim(),
            {
               name: "ハードオフ八王子大和田店 楽器スタジオ",
               cc: "hoowada-gakki@zero-emission.co.jp"
            }
          );
        } catch (err) {
          return createJsonResponse({ error: 'メール送信失敗: ' + err.message }, 500);
        }
      }
      return createJsonResponse({ success: true });
    }

    if (action === 'createUser') {
      const sheet = getSheet('顧客リスト');
      const u = payload.data;
      // "会員ナンバー", "お名前", "メールアドレス", "電話番号", "利用停止フラグ", "キャンセル回数", "登録日時"
      sheet.appendRow([
        u.memberNo,
        u.name,
        u.email,
        u.phone,
        false,
        0,
        new Date().toISOString()
      ]);
      return createJsonResponse({ success: true });
    }

    if (action === 'updateBookingStatus') {
      const sheet = getSheet('予約一覧');
      const b = payload.data;
      const data = sheet.getDataRange().getValues();
      let memberNo = '';
      let isCanceled = b.status.startsWith('CANCELED');
      let wasCanceled = false;

      let found = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0].toString().trim() === b.bookingId.toString().trim()) {
          memberNo = data[i][1];
          wasCanceled = String(data[i][9]).startsWith('CANCELED');
          
          sheet.getRange(i + 1, 10).setValue(b.status);
          found = true;
          break;
        }
      }

      if (!found) {
        return createJsonResponse({ error: 'Booking ID not found: ' + b.bookingId }, 404);
      }
      
      // キャンセル回数管理
      if (memberNo && memberNo !== 'ADMIN' && memberNo !== 'GUEST') {
        const uSheet = getSheet('顧客リスト');
        const uData = uSheet.getDataRange().getValues();
        let currentCount = 0;
        let newCount = 0;
        let uRowIdx = -1;

        for (let i = 1; i < uData.length; i++) {
          if (uData[i][0] === memberNo) {
            uRowIdx = i + 1;
            currentCount = Number(uData[i][5]) || 0;
            break;
          }
        }

        if (uRowIdx !== -1) {
          if (isCanceled && !wasCanceled) {
            newCount = currentCount + 1;
            uSheet.getRange(uRowIdx, 6).setValue(newCount);
            if (newCount >= 3) {
              uSheet.getRange(uRowIdx, 5).setValue(true); // 3回で自動BAN対象
            }
          } else if (!isCanceled && wasCanceled) {
            newCount = Math.max(0, currentCount - 1);
            uSheet.getRange(uRowIdx, 6).setValue(newCount);
            if (newCount < 3) {
              uSheet.getRange(uRowIdx, 5).setValue(false); // 復帰
            }
          }
        }
      }

      return createJsonResponse({ success: true });
    }

    if (action === 'updateUserBan') {
      const sheet = getSheet('顧客リスト');
      const u = payload.data;
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === u.memberNo) {
          sheet.getRange(i + 1, 5).setValue(u.banStatus);
          return createJsonResponse({ success: true });
        }
      }
      return createJsonResponse({ error: 'user not found' }, 404);
    }

    if (action === 'addNoShow') {
      const bSheet = getSheet('予約一覧');
      const bData = bSheet.getDataRange().getValues();
      let memberNo = '';
      
      let found = false;
      for (let i = 1; i < bData.length; i++) {
        if (bData[i][0].toString().trim() === payload.data.bookingId.toString().trim()) {
          memberNo = bData[i][1];
          bSheet.getRange(i + 1, 10).setValue('CANCELED (来店なし)');
          found = true;
          break;
        }
      }

      if (!found) {
        return createJsonResponse({ error: 'Booking ID not found for no-show: ' + payload.data.bookingId }, 404);
      }

      if (memberNo && memberNo !== 'ADMIN' && memberNo !== 'GUEST') {
        const uSheet = getSheet('顧客リスト');
        const uData = uSheet.getDataRange().getValues();
        for (let i = 1; i < uData.length; i++) {
          if (uData[i][0] === memberNo) {
            uSheet.getRange(i + 1, 6).setValue(3); // 来店なし時は一気に3（一発BAN）へ
            uSheet.getRange(i + 1, 5).setValue(true); // 無断キャンセル=一発BAN
            break;
          }
        }
      }
      return createJsonResponse({ success: true });
    }

    return createJsonResponse({ error: 'action not specified or invalid' }, 400);
  } catch (error) {
    return createJsonResponse({ error: error.toString() }, 500);
  }
}

// ヘルパー: シートのデータをJSONオブジェクトの配列に変換
function getSheetDataAsJson(sheet) {
  const data = sheet.getDataRange().getDisplayValues();
  if (data.length <= 1) return []; // ヘッダーのみ、または空
  
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });
}

function createJsonResponse(data, statusCode = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
