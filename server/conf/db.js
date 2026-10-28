import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.resolve(__dirname, '../database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.resolve(dbDir, 'portal.sqlite');
const db = new Database(dbPath);

// Aktifkan WAL mode untuk konkurensi dan performa tinggi
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 1. Pengaturan Sekolah & Akun Admin Terenkripsi
db.exec(`
  CREATE TABLE IF NOT EXISTS school_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    school_name TEXT DEFAULT 'NEBULA PRESENCE',
    school_address TEXT DEFAULT '',
    academic_year TEXT DEFAULT '2026/2027',
    school_logo TEXT,
    sync_secret TEXT,
    license_status TEXT DEFAULT 'ACTIVE',
    license_key TEXT DEFAULT 'LIC-PRO-SCHOOL-2026-STABLE',
    admin_username TEXT DEFAULT 'admin',
    admin_password_hash TEXT,
    last_sync_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  INSERT OR IGNORE INTO school_settings (id) VALUES (1);
`);

// 2. Sesi Login Aman (Session Store di SQLite)
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_role TEXT NOT NULL,         -- 'ADMIN', 'TEACHER', 'PARENT'
    user_id INTEGER NOT NULL,
    user_data TEXT,                  -- JSON string data pengguna
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
`);

// 3. Data Guru & Pembina
db.exec(`
  CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nip TEXT UNIQUE NOT NULL,
    nik TEXT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    assigned_division TEXT,          -- Rombel binaan jika wali kelas, e.g. 'XII RPL 1'
    role TEXT DEFAULT 'GURU',         -- 'GURU', 'WALI_KELAS', 'TENDIK'
    photo_url TEXT,
    phone_number TEXT,
    status TEXT DEFAULT 'ACTIVE',    -- 'ACTIVE', 'INACTIVE'
    credentials_ready INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 4. Data Rombel / Divisi Kelas
db.exec(`
  CREATE TABLE IF NOT EXISTS divisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,       -- 'XII RPL 1'
    supervisor_teacher_id INTEGER,
    supervisor_name TEXT,
    academic_year TEXT DEFAULT '2026/2027',
    FOREIGN KEY (supervisor_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
  );
`);

// 5. Data Siswa & Wali Murid
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode_id TEXT UNIQUE,
    nipd TEXT UNIQUE,
    nisn TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    gender TEXT DEFAULT 'L',         -- 'L' / 'P'
    division TEXT NOT NULL,          -- Rombel kelas
    parent_pin_hash TEXT,            -- PIN login wali/siswa terenkripsi bcrypt
    parent_name TEXT,
    parent_phone TEXT,
    phone_number TEXT,
    telegram_chat_id TEXT,
    photo_url TEXT,
    role TEXT DEFAULT 'siswa',
    status TEXT DEFAULT 'ACTIVE',    -- 'ACTIVE', 'GRADUATED', 'TRANSFERRED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_members_division ON members (division);
  CREATE INDEX IF NOT EXISTS idx_members_nisn ON members (nisn);
`);

// Kredensial Portal siswa dikelola admin dan terpisah dari NISN/NIPD.
const memberColumns = db.prepare('PRAGMA table_info(members)').all();
if (!memberColumns.some((column) => column.name === 'username')) db.exec('ALTER TABLE members ADD COLUMN username TEXT');
if (!memberColumns.some((column) => column.name === 'password_hash')) db.exec('ALTER TABLE members ADD COLUMN password_hash TEXT');
if (!memberColumns.some((column) => column.name === 'portal_managed_credentials')) db.exec('ALTER TABLE members ADD COLUMN portal_managed_credentials INTEGER NOT NULL DEFAULT 0');
const teacherColumns = db.prepare('PRAGMA table_info(teachers)').all();
if (!teacherColumns.some((column) => column.name === 'portal_managed_credentials')) db.exec('ALTER TABLE teachers ADD COLUMN portal_managed_credentials INTEGER NOT NULL DEFAULT 0');

// Biodata lengkap yang kompatibel dengan database Portal versi lama.
const teacherProfileColumns = {
  nuptk: 'TEXT', gender: 'TEXT', birth_place: 'TEXT', birth_date: 'TEXT',
  religion: 'TEXT', address: 'TEXT', email: 'TEXT', education: 'TEXT',
  employment_status: 'TEXT', rank_grade: 'TEXT', tmt: 'TEXT'
};
for (const [name, type] of Object.entries(teacherProfileColumns)) {
  if (!teacherColumns.some((column) => column.name === name)) {
    db.exec(`ALTER TABLE teachers ADD COLUMN ${name} ${type}`);
  }
}
const memberProfileColumns = {
  birth_place: 'TEXT', birth_date: 'TEXT', religion: 'TEXT', address: 'TEXT',
  email: 'TEXT', nationality: 'TEXT', child_order: 'INTEGER', siblings_count: 'INTEGER',
  previous_school: 'TEXT', admission_date: 'TEXT', guardian_name: 'TEXT',
  guardian_relation: 'TEXT', guardian_phone: 'TEXT'
};
for (const [name, type] of Object.entries(memberProfileColumns)) {
  if (!memberColumns.some((column) => column.name === name)) {
    db.exec(`ALTER TABLE members ADD COLUMN ${name} ${type}`);
  }
}
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_members_username ON members (username COLLATE NOCASE) WHERE username IS NOT NULL AND TRIM(username) != ''");

// 6. Master Jadwal Pelajaran (Teaching Schedules)
db.exec(`
  CREATE TABLE IF NOT EXISTS teaching_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nebula_schedule_id TEXT UNIQUE,
    teacher_id INTEGER NOT NULL,
    division TEXT NOT NULL,          -- Rombel, e.g. 'XII RPL 1'
    subject_name TEXT NOT NULL,      -- Nama Mata Pelajaran, e.g. 'Pemrograman Web'
    day_name TEXT NOT NULL,          -- 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
    start_time TEXT NOT NULL,        -- '07:30'
    end_time TEXT NOT NULL,          -- '09:30'
    academic_year TEXT DEFAULT '2026/2027',
    room TEXT DEFAULT 'Ruang Kelas',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_schedules_teacher ON teaching_schedules (teacher_id);
  CREATE INDEX IF NOT EXISTS idx_schedules_day_div ON teaching_schedules (day_name, division);
`);

// Pengajuan izin guru dan penugasan guru pengganti.
db.exec(`
  CREATE TABLE IF NOT EXISTS teacher_absence_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    substitute_teacher_id INTEGER,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'MENUNGGU',
    notes TEXT,
    approved_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (substitute_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_teacher_absence_dates
    ON teacher_absence_requests (teacher_id, start_date, end_date, status);
  CREATE INDEX IF NOT EXISTS idx_teacher_substitute_dates
    ON teacher_absence_requests (substitute_teacher_id, start_date, end_date, status);
`);

// Migrasi aman untuk database Portal yang dibuat sebelum sinkronisasi jadwal Nebula.
const scheduleColumns = db.prepare('PRAGMA table_info(teaching_schedules)').all();
if (!scheduleColumns.some((column) => column.name === 'nebula_schedule_id')) {
  db.exec('ALTER TABLE teaching_schedules ADD COLUMN nebula_schedule_id TEXT');
}
db.exec('DROP INDEX IF EXISTS idx_schedules_nebula_id');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_schedules_nebula_id ON teaching_schedules (nebula_schedule_id)');

// 7. Jurnal Guru (Catatan Pertemuan Belajar Mengajar)
db.exec(`
  CREATE TABLE IF NOT EXISTS teacher_journals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    date TEXT NOT NULL,              -- YYYY-MM-DD
    division TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    actual_start_time TEXT,          -- '07:35'
    actual_end_time TEXT,            -- '09:30'
    topic TEXT NOT NULL,             -- Materi Pembelajaran
    activities TEXT,                 -- Aktivitas / Metode Belajar
    assignments TEXT,                -- Tugas / Tagihan Siswa
    notes TEXT,                      -- Kendala / Catatan Kelas
    status TEXT DEFAULT 'SUBMITTED', -- 'DRAFT', 'SUBMITTED', 'VERIFIED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schedule_id, date),
    FOREIGN KEY (schedule_id) REFERENCES teaching_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_journals_date ON teacher_journals (date);
  CREATE INDEX IF NOT EXISTS idx_journals_teacher ON teacher_journals (teacher_id);
`);

// 8. Presensi Siswa per Pertemuan Jam Pelajaran
db.exec(`
  CREATE TABLE IF NOT EXISTS teacher_journal_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    status TEXT NOT NULL,            -- 'HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPA', 'DISPENSASI'
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(journal_id, member_id),
    FOREIGN KEY (journal_id) REFERENCES teacher_journals(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_journal_att_member ON teacher_journal_attendance (member_id);
`);

// 9. Master Kegiatan Ekstrakurikuler (Dengan status aktif agar tidak hilang riwayat)
db.exec(`
  CREATE TABLE IF NOT EXISTS extracurriculars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    mentor_teacher_id INTEGER,
    mentor_name TEXT,
    day_name TEXT,                   -- 'Jumat', 'Sabtu'
    start_time TEXT,                 -- '14:00'
    end_time TEXT,                   -- '16:00'
    location TEXT DEFAULT 'Area Sekolah',
    description TEXT,
    is_active INTEGER DEFAULT 1,     -- 1 = Aktif, 0 = Dinonaktifkan/Diarsipkan
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mentor_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
  );
`);

// 10. Anggota Ekstrakurikuler
db.exec(`
  CREATE TABLE IF NOT EXISTS extracurricular_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extracurricular_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    status TEXT DEFAULT 'ACTIVE',    -- 'ACTIVE', 'INACTIVE'
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(extracurricular_id, member_id),
    FOREIGN KEY (extracurricular_id) REFERENCES extracurriculars(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_ekskul_members_ekskul ON extracurricular_members (extracurricular_id);
`);

// 11. Sesi Pertemuan Aktual Ekstrakurikuler
db.exec(`
  CREATE TABLE IF NOT EXISTS extracurricular_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extracurricular_id INTEGER NOT NULL,
    session_date TEXT NOT NULL,       -- YYYY-MM-DD
    start_time TEXT,
    end_time TEXT,
    activity_topic TEXT NOT NULL,     -- Materi / Agenda Latihan
    activity_summary TEXT,            -- Ringkasan Pelaksanaan
    created_by_teacher_id INTEGER,
    status TEXT DEFAULT 'COMPLETED',  -- 'SCHEDULED', 'COMPLETED', 'CANCELLED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (extracurricular_id) REFERENCES extracurriculars(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_ekskul_sessions_date ON extracurricular_sessions (session_date);
`);

// 12. Presensi Anggota per Sesi Pertemuan Ekskul
db.exec(`
  CREATE TABLE IF NOT EXISTS extracurricular_session_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    extracurricular_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    status TEXT NOT NULL,             -- 'HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPA'
    notes TEXT,
    recorded_by_teacher_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, member_id),
    FOREIGN KEY (session_id) REFERENCES extracurricular_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (extracurricular_id) REFERENCES extracurriculars(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_ekskul_session_att_member ON extracurricular_session_attendance (member_id);
`);

// 13. Log Presensi Gerbang RFID (Dari Nebula Presence Desktop)
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
    FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs (date);
  CREATE INDEX IF NOT EXISTS idx_attendance_member_date ON attendance_logs (member_id, date);
`);

// 14. Pengajuan Izin / Sakit dari Wali Murid
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
    approved_by TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_to_local INTEGER DEFAULT 0,
    FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
  );
`);

// 15. Audit Trail & Log Keamanan
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_role TEXT,
    action TEXT NOT NULL,             -- e.g. 'SUBMIT_JOURNAL', 'UPDATE_ATTENDANCE'
    entity_type TEXT NOT NULL,        -- 'teacher_journals', 'extracurricular_sessions'
    entity_id INTEGER,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at);
`);

