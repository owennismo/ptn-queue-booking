import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PTN Warehouse Control Center | ระบบจัดการคิวคลังสินค้า',
  description: 'ระบบศูนย์ควบคุมและบริหารจัดการคิวขนส่งสินค้า - บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)',
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-portal-wrapper min-h-screen bg-slate-900 text-slate-100">
      {children}
    </div>
  );
}
