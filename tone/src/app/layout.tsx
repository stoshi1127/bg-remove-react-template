import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import QuickToolsHeader from "../components/QuickToolsHeader";
import QuickToolsFooter from "../components/QuickToolsFooter";

const inter = Inter({
  variable: "--qt-font-family-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--qt-font-family-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EasyTone - QuickTools",
  description: "3ステップで簡単に画像にプロのようなトーンを適用。QuickToolsファミリーの画像処理ツール。",
  keywords: "画像処理, フィルター, トーン調整, 写真編集, QuickTools",
  authors: [{ name: "QuickTools" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
  openGraph: {
    title: "EasyTone - QuickTools",
    description: "3ステップで簡単に画像にプロのようなトーンを適用",
    type: "website",
    locale: "ja_JP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <QuickToolsHeader currentTool="EasyTone" />
        <main style={{ flex: 1 }}>
          {children}
        </main>
        <QuickToolsFooter />
      </body>
    </html>
  );
}