// Token sekali pakai untuk mengamankan setup admin pertama.
db.exec(`
  CREATE TABLE IF NOT EXISTS portal_bootstrap (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    token_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrasi biodata bertahap: database Portal lama tetap kompatibel tanpa perlu dihapus.
const ensureColumn = (table, column, definition) => {
  const columns = db.pragma(`table_info(${table})`);
  if (!columns.some(item => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};
for (const [table, column, definition] of [
  ['teachers', 'address', "TEXT DEFAULT ''"],
  ['teachers', 'credentials_ready', 'INTEGER DEFAULT 1'],
  ['teachers', 'email', "TEXT DEFAULT ''"],
  ['teachers', 'birth_date', "TEXT DEFAULT ''"],
  ['members', 'address', "TEXT DEFAULT ''"],
  ['members', 'email', "TEXT DEFAULT ''"],
  ['members', 'birth_date', "TEXT DEFAULT ''"]
]) {
  ensureColumn(table, column, definition);
}

// ==========================================
// SEEDING DATA AWAL (AMAN, BERSIH, TERSTANDAR)
// ==========================================
export function initSeedDatabase() {
  const initialSettings = db
    .prepare('SELECT school_name, school_address, admin_password_hash, last_sync_at FROM school_settings WHERE id = 1')
    .get();

  // Hilangkan identitas contoh hanya pada portal baru yang belum pernah disinkronkan.
  if (!initialSettings?.admin_password_hash && !initialSettings?.last_sync_at) {
    if (initialSettings?.school_name === 'SMK Negeri 1 Presensi Cerdas') {
      db.prepare("UPDATE school_settings SET school_name = 'NEBULA PRESENCE' WHERE id = 1").run();
    }
    if (initialSettings?.school_address === 'Jl. Pendidikan Teknologi No. 10, Kampus Terpadu') {
      db.prepare("UPDATE school_settings SET school_address = '' WHERE id = 1").run();
    }
  }

  const settingsForSync = db
    .prepare('SELECT sync_secret FROM school_settings WHERE id = 1')
    .get();

  if (
      !settingsForSync?.sync_secret ||
      settingsForSync.sync_secret === 'SEC-NEBULA-SYNC-KEY-2026'
  ) {
      const newSyncSecret = randomBytes(32).toString('hex');

      db.prepare(`
          UPDATE school_settings
          SET sync_secret = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = 1
      `).run(newSyncSecret);
  }
  // Data contoh sengaja tidak dibuat otomatis. Data sekolah harus berasal dari Nebula Presence
  // atau dimasukkan oleh admin agar database baru tidak tampak berisi data palsu.
}

// Jalankan seed awal jika tabel baru
try {
  initSeedDatabase();
} catch (err) {
  console.error('[Database Seed Error]:', err.message);
}

export default db;
