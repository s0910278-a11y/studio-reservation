'use client';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function CancelContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'confirm' | 'loading' | 'redirecting' | 'processing' | 'done' | 'error'>('confirm');
  const [message, setMessage] = useState('');

  const handleCancel = () => {
    if (!token) return;

    // GASのWebアプリURLにリダイレクト
    const gasUrl = "https://script.google.com/macros/s/AKfycbxOE4x6w2NNbbrXJ_NSqf2CaTT5LaWvKflPzQnB-jkOuh9mg2IwA9nPcky6fPqcM3Tz4w/exec";
    if (gasUrl) {
      setStatus('redirecting');
      window.location.href = `${gasUrl}?token=${token}`;
      return;
    }

    setStatus('error');
    setMessage('キャンセル処理の設定が不完全です。お手数ですが店舗までお問い合わせください。');
  };

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('無効なリンクです。');
    }
  }, [token]);

  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      backgroundColor: 'var(--background-dark)'
    }}>
      <div style={{
        backgroundColor: 'white',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)'
      }}>
        {status === 'confirm' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '15px', fontSize: '1.5rem' }}>予約のキャンセル確認</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '30px' }}>
              予約をキャンセルします。よろしいですか？<br/>
              <span style={{ fontSize: '0.85rem', color: '#e53935' }}>※この操作は取り消せません。</span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={handleCancel}
                className="btn-primary"
                style={{ backgroundColor: '#e53935' }}
              >
                予約をキャンセルする
              </button>
              <a href="/" className="btn-outline">
                戻る
              </a>
            </div>
          </>
        )}

        {(status === 'loading' || status === 'redirecting' || status === 'processing') && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '20px' }}>⏳</div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
              {status === 'redirecting' ? 'リダイレクト中...' : 'キャンセル処理中...'}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>しばらくお待ちください。</p>
          </>
        )}

        {status === 'done' && (
          <>
            <div style={{ fontSize: '3rem', color: 'var(--success-color)', marginBottom: '20px' }}>✓</div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '15px' }}>キャンセルを受け付けました</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{message}</p>
            <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '25px 0' }} />
            <a href="/" className="btn-primary">トップページへ</a>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '3rem', color: 'var(--error-color)', marginBottom: '20px' }}>✕</div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '15px' }}>エラー</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{message}</p>
            <a href="/" className="btn-outline" style={{ marginTop: '20px', display: 'inline-block' }}>トップページへ</a>
          </>
        )}
        
        <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
           <p style={{ color: '#999', fontSize: '0.85rem' }}>ハードオフ八王子大和田店 楽器スタジオ</p>
        </div>
      </div>
    </div>
  );
}

export default function CancelPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>読み込み中...</p>
      </div>
    }>
      <CancelContent />
    </Suspense>
  );
}
