'use client';
import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function ClientGlobalHeader() {
  const pathname = usePathname();

  // /display ページでは共通ヘッダー（Navigation含むメニュー類）を表示しない
  if (pathname === '/display') {
    return null;
  }

  return (
    <header style={{ backgroundColor: "#000", padding: "15px 0", borderBottom: "1px solid #333" }}>
      <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ backgroundColor: "var(--accent-blue)", color: "white", padding: "4px 8px", fontWeight: "bold", fontSize: "1.2rem" }}>HARD OFF</span>
          <span style={{ color: "#ffd700", fontWeight: "bold", fontSize: "1.2rem", letterSpacing: "1px" }}>MUSIC STUDIO</span>
        </div>
        <Navigation />
      </div>
    </header>
  );
}
