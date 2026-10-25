import { NextResponse } from 'next/server';

// The token-only legacy API must not bypass the explicit GAS confirmation.
export async function POST() {
  return NextResponse.json({
    error: '予約完了メールのキャンセルリンクから確認画面を開き、内容を確認してお手続きください。'
  }, { status: 410 });
}
