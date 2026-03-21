'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CancelButtonProps {
  bookingId: string;
  currentStatus: string;
}

export default function CancelButton({ bookingId, currentStatus }: CancelButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isActive = currentStatus === 'ACTIVE' || !currentStatus;

  const handleToggle = async () => {
    if (!window.confirm(isActive ? 'この予約をキャンセルしますか？' : 'このキャンセルを取り消して復元しますか？')) {
      return;
    }
    setLoading(true);
    try {
      const newStatus = isActive ? 'CANCELED' : 'ACTIVE';
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStatus', bookingId, status: newStatus })
      });
      if (res.ok) {
        // 更新成功後、画面を再取得
        router.refresh();
      } else {
        alert('変更に失敗しました。');
      }
    } catch (err) {
      alert('ネットワークエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleToggle} 
      disabled={loading}
      className="btn-outline" 
      style={{ 
        padding: '4px 8px', 
        fontSize: '0.8rem', 
        color: isActive ? '#e53935' : '#4caf50',
        borderColor: isActive ? '#e53935' : '#4caf50',
        opacity: loading ? 0.5 : 1
      }}
    >
      {loading ? '処理中...' : (isActive ? 'キャンセル' : '復元')}
    </button>
  );
}
