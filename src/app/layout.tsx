// "use client";
import './globals.css';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import Link from 'next/link';
import Header from '../components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'QuickTools',
  description: 'Online background removal tool using AI',
  verification: {
    google: '-SgV6VIRvfRUUP3Qp7ejZw4HCjo8hRLeis0upVAPsSU',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <Script
        strategy="afterInteractive"
        src="https://www.googletagmanager.com/gtag/js?id=G-YT0ZDBKL81"
      />
      <Script id="google-analytics-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-YT0ZDBKL81');
        `}
      </Script>
      <body className={inter.className}>
        <Header />

        <main className="flex-grow">
          {children}
        </main>

        <footer className="bg-gray-800 text-white p-4 mt-8 text-center">
          <div className="container mx-auto">
            <div className="flex justify-center space-x-4 mb-2">
              <Link href="/" className="hover:underline">
                トップ
              </Link>
              <Link href="/" className="hover:underline">
                イージーカット
              </Link>
              <Link href="/trim" className="hover:underline">
                イージートリミング
              </Link>
              <Link href="/privacy-policy" className="hover:underline">
                プライバシーポリシー
              </Link>
            </div>
            <p>© 2025 QuickTools. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
