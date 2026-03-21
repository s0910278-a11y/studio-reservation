import { NextResponse } from 'next/server';
import { createUserInSheet, getUsersFromSheet } from '../../../lib/sheets';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { memberNo, name, phone, email } = data;
    
    if (!name || !phone) {
      return NextResponse.json({ error: '氏名と電話番号は必須です' }, { status: 400 });
    }

    const users = await getUsersFromSheet();
    
    // 手動入力の会員番号がある場合、重複チェック
    if (memberNo) {
      const formattedMemberNo = memberNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (users.some((u:any) => u['会員ナンバー'] === formattedMemberNo)) {
        return NextResponse.json({ error: `会員番号 [${formattedMemberNo}] は既に存在します。別の番号を指定するか、空欄（自動採番）にしてください。` }, { status: 400 });
      }
    }

    const generateRandomId = () => {
       const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
       let id = 'A';
       for (let i = 0; i < 3; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
       return id;
    }

    let finalId = memberNo ? memberNo.toUpperCase().replace(/[^A-Z0-9]/g, '') : generateRandomId();
    if (!memberNo) {
      while (users.some((u:any) => u['会員ナンバー'] === finalId)) {
         finalId = generateRandomId();
      }
    }

    await createUserInSheet({ memberNo: finalId, name, phone, email: email || '' });
    return NextResponse.json({ success: true, memberNo: finalId });
  } catch(error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
