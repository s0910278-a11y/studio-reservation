'use client';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function CancelContent() {
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

    // GASのWebアプリURLにリダイレクト
    const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL;
    if (gasUrl) {
      setStatus('redirecting');
      window.location.href = `${gasUrl}?token=${token}`;
      return;
    }

    // gasUrlが取得できない場合はエラー表示
    setStatus('error');
    setMessage('キャンセル処理の設定が不完全です。お手数ですが店舗までお問い合わせください。');
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

export default function CancelPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888' }}>読み込み中...</p>
      </div>
    }>
      <CancelContent />
    </Suspense>
  );
}
