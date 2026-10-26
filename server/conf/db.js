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
    school_name TEXT DEFAULT 'SMK Negeri 1 Presensi Cerdas',
    school_address TEXT DEFAULT 'Jl. Pendidikan Teknologi No. 10, Kampus Terpadu',
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

// 6. Master Jadwal Pelajaran (Teaching Schedules)
db.exec(`
  CREATE TABLE IF NOT EXISTS teaching_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

// ==========================================
// SEEDING DATA AWAL (AMAN, BERSIH, TERSTANDAR)
// ==========================================
export function initSeedDatabase() {
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
  // 2. Seed Guru Contoh
  const countTeachers = db.prepare('SELECT COUNT(*) as c FROM teachers').get().c;
  if (countTeachers === 0) {
    const guruPassHash = bcrypt.hashSync('Guru2026!', 10);
    
    const insertTeacher = db.prepare(`
      INSERT INTO teachers (nip, nik, username, password_hash, full_name, assigned_division, role, phone_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTeacher.run(
      '198001012005011001',
      '3273010101800001',
      'guru.budi',
      guruPassHash,
      'Budi Santoso, S.Pd',
      'XII RPL 1',
      'WALI_KELAS',
      '081234567890'
    );

    insertTeacher.run(
      '198502022008012002',
      '3273010202850002',
      'guru.siti',
      guruPassHash,
      'Siti Rahma, M.Kom',
      'XI RPL 1',
      'WALI_KELAS',
      '081234567891'
    );

    insertTeacher.run(
      '199003032015011003',
      '3273010303900003',
      'guru.hendra',
      guruPassHash,
      'Hendra Wijaya, S.T',
      null,
      'GURU',
      '081234567892'
    );
  }

  // 3. Seed Rombel / Divisi
  const countDivisions = db.prepare('SELECT COUNT(*) as c FROM divisions').get().c;
  if (countDivisions === 0) {
    const tBudi = db.prepare("SELECT id FROM teachers WHERE username = 'guru.budi'").get();
    const tSiti = db.prepare("SELECT id FROM teachers WHERE username = 'guru.siti'").get();

    const insertDiv = db.prepare(`
      INSERT INTO divisions (name, supervisor_teacher_id, supervisor_name)
      VALUES (?, ?, ?)
    `);
    insertDiv.run('XII RPL 1', tBudi?.id || null, 'Budi Santoso, S.Pd');
    insertDiv.run('XI RPL 1', tSiti?.id || null, 'Siti Rahma, M.Kom');
  }

  // 4. Seed Siswa Contoh
  const countStudents = db.prepare('SELECT COUNT(*) as c FROM members').get().c;
  if (countStudents === 0) {
    const defaultPinHash = bcrypt.hashSync('123456', 10);
    const insertMember = db.prepare(`
      INSERT INTO members (barcode_id, nipd, nisn, full_name, gender, division, parent_pin_hash, parent_name, parent_phone, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'siswa')
    `);

    insertMember.run('BC-1001', '24001', '0051234567', 'Ahmad Fauzi', 'L', 'XII RPL 1', defaultPinHash, 'Bpk. Ridwan Fauzi', '08121111001');
    insertMember.run('BC-1002', '24002', '0051234568', 'Bintang Pratama', 'L', 'XII RPL 1', defaultPinHash, 'Bpk. Joko Pratama', '08121111002');
    insertMember.run('BC-1003', '24003', '0051234569', 'Citra Lestari', 'P', 'XII RPL 1', defaultPinHash, 'Ibu Sri Lestari', '08121111003');
    insertMember.run('BC-1004', '24004', '0051234570', 'Dimas Anggara', 'L', 'XI RPL 1', defaultPinHash, 'Bpk. Agus Anggara', '08121111004');
    insertMember.run('BC-1005', '24005', '0051234571', 'Eka Putri Rahayu', 'P', 'XI RPL 1', defaultPinHash, 'Ibu Maria Rahayu', '08121111005');
  }

  // 5. Seed Jadwal Pelajaran (Teaching Schedules)
  const countSchedules = db.prepare('SELECT COUNT(*) as c FROM teaching_schedules').get().c;
  if (countSchedules === 0) {
    const tBudi = db.prepare("SELECT id FROM teachers WHERE username = 'guru.budi'").get();
    const tSiti = db.prepare("SELECT id FROM teachers WHERE username = 'guru.siti'").get();
    const tHendra = db.prepare("SELECT id FROM teachers WHERE username = 'guru.hendra'").get();

    const insertSchedule = db.prepare(`
      INSERT INTO teaching_schedules (teacher_id, division, subject_name, day_name, start_time, end_time, room)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Senin s/d Sabtu
    if (tBudi) {
      insertSchedule.run(tBudi.id, 'XII RPL 1', 'Pemrograman Web & Mobile', 'Senin', '07:30', '09:30', 'Lab Komputer 1');
      insertSchedule.run(tBudi.id, 'XII RPL 1', 'Basis Data Terdistribusi', 'Rabu', '10:00', '12:00', 'Lab Komputer 2');
      insertSchedule.run(tBudi.id, 'XI RPL 1', 'Dasar Pemrograman', 'Kamis', '08:00', '10:00', 'Lab Komputer 1');
    }
    if (tSiti) {
      insertSchedule.run(tSiti.id, 'XI RPL 1', 'Pemodelan Perangkat Lunak', 'Senin', '08:00', '10:00', 'Ruang Teori 3');
      insertSchedule.run(tSiti.id, 'XII RPL 1', 'Kecerdasan Buatan Terapan', 'Selasa', '07:30', '09:30', 'Lab Komputer 2');
    }
    if (tHendra) {
      insertSchedule.run(tHendra.id, 'XII RPL 1', 'Cloud Computing & DevOps', 'Jumat', '08:00', '10:00', 'Lab Jaringan');
    }
  }

  // 6. Seed Ekstrakurikuler
  const countEkskul = db.prepare('SELECT COUNT(*) as c FROM extracurriculars').get().c;
  if (countEkskul === 0) {
    const tBudi = db.prepare("SELECT id FROM teachers WHERE username = 'guru.budi'").get();
    const tSiti = db.prepare("SELECT id FROM teachers WHERE username = 'guru.siti'").get();

    const insertEkskul = db.prepare(`
      INSERT INTO extracurriculars (name, mentor_teacher_id, mentor_name, day_name, start_time, end_time, location, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const pId = insertEkskul.run(
      'Pramuka Gugus Depan',
      tBudi?.id || null,
      'Budi Santoso, S.Pd',
      'Jumat',
      '14:00',
      '16:00',
      'Lapangan Utama',
      'Pendidikan kepramukaan wajib & pengembangan kepemimpinan'
    ).lastInsertRowid;

    const rId = insertEkskul.run(
      'Robotik & IoT Nabastala',
      tSiti?.id || null,
      'Siti Rahma, M.Kom',
      'Sabtu',
      '09:00',
      '11:30',
      'Lab Komputer 1',
      'Pengembangan sistem otomatisasi hardware, sensor, dan IoT'
    ).lastInsertRowid;

    const fId = insertEkskul.run(
      'Futsal Klub Sekolah',
      tBudi?.id || null,
      'Budi Santoso, S.Pd',
      'Sabtu',
      '07:30',
      '09:30',
      'Lapangan Olahraga',
      'Pelatihan teknik dasar, fisik, dan persiapan turnamen antar sekolah'
    ).lastInsertRowid;

    // Seed Anggota Ekskul
    const allMembers = db.prepare('SELECT id FROM members LIMIT 5').all();
    const insertMemberEkskul = db.prepare(`
      INSERT OR IGNORE INTO extracurricular_members (extracurricular_id, member_id)
      VALUES (?, ?)
    `);

    allMembers.forEach(m => {
      insertMemberEkskul.run(pId, m.id);
    });

    if (allMembers[0]) insertMemberEkskul.run(rId, allMembers[0].id);
    if (allMembers[2]) insertMemberEkskul.run(rId, allMembers[2].id);
    if (allMembers[3]) insertMemberEkskul.run(rId, allMembers[3].id);

    if (allMembers[1]) insertMemberEkskul.run(fId, allMembers[1].id);
    if (allMembers[3]) insertMemberEkskul.run(fId, allMembers[3].id);
  }
}

// Jalankan seed awal jika tabel baru
try {
  initSeedDatabase();
} catch (err) {
  console.error('[Database Seed Error]:', err.message);
}

export default db;
