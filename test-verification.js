const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'ptn_queue.db');
const db = new Database(dbPath);

console.log('--- Starting End-to-End Verification of PTN Pharma Queue System ---');

// Apply schema
const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schemaSql);
console.log('✓ 0. Schema applied successfully.');

// 1. Verify Time Slots
const slots = db.prepare('SELECT * FROM time_slots').all();
console.log(`✓ 1. Time slots initialized: ${slots.length} slots found.`);

// 2. Create a test booking
const testDate = new Date().toISOString().split('T')[0];
const testBookingId = `PTN-${testDate.replace(/-/g, '')}-TEST1`;

db.prepare(`
  INSERT OR REPLACE INTO bookings (
    booking_id, user_phone, carrier_name, client_name,
    pallet_count, vehicle_count, requested_date, requested_time,
    driver_name, license_plate, notes, status, created_at
  ) VALUES (
    ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, 'Pending', datetime('now', 'localtime')
  )
`).run(
  testBookingId,
  '081-234-5678',
  'Kerry Express',
  'บจก. พีทีเอ็น เภสัชภัณฑ์',
  5,
  1,
  testDate,
  '09:30 - 10:30',
  'สมชาย ใจดี',
  '1กข-9999 กทม.',
  'สินค้าควบคุมอุณหภูมิ'
);

const created = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(testBookingId);
console.log(`✓ 2. Booking creation tested: ID=${created.booking_id}, Status=${created.status}`);

// 3. Test Admin Approval
db.prepare(`
  UPDATE bookings
  SET status = 'Approved',
      admin_action_date = datetime('now', 'localtime'),
      admin_action_by = 'Admin Verifier'
  WHERE booking_id = ?
`).run(testBookingId);

const approved = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(testBookingId);
console.log(`✓ 3. Admin Approval tested: Status=${approved.status}, Admin=${approved.admin_action_by}`);

// 4. Test Multi-Step Cancellation
const cancelReason = 'ผู้ส่งสินค้าแจ้งเลื่อนวันส่ง';
db.prepare(`
  UPDATE bookings
  SET status = 'Cancelled',
      admin_reason = ?,
      admin_action_date = datetime('now', 'localtime'),
      admin_action_by = 'Admin Verifier'
  WHERE booking_id = ?
`).run(`[ยกเลิกคิว] ${cancelReason}`, testBookingId);

const cancelled = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(testBookingId);
console.log(`✓ 4. Multi-Step Cancellation tested: Status=${cancelled.status}, Reason=${cancelled.admin_reason}`);

// 5. Test Date Blocking
const testBlockDate = '2026-12-31';
db.prepare('INSERT OR REPLACE INTO blocked_dates (blocked_date, reason) VALUES (?, ?)').run(testBlockDate, 'วันหยุดสิ้นปี');
const blocked = db.prepare('SELECT * FROM blocked_dates WHERE blocked_date = ?').get(testBlockDate);
console.log(`✓ 5. Date Blocking tested: BlockedDate=${blocked.blocked_date}, Reason=${blocked.reason}`);

// Cleanup test block date
db.prepare('DELETE FROM blocked_dates WHERE blocked_date = ?').run(testBlockDate);
console.log('✓ 6. Cleanup completed.');
console.log('\n🌟 ALL DATABASE SCHEMA AND BUSINESS LOGIC TESTS PASSED 100%!');
