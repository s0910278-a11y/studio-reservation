import { requestGasRead, requestGasWrite, type GasRequestContext } from './gas-request';

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
export const getBookingsFromSheet = async (context?: GasRequestContext) => {
  const url = getGasUrl();
  const res = await requestGasRead(`${url}?action=getBookings`, context);
  if (!res.ok) throw new Error('Failed to fetch bookings from GAS');
  
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  
  return json.data || [];
};

// 顧客リストの取得
export const getUsersFromSheet = async (context?: GasRequestContext) => {
  const url = getGasUrl();
  const res = await requestGasRead(`${url}?action=getUsers`, context);
  if (!res.ok) throw new Error('Failed to fetch users from GAS');
  
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  
  return json.data || [];
};

// 新規予約を登録
export const createBookingInSheet = async (bookingData: any, context?: GasRequestContext) => {
  const url = getGasUrl();
  const res = await requestGasWrite(url, { action: 'createBooking', data: bookingData }, context);
  
  if (!res.ok) throw new Error('Failed to post booking to GAS');
  
  const json = await res.json();
  if (json.error || json.success !== true) throw new Error(json.error || '予約登録の結果を確認できません。');
  
  return json;
};

// 新規顧客を登録
export const createUserInSheet = async (userData: any, context?: GasRequestContext) => {
  const url = getGasUrl();
  const res = await requestGasWrite(url, { action: 'createUser', data: userData }, context);
  
  if (!res.ok) throw new Error('Failed to post user to GAS');
  
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  
  return json.success;
};

// 機材リストの取得
export const getEquipmentFromSheet = async (context?: GasRequestContext) => {
  const url = getGasUrl();
  const res = await requestGasRead(`${url}?action=getEquipment`, context);
  if (!res.ok) throw new Error('Failed to fetch equipment from GAS');
  
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  
  return json.data || [];
};
