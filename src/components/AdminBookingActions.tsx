'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminBookingActions({ bookingId, currentStatus }: { bookingId: string, currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isActive = currentStatus === 'ACTIVE' || !currentStatus;

  const handleToggle = async () => {
    if (!window.confirm(isActive ? 'この予約を取り消しますか？\n(自己キャンセル扱いとなります)' : '取り消した予約を復元しますか？')) return;
    setLoading(true);
    try {
      const newStatus = isActive ? 'CANCELED' : 'ACTIVE';
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStatus', bookingId, status: newStatus })
      });
      if (res.ok) {
        alert("ステータスを更新しました");
        // Hard reload ensures no stale cached state is rendered
        window.location.reload();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || '変更に失敗しました。');
      }
    } catch {
      alert('ネットワークエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleNoShow = async () => {
    if (!window.confirm('「来店なし」として処理しますか？\n※これを実行すると予約はキャンセルされ、ユーザーは即時BAN対象になります。')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/users/noshow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      });
      if (res.ok) {
        alert("ステータスを更新しました");
        window.location.reload();
      } else {
        alert('処理に失敗しました。');
      }
    } catch {
      alert('ネットワークエラー');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '5px' }}>
      <button 
        onClick={handleToggle} 
        disabled={loading}
        className="btn-outline" 
        style={{ 
          padding: '4px 8px', fontSize: '0.8rem', 
          color: isActive ? '#e53935' : '#4caf50',
          borderColor: isActive ? '#e53935' : '#4caf50',
          opacity: loading ? 0.5 : 1,
          minWidth: '70px'
        }}
      >
        {loading ? '処理中...' : (isActive ? 'キャンセル' : '復元')}
      </button>

      {isActive && (
        <button 
          onClick={handleNoShow} 
          disabled={loading}
          className="btn-outline" 
          style={{ 
            padding: '4px 8px', fontSize: '0.8rem', 
            color: '#ff9800',
            borderColor: '#ff9800',
            opacity: loading ? 0.5 : 1,
            whiteSpace: 'nowrap'
          }}
        >
          {loading ? '...' : '来店なし'}
        </button>
      )}
    </div>
  );
}
