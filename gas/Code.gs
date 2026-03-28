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
    } else if (sheetName === '機材リスト') {
      sheet.appendRow(["スタジオ", "カテゴリー", "名称", "サブカテゴリー"]);
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

    if (action === 'getEquipment') {
      const sheet = getSheet('機材リスト');
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
      // "予約ID", "会員ナンバー", "お名前", "スタジオ", "日付", "開始時間", "終了時間", "利用人数", "合計金額", "ステータス", "キャンセル用トークン", "登録日時"
      sheet.appendRow([
        b.bookingId || Utilities.getUuid(),
        b.memberNo,
        b.name,
        b.studio,
        b.date,
        b.startTime,
        b.endTime,
        b.peopleCount,
        b.totalPrice,
        b.status || 'ACTIVE',
        b.cancelToken,
        new Date().toISOString()
      ]);
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
      const headers = data[0];
      const idIdx = headers.indexOf('予約ID');
      const statusIdx = headers.indexOf('ステータス');

      if (idIdx === -1 || statusIdx === -1) {
        return createJsonResponse({ error: 'Headers not found' }, 400);
      }

      for (let i = 1; i < data.length; i++) {
        // data[i][idIdx] が予約IDと一致するか確認
        if (data[i][idIdx].toString() === b.bookingId.toString()) {
          // getRange(row, col) は 1-indexed
          sheet.getRange(i + 1, statusIdx + 1).setValue(b.status);
          return createJsonResponse({ success: true });
        }
      }
      return createJsonResponse({ error: 'Booking ID not found: ' + b.bookingId }, 404);
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
