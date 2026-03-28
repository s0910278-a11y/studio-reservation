/**
 * Google Apps Script (GAS) Web API を経由して
 * スプレッドシートのデータを読み書きするデータアクセスモジュール。
 * 
 * 認証・アクセス権問題を回避するため、GCPのサービスアカウントJSON等は不要で、
 * .env 内の NEXT_PUBLIC_GAS_API_URL に接続する設計となっています。
 */

const getGasUrl = () => {
  const url = "https://script.google.com/macros/s/AKfycbxOE4x6w2NNbbrXJ_NSqf2CaTT5LaWvKflPzQnB-jkOuh9mg2IwA9nPcky6fPqcM3Tz4w/exec";
  if (!url) {
    throw new Error('GAS_API_URL is not defined. Please deploy GAS and set the URL in .env');
  }
  return url;
};

// 予約一覧の取得
export const getBookingsFromSheet = async () => {
  const url = getGasUrl();
  const res = await fetch(`${url}?action=getBookings`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error('Failed to fetch bookings from GAS');
  
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  
  return json.data || [];
};

// 顧客リストの取得
export const getUsersFromSheet = async () => {
  const url = getGasUrl();
  const res = await fetch(`${url}?action=getUsers`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error('Failed to fetch users from GAS');
  
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  
  return json.data || [];
};

// 新規予約を登録
export const createBookingInSheet = async (bookingData: any) => {
  const url = getGasUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // GAS expects plain text payload sometimes without CORS issues
    body: JSON.stringify({ action: 'createBooking', data: bookingData })
  });
  
  if (!res.ok) throw new Error('Failed to post booking to GAS');
  
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  
  return json.success;
};

// 新規顧客を登録
export const createUserInSheet = async (userData: any) => {
  const url = getGasUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'createUser', data: userData })
  });
  
  if (!res.ok) throw new Error('Failed to post user to GAS');
  
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  
  return json.success;
};

// 機材リストの取得
export const getEquipmentFromSheet = async () => {
  const url = getGasUrl();
  const res = await fetch(`${url}?action=getEquipment`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error('Failed to fetch equipment from GAS');
  
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  
  return json.data || [];
};
