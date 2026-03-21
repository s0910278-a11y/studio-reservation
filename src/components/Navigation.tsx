'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Navigation() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) {
    return (
      <nav style={{ display: "flex", gap: "10px", alignItems: 'center' }}>
        <a href="/" target="_blank" className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.9rem', color: '#fff', textDecoration: 'none', border: '1px solid #555', whiteSpace: 'nowrap' }}>
          ↗ お客様画面起動
        </a>
        <a href="/display" target="_blank" className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.9rem', color: '#fff', textDecoration: 'none', backgroundColor: '#3b82f6', border: 'none', whiteSpace: 'nowrap' }}>
          ↗ 空き状況画面起動
        </a>
      </nav>
    );
  }

  return (
    <nav style={{ display: "flex", flexWrap: "wrap", gap: "20px", fontSize: "0.9rem", color: "var(--text-secondary)", alignItems: 'center' }}>
      <a href="/#booking" style={{ textDecoration: 'none', color: 'inherit' }}>予約・空き状況</a>
      <a href="/#price" style={{ textDecoration: 'none', color: 'inherit' }}>料金</a>
      <a href="/#equipment" style={{ textDecoration: 'none', color: 'inherit' }}>機材</a>
      <a href="/#access" style={{ textDecoration: 'none', color: 'inherit' }}>アクセス</a>
      <a href="https://x.com/hardoffgakkikan?ref_src=twsrc%5Etfw" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#1DA1F2', fontWeight: 'bold', textDecoration: 'none' }}>
        <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '18px', fill: 'currentColor' }}><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.007 4.15H5.059z"></path></g></svg>
        公式X
      </a>
    </nav>
  );
}
