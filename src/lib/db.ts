import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database path in project root
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'ptn_queue.db');

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(dbPath);
    dbInstance.pragma('journal_mode = WAL');
    initTables(dbInstance);
  }
  return dbInstance;
}

function initTables(db: Database.Database) {
  // Read schema.sql or apply SQL statements
  const schema = `
    CREATE TABLE IF NOT EXISTS bookings (
      booking_id TEXT PRIMARY KEY,
      user_phone TEXT NOT NULL,
      carrier_name TEXT NOT NULL,
      client_name TEXT NOT NULL,
      pallet_count INTEGER NOT NULL DEFAULT 1,
      vehicle_count INTEGER NOT NULL DEFAULT 1,
      requested_date TEXT NOT NULL,
      requested_time TEXT NOT NULL,
      driver_name TEXT,
      license_plate TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      admin_action_date DATETIME,
      admin_action_by TEXT,
      admin_reason TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(requested_date);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(user_phone);

    CREATE TABLE IF NOT EXISTS time_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_name TEXT NOT NULL UNIQUE,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      max_capacity INTEGER NOT NULL DEFAULT 3,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS blocked_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocked_date TEXT NOT NULL UNIQUE,
      reason TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `;

  db.exec(schema);

  // Check default time slots
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM time_slots');
  const result = countStmt.get() as { count: number };
  if (result.count === 0) {
    const insertSlot = db.prepare(`
      INSERT INTO time_slots (slot_name, start_time, end_time, max_capacity, is_active)
      VALUES (?, ?, ?, ?, ?)
    `);

    const defaultSlots = [
      ['08:30 - 09:30', '08:30', '09:30', 3, 1],
      ['09:30 - 10:30', '09:30', '10:30', 4, 1],
      ['10:30 - 11:30', '10:30', '11:30', 4, 1],
      ['11:30 - 12:30', '11:30', '12:30', 2, 1],
      ['13:00 - 14:00', '13:00', '14:00', 4, 1],
      ['14:00 - 15:00', '14:00', '15:00', 4, 1],
      ['15:00 - 16:00', '15:00', '16:00', 3, 1],
      ['16:00 - 17:00', '16:00', '17:00', 2, 1],
    ];

    const insertMany = db.transaction((slots) => {
      for (const slot of slots) insertSlot.run(...slot);
    });
    insertMany(defaultSlots);
  }

  // Check system settings
  const settingsCount = (db.prepare('SELECT COUNT(*) as count FROM system_settings').get() as { count: number }).count;
  if (settingsCount === 0) {
    const insertSetting = db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)');
    insertSetting.run('company_name', 'บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)');
    insertSetting.run('admin_pin', '8888');
  }
}
