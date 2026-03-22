import React from 'react';
import AdminCalendarWrapper from '../../components/AdminCalendarWrapper';
import AutoRefresh from '../../components/AutoRefresh';
import AdminBookingActions from '../../components/AdminBookingActions';
import AdminUserBanToggle from '../../components/AdminUserBanToggle';
import AdminCustomerForm from '../../components/AdminCustomerForm';
import { getBookingsFromSheet, getUsersFromSheet } from '../../lib/sheets';
export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const allBookings = await getBookingsFromSheet();
  const now = new Date();
  
  // 当日の日付文字列 (YYYY-MM-DD)
  const todayStr = now.toISOString().substring(0, 10);
  // 当月の初日 (YYYY-MM-01)
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // 「今後の予約」: 当日以降の予約（当日分は日が変わるまで含む）
  const upcomingBookings = allBookings
    .filter((b: any) => {
      const dateStr = (b['日付'] || '').substring(0, 10);
      if (!dateStr) return false;
      return dateStr >= todayStr;
    })
    .sort((a: any, b: any) => {
      const dateCompare = (a['日付'] || '').localeCompare(b['日付'] || '');
      if (dateCompare !== 0) return dateCompare;
      return (a['開始時間'] || '').localeCompare(b['開始時間'] || '');
    })
    .slice(0, 200);

  // 「終了分」: 当月内で前日以前の予約（履歴表示用）
  const pastBookings = allBookings
    .filter((b: any) => {
      const dateStr = (b['日付'] || '').substring(0, 10);
      if (!dateStr) return false;
      // 当月の範囲内 かつ 前日以前
      return dateStr >= thisMonthStart && dateStr < todayStr;
    })
    .sort((a: any, b: any) => {
      // 新しい順で表示
      const dateCompare = (b['日付'] || '').localeCompare(a['日付'] || '');
      if (dateCompare !== 0) return dateCompare;
      return (b['開始時間'] || '').localeCompare(a['開始時間'] || '');
    })
    .slice(0, 200);

  const users = await getUsersFromSheet();

  // テーブル行レンダー用の共通関数
  const renderBookingRow = (b: any, i: number) => {
    const isCanceled = typeof b['ステータス'] === 'string' && b['ステータス'].startsWith('CANCELED');
    return (
      <tr key={i} style={{ borderBottom: '1px solid #333', opacity: isCanceled ? 0.5 : 1 }}>
        <td style={{ padding: '10px', textDecoration: isCanceled ? 'line-through' : 'none' }}>
          {new Date(b['日付']).toLocaleDateString()} {b['開始時間']}
        </td>
        <td style={{ padding: '10px', textDecoration: isCanceled ? 'line-through' : 'none' }}>{b['スタジオ']}</td>
        <td style={{ padding: '10px' }}>
          <span style={{ textDecoration: isCanceled ? 'line-through' : 'none' }}>{b['お名前']}</span> 
          <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '5px' }}>({b['会員ナンバー']})</span>
          {isCanceled && (
            <span style={{ marginLeft: '10px', fontSize: '0.75rem', color: '#e53935', border: '1px solid #e53935', padding: '2px 4px', borderRadius: '4px' }}>取消済</span>
          )}
        </td>
        <td style={{ padding: '10px' }}>
          <AdminBookingActions bookingId={b['予約ID']} currentStatus={b['ステータス']} />
        </td>
      </tr>
    );
  };

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '40px 20px' }}>
      <AutoRefresh intervalMs={15000} />
      <h1 className="section-title">管理者ダッシュボード</h1>
      
      <div className="panel" style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '20px' }}>ブロック・手動予約操作 (カレンダー)</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
          電話予約やメンテナンス等の理由でスタジオをブロック・手動予約したい場合は、以下のカレンダーから空き枠（青い枠）をクリックしてください。<br/>
          ここで登録された枠は一般予約画面のカレンダーにも即座に反映され、二重予約を防止します。
        </p>
        <AdminCalendarWrapper />
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* Bookings Tables */}
        <div style={{ flex: '2', minWidth: '400px' }}>
          
          {/* 今後の予約 */}
          <div className="panel" style={{ marginBottom: '20px' }}>
            <h3>📅 今後の予約</h3>
            <div style={{ maxHeight: '500px', overflowY: 'auto', marginTop: '10px', paddingRight: '10px', borderTop: '1px solid #444', borderBottom: '1px solid #444' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#1a1a1a', zIndex: 1, boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
                  <tr>
                    <th style={{ padding: '10px' }}>日時</th>
                    <th style={{ padding: '10px' }}>スタジオ</th>
                    <th style={{ padding: '10px' }}>お名前</th>
                    <th style={{ padding: '10px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingBookings.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '10px', textAlign: 'center' }}>予約がありません</td></tr>
                  ) : (
                    upcomingBookings.map(renderBookingRow)
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 終了分 (当月内) */}
          <div className="panel">
            <h3 style={{ color: '#888' }}>📋 終了分（当月の履歴）</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '10px', paddingRight: '10px', borderTop: '1px solid #333', borderBottom: '1px solid #333' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#1a1a1a', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '10px', color: '#888' }}>日時</th>
                    <th style={{ padding: '10px', color: '#888' }}>スタジオ</th>
                    <th style={{ padding: '10px', color: '#888' }}>お名前</th>
                    <th style={{ padding: '10px', color: '#888' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pastBookings.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '10px', textAlign: 'center', color: '#666' }}>当月の終了済み予約はありません</td></tr>
                  ) : (
                    pastBookings.map(renderBookingRow)
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="panel" style={{ flex: '1', minWidth: '300px' }}>
          <h3>顧客管理 (BAN操作)</h3>
          <ul style={{ marginTop: '20px', listStyle: 'none' }}>
            {users.length === 0 ? <li style={{ color: '#888' }}>顧客情報なし</li> : users.map((u: any, i: number) => (
              <li key={i} style={{ padding: '10px 0', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div>{u['お名前']} <span style={{ fontSize: '0.8rem', color: '#888' }}>{u['会員ナンバー']}</span></div>
                  <div style={{ fontSize: '0.8rem', color: Number(u['キャンセル回数']) >= 3 ? '#e53935' : '#888', fontWeight: Number(u['キャンセル回数']) >= 3 ? 'bold' : 'normal' }}>
                    キャンセル回数: {u['キャンセル回数']}
                    {u['ご利用回数'] !== undefined && <span style={{ marginLeft: '10px', color: '#4caf50' }}>利用回数: {u['ご利用回数'] || 0}</span>}
                    {Number(u['キャンセル回数']) >= 3 && !(u['利用停止フラグ'] === 'true' || u['利用停止フラグ'] === true) && (
                       <span style={{ marginLeft: '10px', backgroundColor: '#e53935', color: 'white', padding: '2px 4px', borderRadius: '4px', fontSize: '0.7rem' }}>要BAN対応</span>
                    )}
                  </div>
                </div>
                <AdminUserBanToggle 
                  memberNo={u['会員ナンバー']} 
                  initialBanStatus={u['利用停止フラグ'] === 'true' || u['利用停止フラグ'] === true} 
                />
              </li>
            ))}
          </ul>
          
          <div style={{ marginTop: '30px', borderTop: '1px solid #333', paddingTop: '20px' }}>
            <AdminCustomerForm />
          </div>
        </div>
      </div>
    </div>
  );
}
