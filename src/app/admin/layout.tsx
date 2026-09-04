import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'PTN Warehouse Control Center | ระบบจัดการคิวคลังสินค้า',
  description: 'ระบบศูนย์ควบคุมและบริหารจัดการคิวขนส่งสินค้า - บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)',
  manifest: '/admin-manifest.json',
  icons: {
    icon: '/admin-favicon.png',
    apple: '/admin-apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PTN Admin',
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <head>
        <link rel="manifest" href="/admin-manifest.json" />
        <link rel="apple-touch-icon" href="/admin-apple-touch-icon.png" />
        <link rel="icon" href="/admin-favicon.png" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-title" content="PTN Admin" />
      </head>
      <div className="admin-portal-wrapper min-h-screen bg-slate-900 text-slate-100">
        {children}
      </div>
    </>
  );
}
