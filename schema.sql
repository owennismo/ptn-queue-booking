-- ====================================================================
-- Cloudflare D1 / SQLite Schema for PTN Pharma Center Delivery Queue System
-- บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)
-- ====================================================================

-- 1. ตารางข้อมูลการจองคิวส่งสินค้า (Bookings)
CREATE TABLE IF NOT EXISTS bookings (
    booking_id TEXT PRIMARY KEY,               -- รหัสการจอง เช่น PTN-20260902-8X19
    user_phone TEXT NOT NULL,                  -- เบอร์โทรศัพท์ผู้ส่ง
    carrier_name TEXT NOT NULL,                -- บริษัทขนส่ง (Kerry, Flash, รถร่วม, บจก. ขนส่ง)
    client_name TEXT NOT NULL,                 -- บริษัทเจ้าของสินค้า / ผู้รับปลายทาง
    pallet_count INTEGER NOT NULL DEFAULT 1,   -- จำนวนลัง / พาเลท
    vehicle_count INTEGER NOT NULL DEFAULT 1,  -- จำนวนรถ
    requested_date TEXT NOT NULL,              -- วันที่ต้องการเข้าส่ง (YYYY-MM-DD)
    requested_time TEXT NOT NULL,              -- ช่วงเวลา (เช่น "09:00 - 10:00")
    driver_name TEXT,                          -- ชื่อคนขับรถ
    license_plate TEXT,                        -- ทะเบียนรถ
    status TEXT NOT NULL DEFAULT 'Pending',    -- 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
    notes TEXT,                                -- หมายเหตุเพิ่มเติม
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    admin_action_date DATETIME,                -- วันเวลาที่เปลี่ยนสถานะ
    admin_action_by TEXT,                      -- ผู้ดำเนินการ (Admin)
    admin_reason TEXT                          -- เหตุผลกรณี Reject หรือ Cancel
);

-- Index สำหรับค้นหาและสรุปผลรวดเร็ว
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(requested_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(user_phone);

-- 2. ตารางช่วงเวลาทำการและความจุต่อรอบ (Time Slots & Capacity)
CREATE TABLE IF NOT EXISTS time_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_name TEXT NOT NULL UNIQUE,            -- e.g. "08:30 - 09:30"
    start_time TEXT NOT NULL,                  -- "08:30"
    end_time TEXT NOT NULL,                    -- "09:30"
    max_capacity INTEGER NOT NULL DEFAULT 3,   -- จำนวนคิวสูงสุดต่อรอบ
    is_active INTEGER NOT NULL DEFAULT 1       -- 1 = เปิดรับ, 0 = ปิด
);

-- 3. ตารางวันหยุดและวันปิดรับจอง (Blocked Dates)
CREATE TABLE IF NOT EXISTS blocked_dates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blocked_date TEXT NOT NULL UNIQUE,         -- YYYY-MM-DD
    reason TEXT NOT NULL,                      -- เหตุผล เช่น "วันหยุดนักขัตฤกษ์", "ปิดตรวจนับสต็อกประจำปี"
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. ตารางบันทึกการตั้งค่าระบบ (System Settings)
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- ข้อมูลช่วงเวลาเริ่มต้น (Default Time Slots)
INSERT OR IGNORE INTO time_slots (slot_name, start_time, end_time, max_capacity, is_active) VALUES
('08:30 - 09:30', '08:30', '09:30', 3, 1),
('09:30 - 10:30', '09:30', '10:30', 4, 1),
('10:30 - 11:30', '10:30', '11:30', 4, 1),
('11:30 - 12:30', '11:30', '12:30', 2, 1),
('13:00 - 14:00', '13:00', '14:00', 4, 1),
('14:00 - 15:00', '14:00', '15:00', 4, 1),
('15:00 - 16:00', '15:00', '16:00', 3, 1),
('16:00 - 17:00', '16:00', '17:00', 2, 1);

-- ค่าระบบเริ่มต้น
INSERT OR IGNORE INTO system_settings (key, value) VALUES
('company_name', 'บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)'),
('company_address', 'คลังสินค้าและศูนย์กระจายสินค้า พัฒนาเภสัช'),
('admin_pin', '8888'),
('operating_days', '1,2,3,4,5,6'); -- จันทร์-เสาร์ (0=อาทิตย์, 6=เสาร์)
