import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import PWAInstallAndOffline from '@/components/PWAInstallAndOffline';

export const metadata: Metadata = {
  title: 'ระบบจองคิวส่งของ - บจก. พีทีเอ็น ฟาร์มาเซ็นเตอร์ (พัฒนาเภสัช)',
  description: 'ระบบจองคิวเข้าส่งสินค้าออนไลน์สำหรับผู้ขนส่งและคู่ค้า บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PTN จองคิว',
  },
};

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800&family=Prompt:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white text-base leading-relaxed">
        <PWAInstallAndOffline />
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <MobileBottomNav />
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-sm text-slate-600 no-print pb-20 sm:pb-6">
          <div className="max-w-7xl mx-auto px-4">
            <p className="font-semibold text-slate-800 text-sm">บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)</p>
            <p className="mt-1 text-xs text-slate-500">ระบบจองคิวรับ-ส่งสินค้าอัจฉริยะ Serverless Platform • รองรับ PWA</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
