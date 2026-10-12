import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.resolve(__dirname, '../database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.resolve(dbDir, 'portal.sqlite');
const db = new Database(dbPath);

// Aktifkan WAL mode untuk performa sinkronisasi tinggi
db.pragma('journal_mode = WAL');

// 1. Pengaturan Sekolah & Developer Licensing
db.exec(`
  CREATE TABLE IF NOT EXISTS school_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    school_name TEXT DEFAULT 'SMA / SMK Teladan Mandiri',
    school_address TEXT DEFAULT 'Jl. Pendidikan No. 45, Kota Cerdas',
    academic_year TEXT DEFAULT '2026/2027',
    sync_secret TEXT DEFAULT 'SEC-ABSENSI-SYNC-2026',
    license_status TEXT DEFAULT 'ACTIVE', -- ACTIVE, TRIAL, SUSPENDED, EXPIRED
    license_key TEXT DEFAULT 'LIC-PRO-SCHOOL-9999-OK',
    last_sync_at TEXT
  );

  INSERT OR IGNORE INTO school_settings (id) VALUES (1);
`);

// 2. Data Siswa & Akun Login Orang Tua (PIN)
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode_id TEXT UNIQUE,
    nipd TEXT UNIQUE,
    nisn TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    division TEXT NOT NULL,          -- Kelas, e.g. 'XII RPL 1'
    parent_pin TEXT DEFAULT '123456', -- PIN rahasia untuk wali murid login
    parent_name TEXT,
    parent_phone TEXT,
    photo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 3. Data Akun Guru / Wali Kelas
db.exec(`
  CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nip TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,          -- Default simple password
    full_name TEXT NOT NULL,
    assigned_division TEXT NOT NULL,  -- Kelas binaan, e.g. 'XII RPL 1'
    role TEXT DEFAULT 'WALI_KELAS',
    photo_url TEXT
  );
`);

// Pastikan kolom photo_url tersedia di teachers
try {
  db.exec('ALTER TABLE teachers ADD COLUMN photo_url TEXT;');
} catch (_) {}


// 4. Riwayat Presensi
db.exec(`
  CREATE TABLE IF NOT EXISTS attendance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    sync_id TEXT UNIQUE,
    date TEXT NOT NULL,               -- Format: YYYY-MM-DD
    time_in TEXT,
    time_out TEXT,
    status TEXT NOT NULL,             -- HADIR, TERLAMBAT, IZIN, SAKIT, ALPA
    note TEXT,
    device_gate TEXT DEFAULT 'Gate Utama',
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(member_id) REFERENCES members(id)
  );
`);

// 5. Pengajuan Izin / Sakit dari Orang Tua ke Guru
db.exec(`
  CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    sync_id TEXT UNIQUE,
    type TEXT NOT NULL,               -- SAKIT, IZIN, DISPENSASI
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'MENUNGGU',   -- MENUNGGU, DISETUJUI, DITOLAK
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_to_local INTEGER DEFAULT 0,
    FOREIGN KEY(member_id) REFERENCES members(id)
  );
`);

// 6. Data Rombel / Divisi & Penanggung Jawab (Wali Kelas)
db.exec(`
  CREATE TABLE IF NOT EXISTS divisions (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    supervisor_name TEXT
  );
`);

// Migrasi Kolom untuk Database Eksisting
try { db.exec(`ALTER TABLE school_settings ADD COLUMN school_logo TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE school_settings ADD COLUMN admin_username TEXT DEFAULT 'admin';`); } catch (e) {}
try { db.exec(`ALTER TABLE school_settings ADD COLUMN admin_password TEXT DEFAULT 'admin123';`); } catch (e) {}
try { db.exec(`ALTER TABLE school_settings ADD COLUMN admin_password_hash TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE members ADD COLUMN role TEXT DEFAULT 'siswa';`); } catch (e) {}
try { db.exec(`ALTER TABLE attendance_logs ADD COLUMN sync_id TEXT;`); } catch (e) {}
try { db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_att_sync_id ON attendance_logs (sync_id);`); } catch (e) {}
try { db.exec(`ALTER TABLE leave_requests ADD COLUMN sync_id TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE leave_requests ADD COLUMN synced_to_local INTEGER DEFAULT 0;`); } catch (e) {}

// 7. Modul Ekstrakurikuler
db.exec(`
  CREATE TABLE IF NOT EXISTS extracurriculars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,        -- Contoh: Pramuka, Futsal, PMR, Rohis
    mentor_teacher_id INTEGER,        -- Foreign key ke teachers(id)
    mentor_name TEXT,                 -- Nama Guru Pembina / Pelatih
    day_name TEXT,                    -- Contoh: 'Jumat', 'Sabtu', 'Rabu & Sabtu'
    start_time TEXT,                  -- 14:00
    end_time TEXT,                    -- 16:00
    location TEXT DEFAULT 'Area Sekolah',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(mentor_teacher_id) REFERENCES teachers(id)
  );

  CREATE TABLE IF NOT EXISTS extracurricular_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extracurricular_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(extracurricular_id, member_id),
    FOREIGN KEY(extracurricular_id) REFERENCES extracurriculars(id) ON DELETE CASCADE,
    FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS extracurricular_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extracurricular_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    date TEXT NOT NULL,               -- Format: YYYY-MM-DD
    time_in TEXT,
    status TEXT NOT NULL,             -- HADIR, IZIN, SAKIT, ALPA
    notes TEXT,
    recorded_by TEXT,                 -- Pembina / Pelatih
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(extracurricular_id, member_id, date),
    FOREIGN KEY(extracurricular_id) REFERENCES extracurriculars(id) ON DELETE CASCADE,
    FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
  );
`);

try { db.exec(`ALTER TABLE extracurriculars ADD COLUMN mentor_teacher_id INTEGER;`); } catch (e) {}
try {
  const countEkskul = db.prepare('SELECT count(*) as c FROM extracurriculars').get().c;
  if (countEkskul === 0) {
    db.prepare(`
      INSERT INTO extracurriculars (name, mentor_name, day_name, start_time, end_time, location)
      VALUES 
        ('Pramuka', 'Pembina Pramuka', 'Jumat', '14:00', '16:00', 'Lapangan Utama'),
        ('PMR (Palang Merah Remaja)', 'Pembina PMR', 'Jumat', '14:30', '16:00', 'Ruang UKS'),
        ('Futsal', 'Pelatih Futsal', 'Sabtu', '08:00', '10:00', 'Lapangan Olahraga')
    `).run();
  }
} catch (_) {}

export default db;
