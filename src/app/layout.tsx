import type { Metadata } from "next";
import "./globals.css";
import ClientGlobalHeader from "../components/ClientGlobalHeader";
import ClientGlobalFooter from "../components/ClientGlobalFooter";

export const metadata: Metadata = {
  title: "ハードオフ八王子大和田店 楽器スタジオ予約",
  description: "八王子で最高の音を。ハードオフ八王子大和田店楽器スタジオの予約サイトです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientGlobalHeader />
        <main>{children}</main>
        <ClientGlobalFooter />
      </body>
    </html>
  );
}

