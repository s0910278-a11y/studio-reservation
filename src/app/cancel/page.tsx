'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function CancelPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'processing' | 'done' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('無効なリンクです。');
      return;
    }

    // GASのWebアプリURLを取得してリダイレクト
    const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL;
    if (gasUrl) {
      setStatus('redirecting');
      window.location.href = `${gasUrl}?token=${token}`;
      return;
    }

    // gasUrlが取得できない場合はAPI経由でキャンセル処理
    setStatus('processing');
    fetch('/api/bookings/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('done');
          setMessage('ご予約のキャンセル手続きが完了しました。またのご利用を心よりお待ちしております。');
        } else {
          setStatus('error');
          setMessage(data.error || 'キャンセル処理に失敗しました。');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('ネットワークエラーが発生しました。');
      });
  }, [token]);

  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px'
    }}>
      <div style={{
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '440px',
        width: '100%',
        textAlign: 'center'
      }}>
        {(status === 'loading' || status === 'redirecting' || status === 'processing') && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '20px' }}>⏳</div>
            <h2 style={{ color: 'white', marginBottom: '10px' }}>
              {status === 'redirecting' ? 'リダイレクト中...' : 'キャンセル処理中...'}
            </h2>
            <p style={{ color: '#888' }}>しばらくお待ちください。</p>
          </>
        )}

        {status === 'done' && (
          <>
            <div style={{ fontSize: '3rem', color: '#2ecc71', marginBottom: '20px' }}>✓</div>
            <h2 style={{ color: 'white', marginBottom: '15px' }}>キャンセルを受け付けました</h2>
            <p style={{ color: '#aaa', lineHeight: '1.6' }}>{message}</p>
            <hr style={{ border: '0', borderTop: '1px solid #333', margin: '25px 0' }} />
            <p style={{ color: '#666', fontSize: '0.85rem' }}>ハードオフ八王子大和田店 楽器スタジオ</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '3rem', color: '#e53935', marginBottom: '20px' }}>✕</div>
            <h2 style={{ color: 'white', marginBottom: '15px' }}>エラー</h2>
            <p style={{ color: '#aaa', lineHeight: '1.6' }}>{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
