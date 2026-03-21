'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * サーバーコンポーネントを定期的に再読み込み（最新化）するためのクライアントコンポーネント
 */
export default function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh(); // SCの再フェッチをトリガー
    }, intervalMs);
    
    return () => clearInterval(interval);
  }, [router, intervalMs]);

  return null;
}
