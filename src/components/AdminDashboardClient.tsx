'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminCalendarWrapper from './AdminCalendarWrapper';
import AdminBookingActions from './AdminBookingActions';
import AdminUserBanToggle from './AdminUserBanToggle';
import AdminCustomerForm from './AdminCustomerForm';

export default function AdminDashboardClient() {
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch('/api/admin/data', { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'データの取得に失敗しました。');

      setAllBookings(data.bookings || []);
      
      // 【BAN表示】利用停止中 または キャンセル過多（3回以上）の顧客を表示
      const filteredUsers = (data.users || []).filter((u: any) => {
        const stopKey = Object.keys(u).find(k => k.includes('利用停止'));
        const isStopped = !!(stopKey && String(u[stopKey]).toLowerCase() === 'true');
        const cancelCount = Number(u['キャンセル回数']) || 0;
        return isStopped || cancelCount >= 3;
      });
      setUsers(filteredUsers);
      setError(null);
    } catch (err: any) {
      console.error('Admin API fetch error:', err);
      // 初回のリクエストが失敗した場合のみ大きなエラー画面を表示するためのフラグ
      if (isInitial) {
        setError(err.message || '通信エラーが発生しました。');
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 20000); // 20秒ごとに自動更新
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '200px auto', textAlign: 'center' }}>
        <div className="spinner" style={{ marginBottom: '20px' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>データを読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '800px', margin: '100px auto', textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#e53935', fontSize: '1.5rem', marginBottom: '20px' }}>通信エラー（タイムアウト等）</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', lineHeight: '1.6' }}>
          データベースからの応答制限時間を超過したか、一時的な通信エラーが発生しました。<br />
          {error}
        </p>
        <button 
          onClick={() => fetchData(true)}
          style={{ cursor: 'pointer', display: 'inline-block', backgroundColor: 'var(--accent-blue)', color: 'white', padding: '12px 30px', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}
        >
          再読み込みする
        </button>
      </div>
    );
  }

  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const upcomingBookings = allBookings
    .filter((b: any) => {
      const dateStr = (b.date || '').substring(0, 10);
      if (!dateStr) return false;
      return dateStr >= todayStr;
    })
    .sort((a: any, b: any) => {
      const dateCompare = (a.date || '').localeCompare(b.date || '');
      if (dateCompare !== 0) return dateCompare;
      return (a.startTime || '').localeCompare(b.startTime || '');
    })
    .slice(0, 200);

  const pastBookings = allBookings
    .filter((b: any) => {
      const dateStr = (b.date || '').substring(0, 10);
      if (!dateStr) return false;
      return dateStr >= thisMonthStart && dateStr < todayStr;
    })
    .sort((a: any, b: any) => {
      const bDate = (b.date || '').substring(0, 10);
      const aDate = (a.date || '').substring(0, 10);
      const dateCompare = bDate.localeCompare(aDate);
      if (dateCompare !== 0) return dateCompare;
      return (b.startTime || '').localeCompare(a.startTime || '');
    })
    .slice(0, 200);
  
  // 売上計算ヘルパー: (終了時間 - 開始時間) * 人数 * 440円
  const calculateBookingRevenue = (b: any) => {
    if (!b.startTime || !b.endTime || !b.peopleCount) return 0;
    const isCanceled = typeof b.status === 'string' && b.status.startsWith('CANCELED');
    if (isCanceled) return 0;

    try {
      const [startH, startM] = b.startTime.split(':').map(Number);
      const [endH, endM] = b.endTime.split(':').map(Number);
      const durationHours = (endH * 60 + endM - (startH * 60 + startM)) / 60;
      const people = Number(b.peopleCount) || 1;
      return Math.round(people * 440 * durationHours);
    } catch (e) {
      return 0;
    }
  };

  const totalMonthlyRevenue = pastBookings.reduce((sum, b) => sum + calculateBookingRevenue(b), 0);

  const renderBookingRow = (b: any, i: number) => {
    const isCanceled = typeof b.status === 'string' && b.status.startsWith('CANCELED');
    return (
      <tr key={i} title={isCanceled ? `キャンセル済み` : `${(b.name || '').replace('【手動登録】', '')}様 (${b.peopleCount || '?'}名)`} style={{ borderBottom: '1px solid #eee', opacity: isCanceled ? 0.5 : 1 }}>
        <td style={{ padding: '10px', textDecoration: isCanceled ? 'line-through' : 'none' }}>
          {new Date(b.date).toLocaleDateString()} {b.startTime}
        </td>
        <td style={{ padding: '10px', textDecoration: isCanceled ? 'line-through' : 'none' }}>{b.studioId}</td>
        <td style={{ padding: '10px' }}>
          <span style={{ textDecoration: isCanceled ? 'line-through' : 'none' }}>{(b.name || '').replace('【手動登録】', '')}</span> 
          <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '5px' }}>({b.memberNo})</span>
          {isCanceled && (
            <span style={{ marginLeft: '10px', fontSize: '0.75rem', color: '#e53935', border: '1px solid #e53935', padding: '2px 4px', borderRadius: '4px' }}>取消済</span>
          )}
        </td>
        <td style={{ padding: '10px' }}>
          <AdminBookingActions bookingId={b.bookingId} currentStatus={b.status} />
        </td>
      </tr>
    );
  };

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 className="section-title">管理者ダッシュボード</h1>
      
      <div className="panel" style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '20px' }}>ブロック・手動予約操作 (カレンダー)</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
          電話予約やメンテナンス等の理由でスタジオをブロック・手動予約したい場合は、以下のカレンダーから空き枠（白い枠）をクリックしてください。<br/>
          ここで登録された枠は一般予約画面のカレンダーにも即座に反映され、二重予約を防止します。
        </p>
        <AdminCalendarWrapper bookings={allBookings} />
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '2', minWidth: '400px' }}>
          <div className="panel" style={{ marginBottom: '20px' }}>
            <h3>📅 今後の予約</h3>
            <div style={{ maxHeight: '500px', overflowY: 'auto', marginTop: '10px', paddingRight: '10px', borderTop: '1px solid #eee', borderBottom: '1px solid #eee' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fcfcfc', zIndex: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
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

          <div className="panel" style={{ borderLeft: '4px solid #ddd', backgroundColor: '#fafafa' }}>
            <h3 style={{ color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>📋</span> 終了分（当月の履歴）
              </span>
              <span style={{ fontSize: '0.9rem', backgroundColor: '#e3f2fd', color: 'var(--accent-blue)', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
                今月の売上額: ¥{totalMonthlyRevenue.toLocaleString()}
              </span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '10px' }}>※前日までの完了済み予約が表示されます。月が変わるとリセットされます。</p>
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '10px', paddingRight: '10px', borderTop: '1px solid #eee', borderBottom: '1px solid #eee' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f8f8', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '10px', color: '#666', fontSize: '0.9rem' }}>日時</th>
                    <th style={{ padding: '10px', color: '#666', fontSize: '0.9rem' }}>スタジオ</th>
                    <th style={{ padding: '10px', color: '#666', fontSize: '0.9rem' }}>お名前</th>
                    <th style={{ padding: '10px', color: '#666', fontSize: '0.9rem' }}>詳細</th>
                  </tr>
                </thead>
                <tbody>
                  {pastBookings.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>当月の終了済み予約はありません</td></tr>
                  ) : (
                    pastBookings.map((b: any, i: number) => {
                      const isCanceled = typeof b.status === 'string' && b.status.startsWith('CANCELED');
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '8px 10px', fontSize: '0.9rem', textDecoration: isCanceled ? 'line-through' : 'none', color: '#666' }}>
                            {b.date ? new Date(b.date).toLocaleDateString() : '---'} {b.startTime}
                          </td>
                          <td style={{ padding: '8px 10px', fontSize: '0.9rem', textDecoration: isCanceled ? 'line-through' : 'none', color: '#666' }}>{b.studioId}</td>
                          <td style={{ padding: '8px 10px', fontSize: '0.9rem', color: '#666' }}>
                            <span style={{ textDecoration: isCanceled ? 'line-through' : 'none' }}>{b.name || '(名称未設定)'}</span>
                            {isCanceled && (
                              <span style={{ marginLeft: '5px', fontSize: '0.7rem', color: '#999' }}>(取消済)</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                             <span style={{ fontSize: '0.75rem', color: '#888', border: '1px solid #ddd', padding: '2px 4px', borderRadius: '4px' }}>
                                {b.status === 'COMPLETED' ? '完了' : (isCanceled ? '終了' : '履歴')}
                             </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="panel" style={{ flex: '1', minWidth: '300px' }}>
          <h3>顧客管理 (BAN操作)</h3>
          <ul style={{ marginTop: '20px', listStyle: 'none' }}>
            {users.length === 0 ? <li style={{ color: '#999' }}>顧客情報なし</li> : users.map((u: any, i: number) => {
              const refusedKey = Object.keys(u).find(k => k.includes('拒否') || k.includes('拒絶'));
              const isRefused = !!(refusedKey && String(u[refusedKey]).toLowerCase() === 'true');

              return (
                <li key={i} style={{ padding: '12px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                      {u['お名前']} 
                      <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '8px' }}>({u['会員ナンバー']})</span>
                      { isRefused ? (
                         <span style={{ marginLeft: '10px', backgroundColor: '#e53935', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>アカウント停止中</span>
                      ) : (
                         <span style={{ marginLeft: '10px', backgroundColor: '#fb8c00', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>予約制限候補者</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                      キャンセル回数: <span style={{ color: '#e53935', fontWeight: 'bold' }}>{u['キャンセル回数']}</span>
                      {u['ご利用回数'] !== undefined && <span style={{ marginLeft: '10px', color: '#388e3c' }}>利用回数: {u['ご利用回数'] || 0}</span>}
                    </div>
                  </div>
                  <AdminUserBanToggle 
                    memberNo={u['会員ナンバー']} 
                    initialBanStatus={isRefused} 
                  />
                </li>
              );
            })}
          </ul>
          
          <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <AdminCustomerForm />
          </div>
        </div>
      </div>
    </div>
  );
}
