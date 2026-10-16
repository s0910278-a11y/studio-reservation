import { KINDS, TestError } from './config.mjs';

// Synthetic data only. No GAS / spreadsheet / customer lookup.
export function fixture(baseUrl) {
  return {
    name: 'メール移行テスト', memberNo: 'TEST-ONLY', studio: 'Studio A',
    date: '2099-01-01T00:00:00.000Z', startTime: '13:00', endTime: '14:00',
    peopleCount: 2, totalPrice: 880, cancelToken: 'TEST-ONLY-NO-BOOKING',
    gasUrl: `${baseUrl}/cancel-test.html`, baseUrl,
  };
}

// Copied from gas_project/Code.gs at f6b024f. Parity tested in an offline GAS sandbox.
export function renderOriginal(kind, b) {
  if (!KINDS.includes(kind)) throw new TestError('INVALID_KIND', 400);
  if (kind === 'confirmation') {
    const cancelUrl = `${b.gasUrl}?token=${b.cancelToken}`;
    return {
      subject: '【ご予約確定】ハードオフ八王子大和田店 楽器スタジオ',
      name: '【予約完了】ハードオフ八王子大和田店 楽器スタジオ',
      text: `
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
`.trim(),
    };
  }
  return {
    subject: '【ご予約受付不可のお知らせ】ハードオフ八王子大和田店 楽器スタジオ',
    name: 'ハードオフ八王子大和田店 楽器スタジオ',
    text: `
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
`.trim(),
  };
}

export function makeMessage(kind, config, key) {
  const template = renderOriginal(kind, fixture(config.baseUrl));
  return {
    from: { name: template.name, address: config.from },
    to: config.recipient, replyTo: config.replyTo,
    envelope: { from: config.from, to: [config.recipient] },
    subject: `【送信テスト・実予約なし】${template.subject}`,
    text: `※本人宛てのメール送信テストです。予約の登録・変更は行っていません。\n\n${template.text}`,
    messageId: `<studio-test-${key}@studio-test.invalid>`,
    disableFileAccess: true, disableUrlAccess: true,
    // Deliberately no CC or BCC in the test environment.
  };
}
