import type { Metadata } from "next";
import "./globals.css";
import ClientGlobalHeader from "../components/ClientGlobalHeader";
import ClientGlobalFooter from "../components/ClientGlobalFooter";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zeroemission-reserve.netlify.app';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "ハードオフ八王子大和田店 楽器スタジオ予約",
    template: "%s | ハードオフ八王子大和田店 楽器スタジオ"
  },
  description: "ハードオフ八王子大和田店楽器スタジオの公式予約サイトです。24時間ネット予約受付中。",
  keywords: ["ハードオフ", "八王子", "大和田", "スタジオ", "楽器スタジオ", "スタジオ予約", "練習スタジオ"],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "ハードオフ八王子大和田店 楽器スタジオ予約",
    description: "公式予約サイトから今すぐ空き状況をチェック。",
    url: baseUrl,
    siteName: "ハードオフ八王子大和田店 楽器スタジオ",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ハードオフ八王子大和田店 楽器スタジオ予約",
    description: "公式予約サイトから今すぐ空き状況をチェック。",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "AwPOe9_DZRd6woXh1BcF5SpsGyf5h5GvrmLJjkMhXKs",
  }
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

