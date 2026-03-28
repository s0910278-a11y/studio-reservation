'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminUserBanToggle({ memberNo, initialBanStatus }: { memberNo: string, initialBanStatus: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    const actionName = initialBanStatus ? '解除' : 'アカウントを停止';
    if (!window.confirm(`${actionName}しますか？`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/users/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberNo, banStatus: !initialBanStatus })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('更新に失敗しました。');
      }
    } catch {
      alert('エラーが発生しました。');
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
        padding: '4px 8px', fontSize: '0.8rem', 
        color: initialBanStatus ? 'white' : '#e53935', 
        backgroundColor: initialBanStatus ? '#e53935' : 'transparent',
        borderColor: '#e53935',
        opacity: loading ? 0.5 : 1
      }}
    >
      {loading ? '処理中...' : (initialBanStatus ? '解除' : 'アカウント停止')}
    </button>
  );
}
