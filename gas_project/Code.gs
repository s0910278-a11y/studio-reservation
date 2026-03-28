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
      sheet.appendRow(["会員ナンバー", "お名前", "メールアドレス", "電話番号", "利用停止フラグ", "キャンセル回数", "登録日時", "ご利用回数", "予約拒否"]);
    } else if (sheetName === '機材リスト') {
      sheet.appendRow(["スタジオ", "カテゴリー", "名称", "サブカテゴリー"]);
    }
  }
  return sheet;
}

// GETリクエスト（データ取得用 & キャンセル処理用）
function doGet(e) {
  try {
    // キャンセル用トークンがある場合
    if (e.parameter.token) {
      return handleDirectCancellation(e.parameter.token);
    }

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

    if (action === 'getEquipment') {
      const sheet = getSheet('機材リスト');
      const data = getSheetDataAsJson(sheet);
      return createJsonResponse({ success: true, data: data });
    }

    return createJsonResponse({ error: 'action not specified or invalid' }, 400);
  } catch (error) {
    if (e.parameter.token) {
      return HtmlService.createHtmlOutput(`<h2 style="color:red;">エラーが発生しました</h2><p>${error.toString()}</p>`);
    }
    return createJsonResponse({ error: error.toString() }, 500);
  }
}

// キャンセルトークンによる直接キャンセル処理 (doGet用)
function handleDirectCancellation(token) {
  const sheet = getSheet('予約一覧');
  const data = sheet.getDataRange().getValues();
  let rowIdx = -1;
  let bookingData = null;

  // トークンで検索 (11列目 / index 10)
  for (let i = 1; i < data.length; i++) {
    if (data[i][10] === token) {
      rowIdx = i + 1;
      bookingData = {
        bookingId: data[i][0],
        memberNo: data[i][1],
        status: data[i][9]
      };
      break;
    }
  }

  if (rowIdx === -1) {
    return HtmlService.createHtmlOutput('<h2>該当する予約が見つかりませんでした</h2><p>無効なキャンセルリンク、またはすでに削除されている可能性があります。</p>');
  }

  if (String(bookingData.status).startsWith('CANCELED')) {
    return HtmlService.createHtmlOutput('<h2>この予約はすでにキャンセル済みです</h2><p>お手続きの必要はありません。</p>');
  }

  // ステータス更新
  sheet.getRange(rowIdx, 10).setValue('CANCELED');

  // キャンセル回数カウント (+1)
  updateCancelCount(bookingData.memberNo, 1);

  return HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; background-color: #f4f7f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #333; }
          .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 90%; }
          .icon { font-size: 48px; color: #2ecc71; margin-bottom: 20px; }
          h2 { margin-top: 0; color: #2c3e50; font-size: 1.5rem; }
          p { line-height: 1.6; color: #7f8c8d; margin-bottom: 30px; }
          .footer { font-size: 0.8em; color: #bdc3c7; border-top: 1px solid #eee; pt: 20px; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">✓</div>
          <h2>キャンセルを受け付けました</h2>
          <p>ご予約のキャンセル手続きが完了しました。<br>またのご利用を心よりお待ちしております。</p>
          <div class="footer">
            ハードオフ八王子大和田店 楽器スタジオ
          </div>
        </div>
      </body>
    </html>
  `);
}

// キャンセル回数更新の共通ロジック (amount: 加算する数 +1 or +3)
function updateCancelCount(memberNo, amount) {
  if (memberNo && memberNo !== 'ADMIN' && memberNo !== 'GUEST') {
    const uSheet = getSheet('顧客リスト');
    const uData = uSheet.getDataRange().getValues();
    let rowIdx = -1;
    let currentCount = 0;

    const targetNo = String(memberNo).trim().toUpperCase();

    for (let i = 1; i < uData.length; i++) {
      const sheetNo = String(uData[i][0]).trim().toUpperCase();
      if (sheetNo === targetNo) {
        rowIdx = i + 1;
        currentCount = Number(uData[i][5]) || 0;
        break;
      }
    }

    if (rowIdx !== -1) {
      const newCount = currentCount + (Number(amount) || 0);
      uSheet.getRange(rowIdx, 6).setValue(newCount); // F列: キャンセル回数
      console.log(`Updated cancel count for ${targetNo}: ${currentCount} -> ${newCount}`);
      
      // 自動BAN（フラグTRUE化）は行わず、管理画面上で「候補者」として表示するように変更
    } else {
      console.warn(`Member not found for cancel count update: ${targetNo}`);
    }
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
          // キャンセルURL生成: gasUrl(フロントエンドから渡された.envのURL)を最優先使用
          let cancelBaseUrl = b.gasUrl || '';
          if (!cancelBaseUrl) {
            try { cancelBaseUrl = ScriptApp.getService().getUrl() || ''; } catch(e) {}
          }
          const cancelUrl = cancelBaseUrl ? `${cancelBaseUrl}?token=${cancelToken}` : `${b.baseUrl}/cancel?token=${cancelToken}`;

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
${cancelUrl}
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
          status = status + ` (メール送信失敗: ${err.message})`;
        }
      }

      // "予約ID", "会員ナンバー", "お名前", "スタジオ", "日付", "開始時間", "終了時間", "利用人数", "合計金額", "ステータス", "キャンセル用トークン", "登録日時"
      // 日付をYYYY-MM-DD形式に、登録日時をJST YYYY-MM-DD HH:mm形式に
      const dateFormatted = b.date ? b.date.substring(0, 10) : '';
      const nowJst = new Date();
      const registeredAt = Utilities.formatDate(nowJst, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
      
      sheet.appendRow([
        bookingId,
        b.memberNo,
        b.name,
        b.studio,
        dateFormatted,
        b.startTime,
        b.endTime,
        b.peopleCount,
        b.totalPrice,
        status,
        cancelToken,
        registeredAt
      ]);
      
      // 予約登録後にE列(日付)で昇順ソート & 最新行を強調
      try { sortBookingsByDate_(); } catch(e) {}
      
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
      const regAt = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
      sheet.appendRow([
        u.memberNo,
        u.name,
        u.email,
        u.phone,
        false, // 利用停止フラグ (E列)
        0,     // キャンセル回数 (F列)
        regAt, // 登録日時 (G列)
        0,     // ご利用回数 (H列)
        false  // 予約拒否 (I列)
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
        console.warn(`Booking ID not found: ${b.bookingId}`);
        return createJsonResponse({ error: 'Booking ID not found: ' + b.bookingId }, 404);
      }
      
      console.log(`Updated status for ${b.bookingId} to ${b.status}. memberNo: ${memberNo}, wasCanceled: ${wasCanceled}, isCanceled: ${isCanceled}`);
      
      // キャンセル回数管理ロジック (+1)
      if (isCanceled && !wasCanceled) {
        updateCancelCount(memberNo, 1);
      }

      return createJsonResponse({ success: true });
    }

    if (action === 'updateUserBan') {
      const sheet = getSheet('顧客リスト');
      const u = payload.data;
      const data = sheet.getDataRange().getValues();
      const targetNo = String(u.memberNo).trim().toUpperCase();

      for (let i = 1; i < data.length; i++) {
        const sheetNo = String(data[i][0]).trim().toUpperCase();
        if (sheetNo === targetNo) {
          const isBanned = (u.banStatus === true || String(u.banStatus).toLowerCase() === 'true');
          const val = isBanned ? "TRUE" : "FALSE";
          // E列: 利用停止フラグ
          sheet.getRange(i + 1, 5).setValue(val);
          // I列: 予約拒否
          sheet.getRange(i + 1, 9).setValue(val);
          
          console.log(`Updated user ${targetNo}: E-col=${val}, I-col=${val}`);
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
          if (uData[i][0].toString() === memberNo.toString()) {
            // 来店なしは+3加算
            updateCancelCount(memberNo, 3);
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

// ===== 内部ヘルパー =====

// E列(日付)で昇順ソート + 最新登録行を薄い黄色で強調
function sortBookingsByDate_() {
  const sheet = getSheet('予約一覧');
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  // ヘッダー以外を日付(E列)昇順ソート
  const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  range.sort({ column: 5, ascending: true });
  
  // 全行の背景色をリセット(過去行グレーは朝8時トリガーで上書きされる)
  range.setBackground(null);
  
  // 最新登録行（最も新しい登録日時のL列=12列目）を探す
  const data = range.getValues();
  let latestIdx = 0;
  let latestDate = '';
  for (let i = 0; i < data.length; i++) {
    const regDate = String(data[i][11] || '');
    if (regDate >= latestDate) {
      latestDate = regDate;
      latestIdx = i;
    }
  }
  // 最新行を薄い黄色で強調
  sheet.getRange(latestIdx + 2, 1, 1, sheet.getLastColumn()).setBackground('#FFFDE7');
}

// ===== 日次トリガー関数群 =====

// 朝8時トリガー: 過去日予約行をグレー塗り
function highlightPastBookings() {
  const sheet = getSheet('予約一覧');
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  const todayStr = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const dateVal = String(data[i][4] || '').substring(0, 10);
    if (dateVal && dateVal < todayStr) {
      sheet.getRange(i + 1, 1, 1, 12).setBackground('#E0E0E0');
    }
  }
}

// 日次トリガー: 利用完了予約の自動カウント
// ACTIVE予約で終了時間が過去に相当するものを「COMPLETED」にし、ご利用回数を加算
function countCompletedUsage() {
  const bSheet = getSheet('予約一覧');
  const bData = bSheet.getDataRange().getValues();
  const nowJst = new Date();
  const todayStr = Utilities.formatDate(nowJst, 'Asia/Tokyo', 'yyyy-MM-dd');
  const nowMins = nowJst.getHours() * 60 + nowJst.getMinutes();
  
  // 利用完了した予約を集計: { memberNo: count }
  const completedMap = {};
  
  for (let i = 1; i < bData.length; i++) {
    const status = String(bData[i][9] || '');
    if (status !== 'ACTIVE') continue;
    
    const dateVal = String(bData[i][4] || '').substring(0, 10);
    const endTime = String(bData[i][6] || '');
    const memberNo = String(bData[i][1] || '');
    
    if (!dateVal || !endTime || !memberNo || memberNo === 'ADMIN' || memberNo === 'GUEST') continue;
    
    // 過去日 or 当日で終了時間が過ぎた予約
    let isCompleted = false;
    if (dateVal < todayStr) {
      isCompleted = true;
    } else if (dateVal === todayStr) {
      const [eH, eM] = endTime.split(':').map(Number);
      if (eH * 60 + eM <= nowMins) isCompleted = true;
    }
    
    if (isCompleted) {
      // ステータスを COMPLETED に更新（二重加算防止）
      bSheet.getRange(i + 1, 10).setValue('COMPLETED');
      if (!completedMap[memberNo]) completedMap[memberNo] = 0;
      completedMap[memberNo]++;
    }
  }
  
  // ご利用回数を加算
  if (Object.keys(completedMap).length === 0) return;
  
  const uSheet = getSheet('顧客リスト');
  const uData = uSheet.getDataRange().getValues();
  
  for (let i = 1; i < uData.length; i++) {
    const memberNo = String(uData[i][0] || '');
    if (completedMap[memberNo]) {
      const current = Number(uData[i][7]) || 0;  // 8列目(index 7) = ご利用回数
      uSheet.getRange(i + 1, 8).setValue(current + completedMap[memberNo]);
    }
  }
}

// トリガー設定用のヘルパー（手動実行用）
function setupTriggers() {
  // 既存トリガーの重複を防ぐ
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  
  // 毎朝8時にグレー塗り
  ScriptApp.newTrigger('highlightPastBookings')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
  
  // 毎朝8:05に利用完了カウント
  ScriptApp.newTrigger('countCompletedUsage')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
}
