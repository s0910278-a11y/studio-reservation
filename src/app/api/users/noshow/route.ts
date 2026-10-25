import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { bookingId } = data;
    
    if (!bookingId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const gasUrl = "https://script.google.com/macros/s/AKfycbxOE4x6w2NNbbrXJ_NSqf2CaTT5LaWvKflPzQnB-jkOuh9mg2IwA9nPcky6fPqcM3Tz4w/exec";
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'addNoShow', data: { bookingId } })
    });

    if (!response.ok) {
      throw new Error('Failed to process no-show');
    }
    const result = await response.json();
    if (result.error || result.success !== true) return NextResponse.json({ error: result.error || '来店なし処理に失敗しました。' }, { status: 400 });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
