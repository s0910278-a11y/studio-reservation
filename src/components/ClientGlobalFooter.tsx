'use client';
import { usePathname } from 'next/navigation';

export default function ClientGlobalFooter() {
  const pathname = usePathname();

  // /display ページではフッターを表示しない（100vh一画面構成のため）
  if (pathname === '/display') {
    return null;
  }

  return (
    <footer style={{ backgroundColor: "#000", padding: "40px 0", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem", borderTop: "1px solid #333" }}>
      <p>© Hard Off Hachioji Owada Studio. All Rights Reserved.</p>
    </footer>
  );
}
