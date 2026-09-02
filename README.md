# ระบบจองคิวเข้าส่งของ บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)

ระบบ Web Application จองคิวส่งของออนไลน์ระดับองค์กร รองรับการทำงานแบบ Serverless พร้อมรองรับ Progressive Web App (PWA) บนมือถือและแท็บเล็ต

---

## 🌟 ฟีเจอร์หลัก (Key Features)

### 🟢 1. ผู้จองคิว (Guest Booking Flow)
- **ไม่ต้องลงทะเบียนหรือ Login**: ผู้ส่งของหรือคู่ค้าสามารถเข้าเว็บไซต์และจองคิวได้ทันที
- **ตรวจสอบความจุรอบเวลา Real-time**: ป้องกันการจองเกินจำนวนที่กำหนดในแต่ละรอบเวลา (Overbooking Prevention)
- **ระบบป้องกันวันหยุด & วันปิดรับจอง (Blocked Dates)**: ป้องกันไม่ให้จองในวันหยุดหรือวันที่ฝ่ายคลังสินค้าปิดตรวจนับสต็อก
- **บัตรคิวดิจิทัล & QR Code**: เมื่อจองสำเร็จจะได้รับ Booking ID พร้อม QR Code และสถานะ `Pending` สามารถบันทึกหรือสั่งพิมพ์บัตรคิวได้ทันที
- **ค้นหาและตรวจสอบสถานะคิว (Track Queue)**: ตรวจสอบสถานะการอนุมัติได้ง่ายด้วย Booking ID หรือเบอร์โทรศัพท์

### 🔵 2. ฝ่ายคลังสินค้าและผู้ดูแลระบบ (Admin / Staff Flow)
- **Admin Dashboard**: แสดงภาพรวมคิวประจำวัน, สถานะ Pending, Approved, Rejected, Cancelled และยอดรวมจำนวนพาเลท/รถ
- **ระบบแจ้งเตือนล่วงหน้า (Scheduler Alert)**: แสดงสรุปจำนวนคิวของวันพรุ่งนี้ เช่น *"พรุ่งนี้มีคิวที่ต้องรับการจัดการทั้งหมด X รายการ"*
- **การอนุมัติและปฏิเสธคิว (Approve / Reject)**:
  - อนุมัติคิวได้ในคลิกเดียว
  - กรณีปฏิเสธคิว (Reject) ระบบ **บังคับให้ระบุเหตุผล** เพื่อแจ้งให้ผู้ส่งทราบ
- **ระบบยกเลิกคิว 2 ขั้นตอน (Multi-Step Cancellation Safety)**:
  - ขั้นตอนที่ 1: ระบุเหตุผลในการยกเลิก
  - ขั้นตอนที่ 2: กรอกรหัสยืนยัน (Booking ID หรือ CONFIRM) เพื่อป้องกันการกดผิดพลาด
- **บริหารความจุรอบเวลา (Capacity Management)**: ปรับจำนวนคิวสูงสุดต่อรอบเวลา และเปิด-ปิดรอบเวลาได้อิสระ
- **ปิดรับจองเฉพาะวัน (Date Blocking)**: กำหนดวันหยุดหรือวันปิดตรวจนับสต็อกพร้อมระบุเหตุผล
- **ส่งออกข้อมูล (Export CSV & Print)**: ส่งออกรายการคิวเป็นไฟล์ CSV และสั่งพิมพ์เอกสารรายงานประจำวัน

---

## 🚀 วิธีการติดตั้งและรันในเครื่อง (Local Development)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. รันโหมด Development
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่: `http://localhost:3000`

### 3. ข้อมูลสำหรับเข้าสู่ระบบ Admin
- **URL**: `http://localhost:3000/admin`
- **รหัส PIN เจ้าหน้าที่ (Default PIN)**: `8888`

---

## ☁️ วิธีการ Deploy ขึ้น Cloudflare Pages & D1

### 1. ติดตั้ง Wrangler CLI
```bash
npm install -g wrangler
```

### 2. สร้างฐานข้อมูล Cloudflare D1
```bash
wrangler d1 create ptn_queue_d1
```
นำ `database_id` ที่ได้ไปใส่ในไฟล์ `wrangler.toml`

### 3. รันคำสั่ง Execute Schema ไปยัง D1
```bash
wrangler d1 execute ptn_queue_d1 --file=./schema.sql
```

### 4. Deploy Next.js App สู่ Cloudflare Pages
```bash
npm run build
npx @cloudflare/next-on-pages
```

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```
├── schema.sql                   # โครงสร้างฐานข้อมูล D1 / SQLite
├── wrangler.toml                # การตั้งค่า Cloudflare Workers / D1 Binding
├── public/
│   ├── manifest.json            # PWA Web App Manifest
│   └── icon.svg                 # ไอคอนประจำแอป PTN Pharma
├── src/
│   ├── app/
│   │   ├── page.tsx             # หน้าจองคิวสำหรับ Guest
│   │   ├── booking/[id]/page.tsx# หน้าบัตรคิวดิจิทัล + QR Code + พิมพ์
│   │   ├── track/page.tsx       # หน้าค้นหาและติดตามสถานะคิว
│   │   ├── admin/
│   │   │   ├── page.tsx         # หน้า Admin Dashboard, Capacity, Block Dates
│   │   │   └── login/page.tsx   # หน้า Login ใส่ PIN เจ้าหน้าที่
│   │   └── api/
│   │       ├── availability/    # API เช็คความจุรอบเวลาและวันปิดรับจอง
│   │       ├── bookings/        # API สร้างและค้นหาคิว
│   │       ├── admin/bookings/  # API จัดการคิว, Approve, Reject, Cancel
│   │       ├── admin/settings/  # API บริหารความจุและตั้งค่าวันปิดจอง
│   │       ├── admin/forecast/  # API สรุปคิวล่วงหน้าแจ้งเตือน Admin
│   │       └── admin/auth/      # API ยืนยันรหัส PIN
│   ├── components/
│   │   └── Navbar.tsx           # Navigation bar ส่วนหัว
│   └── lib/
│       ├── db.ts                # Database connector (SQLite & D1 ready)
│       └── types.ts             # TypeScript interfaces
```

---
พัฒนาเพื่อ **บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)**
