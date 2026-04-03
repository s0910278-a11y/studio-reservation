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
    <header style={{ backgroundColor: "#fff", padding: "15px 0", borderBottom: "1px solid var(--border-color)" }}>
      <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ backgroundColor: "#0066cc", color: "white", padding: "4px 8px", fontWeight: "bold", fontSize: "1.2rem" }}>HARD OFF</span>
          <span style={{ color: "#333", fontWeight: "bold", fontSize: "1.2rem", letterSpacing: "1px" }}>MUSIC STUDIO</span>
        </div>
        <Navigation />
      </div>
    </header>
  );
}
