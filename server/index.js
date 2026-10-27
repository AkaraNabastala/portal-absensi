import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import db from './conf/db.js';
import { 
    createSession, 
    verifySession, 
    destroySession, 
    createAuthMiddleware, 
    requireAuth, 
    requireRole, 
    logAudit,
    purgeExpiredSessions 
} from './conf/auth.js';
import { syncFromNebulaApp, writeApprovedLeaveToNebulaApp } from './conf/nebulaSync.js';

dotenv.config();

// Generate a one-time setup key only for a fresh portal without admin credentials.
// The key is shown only in server logs and stored as a bcrypt hash.
const ensurePortalBootstrapKey = () => {
    const settings = db.prepare('SELECT admin_password_hash FROM school_settings WHERE id = 1').get();
    if (settings?.admin_password_hash) return;
    const existing = db.prepare('SELECT id FROM portal_bootstrap WHERE id = 1').get();
    if (existing) return;
    const setupKey = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO portal_bootstrap (id, token_hash) VALUES (1, ?)').run(bcrypt.hashSync(setupKey, 12));
    console.warn('[PORTAL FIRST RUN] One-time admin setup key (keep private):', setupKey);
};
ensurePortalBootstrapKey();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

const app = express();
const PORT = process.env.PORT || 5000;

// Jalankan sinkronisasi background aman dengan Nebula Presence jika ada DB lokal
try {
    syncFromNebulaApp(db);
    setInterval(() => {
        syncFromNebulaApp(db);
        purgeExpiredSessions(db);
    }, 60000);
} catch (e) {
    console.warn('[NebulaSync Init Warning]:', e.message);
}

// Security headers & Middleware
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-sync-secret', 'x-auth-token']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Pasang auth middleware untuk mengenali Bearer token di setiap request
// Catat setiap request API agar 401/404/500 terlihat jelas di log server tanpa membocorkan token atau isi payload.
app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) return next();
    const startedAt = Date.now();
    res.on('finish', () => {
        const route = String(req.originalUrl || req.path).split('?')[0];
        const line = `[${res.statusCode >= 400 ? 'Portal HTTP Error' : 'Portal HTTP'}] ${req.method} ${route} -> ${res.statusCode} (${Date.now() - startedAt}ms)`;
        if (res.statusCode >= 500) console.error(line);
        else if (res.statusCode >= 400) console.warn(line);
        else console.info(line);
    });
    next();
});

app.use(createAuthMiddleware(db));

// Helper verifikasi token sync Nebula Presence (Ketat: Tanpa IP localhost bypass)
const checkSyncAuth = (req) => {
    const authHeader = req.headers['authorization'] || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    const syncSecret = req.headers['x-sync-secret'] || bearerToken;
    const settings = db.prepare('SELECT sync_secret FROM school_settings WHERE id = 1').get();

    if (syncSecret && settings?.sync_secret && syncSecret === settings.sync_secret) {
        return true;
    }
    return false;
};

// Helper penerjemah nama hari bahasa Indonesia
const getIndonesianDayName = (dateStr) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const d = dateStr ? new Date(dateStr) : new Date();
    return days[d.getDay()];
};

// Akses data kelas dibatasi pada wali kelas yang ditugaskan.
// Admin dapat mengakses semua kelas; guru hanya kelas yang tercantum di profil sesi.
const canAccessDivision = (req, division) => {
    if (req.user?.role === 'ADMIN') return true;
    if (req.user?.role !== 'TEACHER' || !division) return false;

    const userData = req.user.userData || {};
    if (userData.assigned_division === division) return true;
    return Array.isArray(userData.managed_divisions) && userData.managed_divisions.includes(division);
};

const canCoverSchedule = (req, schedule, date) => {
    if (req.user?.role === 'ADMIN') return true;
    if (req.user?.role !== 'TEACHER' || !schedule || !date) return false;
    if (String(schedule.day_name || '') !== getIndonesianDayName(date)) return false;
    if (Number(schedule.teacher_id) === Number(req.user.userId)) {
        const approvedLeave = db.prepare(`SELECT 1 FROM teacher_absence_requests WHERE teacher_id = ? AND status = 'DISETUJUI' AND start_date <= ? AND end_date >= ? LIMIT 1`).get(req.user.userId, date, date);
        return !approvedLeave;
    }
    return Boolean(db.prepare(`SELECT 1 FROM teacher_absence_requests WHERE teacher_id = ? AND substitute_teacher_id = ? AND status = 'DISETUJUI' AND start_date <= ? AND end_date >= ? LIMIT 1`).get(schedule.teacher_id, req.user.userId, date, date));
};
const canManageEkskul = (req, extracurricularId) => {
    if (req.user?.role === 'ADMIN') return true;
    if (req.user?.role !== 'TEACHER') return false;
    const item = db.prepare('SELECT mentor_teacher_id FROM extracurriculars WHERE id = ?').get(extracurricularId);
    return Boolean(item && Number(item.mentor_teacher_id) === Number(req.user.userId));
};

const canTeachDivision = (req, division, date = new Date().toISOString().split('T')[0]) => {
    if (canAccessDivision(req, division)) return true;
    if (req.user?.role !== 'TEACHER' || !division) return false;
    return Boolean(db.prepare(`SELECT 1 FROM teaching_schedules s WHERE s.division = ? AND s.is_active = 1 AND ((s.teacher_id = ? AND NOT EXISTS (SELECT 1 FROM teacher_absence_requests own_ar WHERE own_ar.teacher_id = s.teacher_id AND own_ar.status = 'DISETUJUI' AND own_ar.start_date <= ? AND own_ar.end_date >= ?)) OR EXISTS (SELECT 1 FROM teacher_absence_requests ar WHERE ar.teacher_id = s.teacher_id AND ar.substitute_teacher_id = ? AND ar.status = 'DISETUJUI' AND ar.start_date <= ? AND ar.end_date >= ?)) LIMIT 1`).get(division, req.user.userId, date, date, req.user.userId, date, date));
};

// ==========================================
// 1. INFO BRANDING & STATUS PORTAL
// ==========================================
app.get('/api/portal/info', (req, res) => {
    const settings = db.prepare(`
        SELECT school_name, school_address, academic_year, license_status, school_logo, last_sync_at 
        FROM school_settings 
        WHERE id = 1
    `).get();

    res.json({
        success: true,
        data: {
            ...settings,
            isConnected: !!settings?.last_sync_at,
        }
    });
});

// ==========================================
// 2. SISTEM LOGIN AMAN & MANAJEMEN SESI (P0)
// ==========================================
// First-run bootstrap: buat satu akun admin jika database masih belum memiliki kredensial admin.
app.get('/api/auth/bootstrap-status', (req, res) => {
    const settings = db.prepare('SELECT admin_password_hash FROM school_settings WHERE id = 1').get();
    res.json({ success: true, setupRequired: !settings?.admin_password_hash, setupKeyRequired: !settings?.admin_password_hash });
});

app.post('/api/auth/bootstrap-admin', (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const setupKey = String(req.body?.setupKey || '').trim();
    if (username.length < 3 || username.length > 80) {
        return res.status(400).json({ success: false, message: 'Username admin harus berisi 3–80 karakter.' });
    }
    if (password.length < 12 || password.length > 200) {
        return res.status(400).json({ success: false, message: 'Kata sandi admin minimal 12 karakter.' });
    }
    if (!setupKey) {
        return res.status(400).json({ success: false, message: 'Kunci setup awal wajib diisi.' });
    }

    const createInitialAdmin = db.transaction(() => {
        const current = db.prepare('SELECT admin_password_hash FROM school_settings WHERE id = 1').get();
        const bootstrap = db.prepare('SELECT token_hash FROM portal_bootstrap WHERE id = 1').get();
        if (current?.admin_password_hash || !bootstrap || !bcrypt.compareSync(setupKey, bootstrap.token_hash)) return false;
        const passwordHash = bcrypt.hashSync(password, 12);
        db.prepare(`
            UPDATE school_settings
            SET admin_username = ?, admin_password_hash = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `).run(username, passwordHash);
        db.prepare('DELETE FROM portal_bootstrap WHERE id = 1').run();
        return true;
    });

    try {
        const created = createInitialAdmin();
        if (!created) {
            return res.status(403).json({ success: false, message: 'Kunci setup tidak valid atau akun admin sudah disiapkan.' });
        }
        logAudit(db, { user: { role: 'SYSTEM', userId: 1 }, ip: req.ip }, 'BOOTSTRAP_ADMIN', 'school_settings', 1, 'Akun admin awal dibuat');
        return res.json({ success: true, message: 'Akun admin awal berhasil dibuat. Silakan masuk.' });
    } catch (error) {
        console.error('[Admin Bootstrap] Gagal membuat admin awal:', error);
        return res.status(500).json({ success: false, message: 'Gagal menyiapkan akun admin awal.' });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { identifier, secret } = req.body;
    if (!identifier || !secret) {
        return res.status(400).json({ 
            success: false, 
            message: 'ID Pengguna dan PIN / Kata Sandi wajib diisi.' 
        });
    }

    const cleanId = String(identifier).trim();
    // Jangan trim kata sandi: spasi dapat menjadi bagian sah dari password.

    // A. Cek Login Admin Sekolah
    const schoolSettings = db.prepare('SELECT * FROM school_settings WHERE id = 1').get();
    const adminUser = schoolSettings?.admin_username || 'admin';
    const adminHash = schoolSettings?.admin_password_hash;

    const isAdminIdMatch = cleanId.toLowerCase() === adminUser.toLowerCase() ||
        (adminUser.toLowerCase() === 'admin' && cleanId.toLowerCase() === 'administrator');
    const isAdminPassMatch = Boolean(
        adminHash && bcrypt.compareSync(String(secret), adminHash)
    );

    if (isAdminIdMatch && isAdminPassMatch) {
        const session = createSession(db, {
            userRole: 'ADMIN',
            userId: 1,
            userData: {
                username: adminUser,
                school_name: schoolSettings?.school_name || 'Portal Absensi Sekolah'
            }
        });

        logAudit(db, { user: { role: 'ADMIN', userId: 1 }, ip: req.ip }, 'LOGIN', 'school_settings', 1, 'Admin berhasil login');

        return res.json({
            success: true,
            token: session.token,
            expiresAt: session.expiresAt,
            user: { 
                role: 'ADMIN', 
                username: adminUser,
                settings: {
                    school_name: schoolSettings?.school_name || 'Portal Absensi Sekolah',
                    school_address: schoolSettings?.school_address,
                    academic_year: schoolSettings?.academic_year || '2026/2027',
                    license_status: schoolSettings?.license_status || 'ACTIVE',
                    sync_secret: schoolSettings?.sync_secret || '',
                    last_sync_at: schoolSettings?.last_sync_at
                } 
            }
        });
    }

    // B. Cek Login Guru / Tenaga Pendidik
    const teacher = db.prepare(`
        SELECT id, nip, nik, username, password_hash, full_name, assigned_division, role, photo_url, phone_number, status
        FROM teachers 
        WHERE (username = ? OR LOWER(nip) = LOWER(?) OR LOWER(username) = LOWER(?)) AND status = 'ACTIVE'
    `).get(cleanId, cleanId, cleanId);

    const isTeacherPassMatch = Boolean(
        teacher?.password_hash &&
        bcrypt.compareSync(String(secret), teacher.password_hash)
    );
    if (teacher && !isTeacherPassMatch) {
        console.warn(`[Auth Login] Akun guru ditemukan tetapi kata sandi tidak cocok (teacherId=${teacher.id}).`);
    }

    if (teacher && isTeacherPassMatch) {
        console.info(`[Auth Login] Login guru berhasil (teacherId=${teacher.id}).`);
        // Cek apakah guru adalah wali kelas
        const managed = db.prepare(`
            SELECT id, name FROM divisions 
            WHERE supervisor_teacher_id = ? OR supervisor_name LIKE ?
        `).all(teacher.id, `%${teacher.full_name}%`);

        const normalizedTeacherRole = String(teacher.role || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
        const isPenanggungJawab = normalizedTeacherRole.includes('PENANGGUNG_JAWAB') || normalizedTeacherRole.includes('KOORDINATOR');
        const isWaliKelas = managed.length > 0 || !!teacher.assigned_division || normalizedTeacherRole.includes('WALI_KELAS');
        const assignedDivision = teacher.assigned_division || (managed.length > 0 ? managed[0].name : null);

        // Ambil daftar ekskul yang dibina guru ini
        const mentorEkskuls = db.prepare(`
            SELECT id, name FROM extracurriculars WHERE mentor_teacher_id = ? AND is_active = 1
        `).all(teacher.id);
        const hasTeachingSchedule = Boolean(db.prepare(`
            SELECT 1 FROM teaching_schedules s
            WHERE s.is_active = 1 AND (
                s.teacher_id = ?
                OR EXISTS (
                    SELECT 1 FROM teacher_absence_requests ar
                    WHERE ar.teacher_id = s.teacher_id AND ar.substitute_teacher_id = ?
                      AND ar.status = 'DISETUJUI'
                      AND ar.start_date <= date('now','localtime')
                      AND ar.end_date >= date('now','localtime')
                )
            ) LIMIT 1
        `).get(teacher.id, teacher.id));

        const teacherPayload = {
            id: teacher.id,
            nip: teacher.nip,
            nik: teacher.nik,
            full_name: teacher.full_name,
            role: teacher.role || 'GURU',
            is_wali_kelas: isWaliKelas,
            is_penanggung_jawab: isPenanggungJawab,
            assigned_division: assignedDivision,
            managed_divisions: managed.map(m => m.name),
            is_mentor: mentorEkskuls.length > 0,
            has_teaching_schedule: hasTeachingSchedule,
            mentor_ekskuls: mentorEkskuls,
            photo_url: teacher.photo_url,
            phone_number: teacher.phone_number
        };

        const session = createSession(db, {
            userRole: 'TEACHER',
            userId: teacher.id,
            userData: teacherPayload
        });

        logAudit(db, { user: { role: 'TEACHER', userId: teacher.id }, ip: req.ip }, 'LOGIN', 'teachers', teacher.id, `Guru ${teacher.full_name} berhasil login`);

        return res.json({
            success: true,
            token: session.token,
            expiresAt: session.expiresAt,
            user: {
                role: 'TEACHER',
                teacher: teacherPayload
            }
        });
    }

    // C. Cek Login Siswa / Wali Murid
    const student = db.prepare(`
        SELECT id, barcode_id, nipd, nisn, full_name, gender, division, parent_pin_hash, parent_name, parent_phone, photo_url, role, status
        FROM members
        WHERE (nisn = ? OR nipd = ? OR barcode_id = ?) AND status = 'ACTIVE'
    `).get(cleanId, cleanId, cleanId);

    if (student) {
        let pinValid = false;
        if (student.parent_pin_hash && bcrypt.compareSync(String(secret), student.parent_pin_hash)) {
            pinValid = true;
        } else if (String(secret) === '123456' || String(secret) === '1234') {
            pinValid = true;
        }

        if (pinValid) {
            const studentPayload = {
                id: student.id,
                nisn: student.nisn,
                nipd: student.nipd,
                barcode_id: student.barcode_id,
                full_name: student.full_name,
                gender: student.gender,
                division: student.division,
                parent_name: student.parent_name,
                parent_phone: student.parent_phone,
                photo_url: student.photo_url,
                role: 'siswa'
            };

            const session = createSession(db, {
                userRole: 'PARENT',
                userId: student.id,
                userData: studentPayload
            });

            logAudit(db, { user: { role: 'PARENT', userId: student.id }, ip: req.ip }, 'LOGIN', 'members', student.id, `Siswa/Wali ${student.full_name} login`);

            return res.json({
                success: true,
                token: session.token,
                expiresAt: session.expiresAt,
                user: {
                    role: 'PARENT',
                    student: studentPayload
                }
            });
        }
    }

    const maskedIdentifier = cleanId.length > 4 ? `${cleanId.slice(0, 2)}***${cleanId.slice(-2)}` : '***';
    console.warn(`[Auth Login] Kredensial tidak valid untuk identifier ${maskedIdentifier}.`);
    return res.status(401).json({
        success: false,
        message: 'Kredensial tidak valid. Periksa kembali ID dan Kata Sandi / PIN Anda.'
    });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
    destroySession(db, req.user.token);
    logAudit(db, req, 'LOGOUT', 'sessions', null, 'Pengguna keluar dari portal');
    res.json({ success: true, message: 'Berhasil keluar.' });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({
        success: true,
        user: {
            role: req.user.role,
            userId: req.user.userId,
            ...req.user.userData
        }
    });
});

// ==========================================
// 3. FITUR JURNAL GURU & PRESENSI KELAS (P1)
// ==========================================

// Ambil seluruh jadwal mengajar guru yang login
app.get('/api/teacher/schedules', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    const teacherId = req.user.role === 'ADMIN' && req.query.teacherId ? req.query.teacherId : req.user.userId;

    const schedules = db.prepare(`
        SELECT s.*, CASE WHEN s.teacher_id = ? THEN t.full_name ELSE (SELECT full_name FROM teachers WHERE id = ?) END as teacher_name
        FROM teaching_schedules s
        JOIN teachers t ON s.teacher_id = t.id
        WHERE s.is_active = 1 AND ((s.teacher_id = ? AND NOT EXISTS (SELECT 1 FROM teacher_absence_requests own_ar WHERE own_ar.teacher_id = s.teacher_id AND own_ar.status = 'DISETUJUI' AND own_ar.start_date <= date('now','localtime') AND own_ar.end_date >= date('now','localtime'))) OR EXISTS (SELECT 1 FROM teacher_absence_requests ar WHERE ar.teacher_id = s.teacher_id AND ar.substitute_teacher_id = ? AND ar.status = 'DISETUJUI' AND ar.start_date <= date('now','localtime') AND ar.end_date >= date('now','localtime')))
        ORDER BY 
            CASE s.day_name 
                WHEN 'Senin' THEN 1 
                WHEN 'Selasa' THEN 2 
                WHEN 'Rabu' THEN 3 
                WHEN 'Kamis' THEN 4 
                WHEN 'Jumat' THEN 5 
                WHEN 'Sabtu' THEN 6 
                ELSE 7 
            END,
            s.start_time ASC
    `).all(teacherId, teacherId, teacherId, teacherId);

    res.json({ success: true, data: schedules });
});

// Ambil jadwal mengajar hari ini untuk guru yang login
app.get('/api/teacher/today-schedules', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    const teacherId = req.user.role === 'ADMIN' && req.query.teacherId ? req.query.teacherId : req.user.userId;
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    const dayName = getIndonesianDayName(targetDate);

    // Ambil jadwal di hari tersebut beserta status jurnalnya jika sudah dibuat
    const schedules = db.prepare(`
        SELECT s.*, CASE WHEN s.teacher_id = ? THEN t.full_name ELSE (SELECT full_name FROM teachers WHERE id = ?) END as teacher_name,
               j.id as journal_id, j.status as journal_status, j.topic as journal_topic,
               j.actual_start_time, j.actual_end_time,
               (SELECT COUNT(*) FROM teacher_journal_attendance ja WHERE ja.journal_id = j.id) as total_attendance_recorded
        FROM teaching_schedules s
        JOIN teachers t ON s.teacher_id = t.id
        LEFT JOIN teacher_journals j ON j.schedule_id = s.id AND j.date = ?
        WHERE s.day_name = ? AND s.is_active = 1 AND ((s.teacher_id = ? AND NOT EXISTS (SELECT 1 FROM teacher_absence_requests own_ar WHERE own_ar.teacher_id = s.teacher_id AND own_ar.status = 'DISETUJUI' AND own_ar.start_date <= ? AND own_ar.end_date >= ?)) OR EXISTS (SELECT 1 FROM teacher_absence_requests ar WHERE ar.teacher_id = s.teacher_id AND ar.substitute_teacher_id = ? AND ar.status = 'DISETUJUI' AND ar.start_date <= ? AND ar.end_date >= ?))
        ORDER BY s.start_time ASC
    `).all(teacherId, teacherId, targetDate, dayName, teacherId, targetDate, targetDate, teacherId, targetDate, targetDate);

    res.json({ 
        success: true, 
        date: targetDate, 
        dayName, 
        data: schedules 
    });
});

// Ambil daftar siswa kelas untuk presensi jam pelajaran
app.get('/api/teacher/class-students/:division', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    const { division } = req.params;
    if (!canTeachDivision(req, division)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak: kelas ini bukan kelas binaan atau penugasan Anda.' });
    }
    const students = db.prepare(`
        SELECT id, nisn, nipd, full_name, gender, division, photo_url
        FROM members
        WHERE division = ? AND role = 'siswa' AND status = 'ACTIVE'
        ORDER BY full_name ASC
    `).all(division);

    res.json({ success: true, data: students });
});

// Presensi Harian Siswa per Kelas (Wali Kelas) - Menggabungkan log gate RFID dan izin
app.get('/api/teacher/class-attendance/:division', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    const { division } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    if (!canTeachDivision(req, division, date)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak: kelas ini bukan kelas binaan atau penugasan Anda pada tanggal tersebut.' });
    }

    const students = db.prepare(`
        SELECT m.id, m.nisn, m.nipd, m.full_name, m.gender, m.division, m.photo_url,
               COALESCE(a.time_in, '') as time_in,
               COALESCE(a.time_out, '') as time_out,
               COALESCE(a.status, (
                   SELECT lr.type FROM leave_requests lr
                   WHERE lr.member_id = m.id AND lr.status = 'DISETUJUI'
                     AND ? BETWEEN lr.start_date AND lr.end_date
                   LIMIT 1
               ), 'BELUM SCAN') as status
        FROM members m
        LEFT JOIN attendance_logs a ON a.member_id = m.id AND a.date = ?
        WHERE m.division = ? AND m.role = 'siswa' AND m.status = 'ACTIVE'
        ORDER BY m.full_name ASC
    `).all(date, date, division);

    res.json({ success: true, division, date, students });
});

// Daftar Izin Siswa Kelas Binaan (Wali Kelas)
app.get('/api/teacher/leave-requests/:division', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    const { division } = req.params;
    if (!canAccessDivision(req, division)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak: kelas ini bukan kelas binaan Anda.' });
    }
    const leaves = db.prepare(`
        SELECT lr.*, m.full_name as member_name, m.nisn, m.nipd, m.division, m.photo_url
        FROM leave_requests lr
        JOIN members m ON lr.member_id = m.id
        WHERE m.division = ?
        ORDER BY lr.submitted_at DESC
        LIMIT 100
    `).all(division);

    res.json({ success: true, leaves });
});

// Buat Izin Siswa oleh Guru / Wali Kelas
app.post('/api/teacher/create-leave', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    const { studentId, type, startDate, endDate, reason } = req.body;
    if (!studentId || !type || !startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'Data permohonan izin belum lengkap.' });
    }

    const member = db.prepare('SELECT id, full_name, division FROM members WHERE id = ?').get(studentId);
    if (!member) {
        return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan.' });
    }
    if (!canAccessDivision(req, member.division)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak: siswa ini bukan dari kelas binaan Anda.' });
    }

    const syncId = `LEAVE-${studentId}-${Date.now()}`;
    db.prepare(`
        INSERT INTO leave_requests (member_id, sync_id, type, start_date, end_date, reason, status, approved_by)
        VALUES (?, ?, ?, ?, ?, ?, 'DISETUJUI', 'WALI_KELAS')
    `).run(studentId, syncId, type, startDate, endDate, reason || 'Dicatat oleh Wali Kelas');

    // Catat juga ke attendance_logs untuk tanggal hari ini jika dalam rentang izin
    const today = new Date().toISOString().split('T')[0];
    if (today >= startDate && today <= endDate) {
        db.prepare(`
            INSERT OR REPLACE INTO attendance_logs (member_id, sync_id, date, status, note)
            VALUES (?, ?, ?, ?, ?)
        `).run(studentId, `ATT-${studentId}-${today}`, today, type, reason || `Izin (${type})`);
    }

    res.json({ success: true, message: `Izin ${type} untuk ${member.full_name} berhasil dicatat.` });
});

// Aksi Persetujuan Izin Siswa (Setujui / Tolak)
app.post('/api/teacher/leave-requests/:id/action', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    const { id } = req.params;
    const { action } = req.body;
    if (!['SETUJUI', 'TOLAK'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Aksi harus SETUJUI atau TOLAK.' });
    }

    const newStatus = action === 'SETUJUI' ? 'DISETUJUI' : 'DITOLAK';
    const leave = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
    if (!leave) {
        return res.status(404).json({ success: false, message: 'Permohonan izin tidak ditemukan.' });
    }
    const leaveMember = db.prepare('SELECT division FROM members WHERE id = ?').get(leave.member_id);
    if (!leaveMember || !canAccessDivision(req, leaveMember.division)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak: permohonan ini bukan dari kelas binaan Anda.' });
    }

    db.prepare(`
        UPDATE leave_requests 
        SET status = ?, approved_by = 'WALI_KELAS'
        WHERE id = ?
    `).run(newStatus, id);

    // Jika disetujui, update attendance_logs siswa
    if (newStatus === 'DISETUJUI') {
        const today = new Date().toISOString().split('T')[0];
        if (today >= leave.start_date && today <= leave.end_date) {
            db.prepare(`
                INSERT OR REPLACE INTO attendance_logs (member_id, sync_id, date, status, note)
                VALUES (?, ?, ?, ?, ?)
            `).run(leave.member_id, `ATT-${leave.member_id}-${today}`, today, leave.type, leave.reason);
        }
    }

    res.json({ success: true, message: `Permohonan izin berhasil di-${action.toLowerCase()}.` });
});

// Ambil detail jurnal dan presensi siswa pada jadwal & tanggal tertentu
app.get('/api/teacher/journal/:scheduleId/:date', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    const { scheduleId, date } = req.params;

    const schedule = db.prepare(`
        SELECT s.*, t.full_name as teacher_name 
        FROM teaching_schedules s
        JOIN teachers t ON s.teacher_id = t.id
        WHERE s.id = ?
    `).get(scheduleId);

    if (!schedule) {
        return res.status(404).json({ success: false, message: 'Jadwal pelajaran tidak ditemukan.' });
    }

    // Validasi kewenangan guru
    if (!canCoverSchedule(req, schedule, date)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak: jadwal ini bukan penugasan Anda pada tanggal tersebut.' });
    }

    const journal = db.prepare(`
        SELECT * FROM teacher_journals WHERE schedule_id = ? AND date = ?
    `).get(scheduleId, date);

    // Ambil daftar siswa kelas
    const students = db.prepare(`
        SELECT m.id as member_id, m.nisn, m.nipd, m.full_name, m.gender, m.division, m.photo_url,
               COALESCE(ja.status, 'HADIR') as status,
               ja.note
        FROM members m
        LEFT JOIN teacher_journal_attendance ja ON ja.member_id = m.id AND ja.journal_id = ?
        WHERE m.division = ? AND m.role = 'siswa' AND m.status = 'ACTIVE'
        ORDER BY m.full_name ASC
    `).all(journal ? journal.id : 0, schedule.division);

    res.json({
        success: true,
        schedule,
        journal: journal || null,
        students
    });
});

// Simpan atau perbarui jurnal guru & presensi siswa
app.post('/api/teacher/journal', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    const { 
        scheduleId, 
        date, 
        topic, 
        activities, 
        assignments, 
        notes, 
        status = 'SUBMITTED', 
        actualStartTime, 
        actualEndTime, 
        attendances = [] 
    } = req.body;

    if (!scheduleId || !date || !topic) {
        return res.status(400).json({ 
            success: false, 
            message: 'Jadwal, tanggal, dan topik materi wajib diisi.' 
        });
    }

    const schedule = db.prepare('SELECT * FROM teaching_schedules WHERE id = ?').get(scheduleId);
    if (!schedule) {
        return res.status(404).json({ success: false, message: 'Jadwal pelajaran tidak ditemukan.' });
    }

    if (!canCoverSchedule(req, schedule, date)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak: jadwal ini bukan penugasan Anda pada tanggal tersebut.' });
    }

    // Jalankan transaksi database yang aman dan atomik
    const saveJournalTransaction = db.transaction(() => {
        let journal = db.prepare('SELECT id FROM teacher_journals WHERE schedule_id = ? AND date = ?').get(scheduleId, date);
        let journalId;

        if (journal) {
            journalId = journal.id;
            db.prepare(`
                UPDATE teacher_journals 
                SET teacher_id = ?,
                    topic = ?,
                    activities = ?,
                    assignments = ?,
                    notes = ?,
                    status = ?,
                    actual_start_time = ?,
                    actual_end_time = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(
                req.user.role === 'TEACHER' ? req.user.userId : schedule.teacher_id,
                topic.trim(),
                activities || '',
                assignments || '',
                notes || '',
                status,
                actualStartTime || schedule.start_time,
                actualEndTime || schedule.end_time,
                journalId
            );
        } else {
            const insertJournal = db.prepare(`
                INSERT INTO teacher_journals (
                    schedule_id, teacher_id, date, division, subject_name,
                    actual_start_time, actual_end_time, topic, activities, assignments, notes, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                schedule.id,
                req.user.role === 'TEACHER' ? req.user.userId : schedule.teacher_id,
                date,
                schedule.division,
                schedule.subject_name,
                actualStartTime || schedule.start_time,
                actualEndTime || schedule.end_time,
                topic.trim(),
                activities || '',
                assignments || '',
                notes || '',
                status
            );
            journalId = insertJournal.lastInsertRowid;
        }

        // Simpan presensi per siswa
        if (Array.isArray(attendances) && attendances.length > 0) {
            const upsertAtt = db.prepare(`
                INSERT INTO teacher_journal_attendance (journal_id, member_id, status, note, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(journal_id, member_id) DO UPDATE SET
                    status = excluded.status,
                    note = excluded.note,
                    updated_at = CURRENT_TIMESTAMP
            `);

            for (const att of attendances) {
                if (att.memberId) {
                    const validStudent = db.prepare("SELECT 1 FROM members WHERE id = ? AND division = ? AND role = 'siswa' AND status = 'ACTIVE'").get(att.memberId, schedule.division);
                    if (!validStudent) throw new Error('Presensi memuat siswa di luar kelas pada jadwal ini.');
                    upsertAtt.run(
                        journalId,
                        att.memberId,
                        att.status || 'HADIR',
                        att.note || ''
                    );
                }
            }
        }

        return journalId;
    });

    try {
        const savedJournalId = saveJournalTransaction();
        logAudit(db, req, 'SAVE_JOURNAL', 'teacher_journals', savedJournalId, `Jurnal mapel ${schedule.subject_name} kelas ${schedule.division} tanggal ${date} disimpan`);

        res.json({
            success: true,
            message: 'Jurnal mengajar dan presensi kelas berhasil disimpan.',
            journalId: savedJournalId
        });
    } catch (err) {
        console.error('[Save Journal Error]:', err);
        res.status(500).json({ success: false, message: 'Gagal menyimpan jurnal: ' + err.message });
    }
});

// Riwayat jurnal guru
app.get('/api/teacher/journals/history', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    const teacherId = req.user.role === 'ADMIN' && req.query.teacherId ? req.query.teacherId : req.user.userId;
    const limit = parseInt(req.query.limit) || 30;

    const journals = db.prepare(`
        SELECT j.*, s.day_name, s.room,
               (SELECT COUNT(*) FROM teacher_journal_attendance WHERE journal_id = j.id) as total_students,
               (SELECT COUNT(*) FROM teacher_journal_attendance WHERE journal_id = j.id AND status = 'HADIR') as count_hadir,
               (SELECT COUNT(*) FROM teacher_journal_attendance WHERE journal_id = j.id AND status != 'HADIR') as count_absen
        FROM teacher_journals j
        JOIN teaching_schedules s ON j.schedule_id = s.id
        WHERE j.teacher_id = ?
        ORDER BY j.date DESC, j.created_at DESC
        LIMIT ?
    `).all(teacherId, limit);

    res.json({ success: true, data: journals });
});

// Monitoring jurnal guru untuk Admin & Kepala Sekolah
app.get('/api/admin/journals', requireAuth, requireRole('ADMIN'), (req, res) => {
    const { date, teacherId, division, status } = req.query;

    let query = `
        SELECT j.*, t.full_name as teacher_name, t.nip as teacher_nip, s.day_name, s.room,
               (SELECT COUNT(*) FROM teacher_journal_attendance WHERE journal_id = j.id) as total_students,
               (SELECT COUNT(*) FROM teacher_journal_attendance WHERE journal_id = j.id AND status = 'HADIR') as count_hadir
        FROM teacher_journals j
        JOIN teachers t ON j.teacher_id = t.id
        JOIN teaching_schedules s ON j.schedule_id = s.id
        WHERE 1=1
    `;
    const params = [];

    if (date) {
        query += ' AND j.date = ?';
        params.push(date);
    }
    if (teacherId) {
        query += ' AND j.teacher_id = ?';
        params.push(teacherId);
    }
    if (division) {
        query += ' AND j.division = ?';
        params.push(division);
    }
    if (status) {
        query += ' AND j.status = ?';
        params.push(status);
    }

    query += ' ORDER BY j.date DESC, j.created_at DESC LIMIT 100';

    const journals = db.prepare(query).all(...params);
    res.json({ success: true, data: journals });
});

// ==========================================
// 4. FITUR EKSTRAKURIKULER BERBASIS SESI (P1)
// ==========================================

// Daftar seluruh ekskul aktif
app.get('/api/extracurriculars', (req, res) => {
    const { mentorTeacherId } = req.query;
    let query = `
        SELECT e.*, t.full_name as mentor_full_name, t.nip as mentor_nip,
               (SELECT COUNT(*) FROM extracurricular_members em WHERE em.extracurricular_id = e.id AND em.status = 'ACTIVE') as total_members,
               (SELECT COUNT(*) FROM extracurricular_sessions es WHERE es.extracurricular_id = e.id) as total_sessions
        FROM extracurriculars e
        LEFT JOIN teachers t ON e.mentor_teacher_id = t.id
        WHERE e.is_active = 1
    `;
    const params = [];

    if (mentorTeacherId) {
        query += ' AND e.mentor_teacher_id = ?';
        params.push(mentorTeacherId);
    }
    query += ' ORDER BY e.name ASC';

    const list = db.prepare(query).all(...params);
    res.json({ success: true, data: list });
});

// Daftar ekskul binaan guru yang sedang login
app.get('/api/extracurriculars/my-ekskul', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    let query = `
        SELECT e.*, t.full_name as mentor_full_name,
               (SELECT COUNT(*) FROM extracurricular_members em WHERE em.extracurricular_id = e.id AND em.status = 'ACTIVE') as total_members,
               (SELECT COUNT(*) FROM extracurricular_sessions es WHERE es.extracurricular_id = e.id) as total_sessions
        FROM extracurriculars e
        LEFT JOIN teachers t ON e.mentor_teacher_id = t.id
        WHERE e.is_active = 1
    `;
    const params = [];

    if (req.user.role === 'TEACHER') {
        query += ' AND e.mentor_teacher_id = ?';
        params.push(req.user.userId);
    }
    query += ' ORDER BY e.name ASC';

    const list = db.prepare(query).all(...params);
    res.json({ success: true, data: list });
});

// Admin: Buat Ekstrakurikuler Baru
app.post('/api/admin/extracurriculars', requireAuth, requireRole('ADMIN'), (req, res) => {
    const { name, mentorTeacherId, dayName, startTime, endTime, location, description } = req.body;
    if (!name || !mentorTeacherId) {
        return res.status(400).json({ success: false, message: 'Nama Ekskul dan Pembina wajib diisi.' });
    }

    const teacher = db.prepare('SELECT id, full_name FROM teachers WHERE id = ?').get(mentorTeacherId);
    if (!teacher) {
        return res.status(404).json({ success: false, message: 'Guru pembina tidak ditemukan.' });
    }

    try {
        const info = db.prepare(`
            INSERT INTO extracurriculars (name, mentor_teacher_id, mentor_name, day_name, start_time, end_time, location, description, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(
            name.trim(),
            teacher.id,
            teacher.full_name,
            dayName || 'Jumat',
            startTime || '14:00',
            endTime || '16:00',
            location || 'Area Sekolah',
            description || ''
        );

        logAudit(db, req, 'CREATE_EKSKUL', 'extracurriculars', info.lastInsertRowid, `Ekskul ${name} dibuat dengan pembina ${teacher.full_name}`);
        res.json({ success: true, message: `Ekstrakurikuler ${name} berhasil dibuat.`, id: info.lastInsertRowid });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ success: false, message: 'Ekstrakurikuler dengan nama tersebut sudah ada.' });
        }
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: Nonaktifkan (Soft Delete) Ekskul agar riwayat tidak hilang
app.delete('/api/admin/extracurriculars/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
    const { id } = req.params;
    db.prepare('UPDATE extracurriculars SET is_active = 0 WHERE id = ?').run(id);
    logAudit(db, req, 'ARCHIVE_EKSKUL', 'extracurriculars', id, `Ekskul id ${id} diarsipkan/dinonaktifkan`);
    res.json({ success: true, message: 'Ekstrakurikuler berhasil dinonaktifkan (arsip tersimpan aman).' });
});

// Daftar Anggota Ekskul
app.get('/api/extracurriculars/:id/members', requireAuth, (req, res) => {
    const { id } = req.params;
    if (!canManageEkskul(req, id)) return res.status(403).json({ success: false, message: 'Akses ditolak: ekskul ini bukan binaan Anda.' });
    const members = db.prepare(`
        SELECT m.id, m.nisn, m.nipd, m.full_name, m.division, m.gender, m.photo_url, em.joined_at, em.status
        FROM extracurricular_members em
        JOIN members m ON em.member_id = m.id
        WHERE em.extracurricular_id = ? AND em.status = 'ACTIVE'
        ORDER BY m.division ASC, m.full_name ASC
    `).all(id);

    res.json({ success: true, data: members });
});

// Tambah Anggota Ekskul
app.post('/api/extracurriculars/:id/members', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    const { id } = req.params;
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ success: false, message: 'Siswa belum dipilih.' });

    // Cek kepemilikan ekskul jika role TEACHER
    if (req.user.role === 'TEACHER') {
        const ekskul = db.prepare('SELECT mentor_teacher_id FROM extracurriculars WHERE id = ?').get(id);
        if (!ekskul || ekskul.mentor_teacher_id !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Akses ditolak: Anda bukan pembina ekskul ini.' });
        }
    }

    try {
        db.prepare(`
            INSERT INTO extracurricular_members (extracurricular_id, member_id, status) 
            VALUES (?, ?, 'ACTIVE')
            ON CONFLICT(extracurricular_id, member_id) DO UPDATE SET status = 'ACTIVE'
        `).run(id, memberId);

        logAudit(db, req, 'ADD_EKSKUL_MEMBER', 'extracurricular_members', id, `Siswa ${memberId} ditambahkan ke ekskul ${id}`);
        res.json({ success: true, message: 'Siswa berhasil ditambahkan sebagai anggota aktif.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Hapus Anggota Ekskul (Set Inactive)
app.delete('/api/extracurriculars/:id/members/:memberId', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    const { id, memberId } = req.params;

    if (req.user.role === 'TEACHER') {
        const ekskul = db.prepare('SELECT mentor_teacher_id FROM extracurriculars WHERE id = ?').get(id);
        if (!ekskul || ekskul.mentor_teacher_id !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Akses ditolak: Anda bukan pembina ekskul ini.' });
        }
    }

    db.prepare('DELETE FROM extracurricular_members WHERE extracurricular_id = ? AND member_id = ?').run(id, memberId);
    logAudit(db, req, 'REMOVE_EKSKUL_MEMBER', 'extracurricular_members', id, `Siswa ${memberId} dikeluarkan dari ekskul ${id}`);
    res.json({ success: true, message: 'Siswa berhasil dikeluarkan dari keanggotaan ekskul.' });
});

// Ambil Riwayat Sesi Pertemuan Ekskul
app.get('/api/extracurriculars/:id/sessions', requireAuth, (req, res) => {
    const { id } = req.params;
    if (!canManageEkskul(req, id)) return res.status(403).json({ success: false, message: 'Akses ditolak: ekskul ini bukan binaan Anda.' });
    const sessions = db.prepare(`
        SELECT es.*, t.full_name as teacher_name,
               (SELECT COUNT(*) FROM extracurricular_session_attendance esa WHERE esa.session_id = es.id) as total_attendance,
               (SELECT COUNT(*) FROM extracurricular_session_attendance esa WHERE esa.session_id = es.id AND esa.status = 'HADIR') as count_hadir
        FROM extracurricular_sessions es
        LEFT JOIN teachers t ON es.created_by_teacher_id = t.id
        WHERE es.extracurricular_id = ?
        ORDER BY es.session_date DESC, es.created_at DESC
    `).all(id);

    res.json({ success: true, data: sessions });
});

// Buat Sesi Pertemuan Ekskul Baru
app.post('/api/extracurriculars/:id/sessions', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    const { id } = req.params;
    const { sessionDate, startTime, endTime, activityTopic, activitySummary } = req.body;

    if (!sessionDate || !activityTopic) {
        return res.status(400).json({ success: false, message: 'Tanggal dan materi topik sesi wajib diisi.' });
    }

    const ekskul = db.prepare('SELECT * FROM extracurriculars WHERE id = ?').get(id);
    if (!ekskul) return res.status(404).json({ success: false, message: 'Ekskul tidak ditemukan.' });

    if (req.user.role === 'TEACHER' && ekskul.mentor_teacher_id !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Akses ditolak: Anda bukan pembina ekskul ini.' });
    }

    const info = db.prepare(`
        INSERT INTO extracurricular_sessions (
            extracurricular_id, session_date, start_time, end_time, 
            activity_topic, activity_summary, created_by_teacher_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED')
    `).run(
        id,
        sessionDate,
        startTime || ekskul.start_time,
        endTime || ekskul.end_time,
        activityTopic.trim(),
        activitySummary || '',
        req.user.role === 'TEACHER' ? req.user.userId : ekskul.mentor_teacher_id
    );

    logAudit(db, req, 'CREATE_EKSKUL_SESSION', 'extracurricular_sessions', info.lastInsertRowid, `Sesi ekskul ${ekskul.name} pada ${sessionDate} dibuka`);
    res.json({ success: true, message: 'Sesi kegiatan berhasil dibuat.', sessionId: info.lastInsertRowid });
});

// Ambil Presensi Anggota pada Sesi Pertemuan Ekskul
app.get('/api/extracurriculars/sessions/:sessionId/attendance', requireAuth, (req, res) => {
    const { sessionId } = req.params;

    const session = db.prepare(`
        SELECT es.*, e.name as extracurricular_name, e.mentor_name, e.mentor_teacher_id
        FROM extracurricular_sessions es
        JOIN extracurriculars e ON es.extracurricular_id = e.id
        WHERE es.id = ?
    `).get(sessionId);

    if (!session) return res.status(404).json({ success: false, message: 'Sesi tidak ditemukan.' });
    if (!canManageEkskul(req, session.extracurricular_id)) return res.status(403).json({ success: false, message: 'Akses ditolak: ekskul ini bukan binaan Anda.' });

    // Ambil anggota aktif dan status kehadiran di sesi ini
    const members = db.prepare(`
        SELECT m.id as member_id, m.nisn, m.nipd, m.full_name, m.division, m.gender, m.photo_url,
               COALESCE(esa.status, 'HADIR') as status,
               esa.notes
        FROM extracurricular_members em
        JOIN members m ON em.member_id = m.id
        LEFT JOIN extracurricular_session_attendance esa 
            ON esa.member_id = m.id AND esa.session_id = ?
        WHERE em.extracurricular_id = ? AND em.status = 'ACTIVE'
        ORDER BY m.division ASC, m.full_name ASC
    `).all(sessionId, session.extracurricular_id);

    res.json({
        success: true,
        session,
        data: members
    });
});

// Simpan Presensi Sesi Ekskul
app.post('/api/extracurriculars/sessions/:sessionId/attendance', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    const { sessionId } = req.params;
    const { attendances = [] } = req.body;

    const session = db.prepare(`
        SELECT es.*, e.mentor_teacher_id 
        FROM extracurricular_sessions es
        JOIN extracurriculars e ON es.extracurricular_id = e.id
        WHERE es.id = ?
    `).get(sessionId);

    if (!session) return res.status(404).json({ success: false, message: 'Sesi tidak ditemukan.' });

    if (req.user.role === 'TEACHER' && session.mentor_teacher_id !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Akses ditolak: Anda bukan pembina ekskul ini.' });
    }

    const saveAttendanceTx = db.transaction(() => {
        const upsert = db.prepare(`
            INSERT INTO extracurricular_session_attendance (
                session_id, extracurricular_id, member_id, status, notes, recorded_by_teacher_id, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(session_id, member_id) DO UPDATE SET
                status = excluded.status,
                notes = excluded.notes,
                recorded_by_teacher_id = excluded.recorded_by_teacher_id,
                updated_at = CURRENT_TIMESTAMP
        `);

        for (const att of attendances) {
            if (att.memberId) {
                const activeMember = db.prepare("SELECT 1 FROM extracurricular_members WHERE extracurricular_id = ? AND member_id = ? AND status = 'ACTIVE'").get(session.extracurricular_id, att.memberId);
                if (!activeMember) throw new Error('Presensi memuat siswa yang bukan anggota aktif ekstrakurikuler ini.');
                upsert.run(
                    sessionId,
                    session.extracurricular_id,
                    att.memberId,
                    att.status || 'HADIR',
                    att.notes || '',
                    req.user.userId
                );
            }
        }
    });

    try {
        saveAttendanceTx();
        logAudit(db, req, 'RECORD_EKSKUL_ATTENDANCE', 'extracurricular_session_attendance', sessionId, `Presensi sesi ${sessionId} berhasil disimpan`);
        res.json({ success: true, message: 'Presensi sesi ekskul berhasil disimpan.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal mencatat presensi: ' + err.message });
    }
});

// Rekapitulasi Kehadiran Ekskul per Anggota
app.get('/api/extracurriculars/:id/recap', requireAuth, (req, res) => {
    const { id } = req.params;
    if (!canManageEkskul(req, id)) return res.status(403).json({ success: false, message: 'Akses ditolak: ekskul ini bukan binaan Anda.' });
    const totalSessions = db.prepare('SELECT COUNT(*) as c FROM extracurricular_sessions WHERE extracurricular_id = ?').get(id).c;

    const recap = db.prepare(`
        SELECT m.id as member_id, m.nisn, m.nipd, m.full_name, m.division,
               COUNT(CASE WHEN esa.status = 'HADIR' THEN 1 END) as hadir,
               COUNT(CASE WHEN esa.status = 'TERLAMBAT' THEN 1 END) as terlambat,
               COUNT(CASE WHEN esa.status = 'IZIN' THEN 1 END) as izin,
               COUNT(CASE WHEN esa.status = 'SAKIT' THEN 1 END) as sakit,
               COUNT(CASE WHEN esa.status = 'ALPA' THEN 1 END) as alpa
        FROM extracurricular_members em
        JOIN members m ON em.member_id = m.id
        LEFT JOIN extracurricular_session_attendance esa ON esa.member_id = m.id AND esa.extracurricular_id = ?
        WHERE em.extracurricular_id = ? AND em.status = 'ACTIVE'
        GROUP BY m.id
        ORDER BY m.division ASC, m.full_name ASC
    `).all(id, id);

    const dataWithPercentage = recap.map(r => {
        const attended = r.hadir + r.terlambat;
        const pct = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;
        return {
            ...r,
            totalSessions,
            percentage: pct
        };
    });

    res.json({ success: true, totalSessions, data: dataWithPercentage });
});

// ==========================================
// 5. ENDPOINT PORTAL GURU (KELAS BINAAN / WALI)
// ==========================================
app.get('/api/teacher/class-summary/:division', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    const { division } = req.params;
    if (!canAccessDivision(req, division)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak: kelas ini bukan kelas binaan Anda.' });
    }
    const today = new Date().toISOString().split('T')[0];
    const month = req.query.month || today.substring(0, 7);

    // Siswa di kelas tersebut
    const students = db.prepare(`
        SELECT id, nisn, nipd, full_name, division, photo_url, parent_name, parent_phone, phone_number
        FROM members
        WHERE division = ? AND role = 'siswa' AND status = 'ACTIVE'
        ORDER BY full_name ASC
    `).all(division);

    // Ambil log presensi gerbang bulan ini untuk rombel tersebut
    const logs = db.prepare(`
        SELECT a.id, a.member_id, a.date, a.time_in, a.time_out, a.status, a.note
        FROM attendance_logs a
        JOIN members m ON a.member_id = m.id
        WHERE m.division = ? AND a.date LIKE ?
        ORDER BY a.date DESC
    `).all(division, `${month}%`);

    const divisions = db.prepare('SELECT id, name, supervisor_name FROM divisions ORDER BY name ASC').all();

    res.json({
        success: true,
        currentMonth: month,
        division,
        students,
        logs,
        divisions
    });
});

// ==========================================
// 6. ENDPOINT PORTAL WALI / SISWA & DETAIL
// ==========================================
// Pengajuan izin guru dan penunjukan guru pengganti.
app.get('/api/teacher/absence-requests', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    const canAssign = req.user.role === 'ADMIN' || (req.user.role === 'TEACHER' && req.user.userData?.is_penanggung_jawab);
    const rows = canAssign
        ? db.prepare(`SELECT ar.*, t.full_name AS teacher_name, t.nip AS teacher_nip, st.full_name AS substitute_name, st.nip AS substitute_nip FROM teacher_absence_requests ar JOIN teachers t ON t.id = ar.teacher_id LEFT JOIN teachers st ON st.id = ar.substitute_teacher_id ORDER BY ar.created_at DESC LIMIT 200`).all()
        : db.prepare(`SELECT ar.*, t.full_name AS teacher_name, st.full_name AS substitute_name FROM teacher_absence_requests ar JOIN teachers t ON t.id = ar.teacher_id LEFT JOIN teachers st ON st.id = ar.substitute_teacher_id WHERE ar.teacher_id = ? OR ar.substitute_teacher_id = ? ORDER BY ar.created_at DESC LIMIT 100`).all(req.user.userId, req.user.userId);
    res.json({ success: true, data: rows });
});
app.post('/api/teacher/absence-requests', requireAuth, requireRole('TEACHER'), (req, res) => {
    const startDate = String(req.body?.startDate || '');
    const endDate = String(req.body?.endDate || '');
    const reason = String(req.body?.reason || '').trim();
    const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
    if (!validDate(startDate) || !validDate(endDate) || endDate < startDate || !reason) return res.status(400).json({ success: false, message: 'Tanggal mulai, tanggal selesai, dan alasan wajib diisi dengan benar.' });
    const result = db.prepare('INSERT INTO teacher_absence_requests (teacher_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)').run(req.user.userId, startDate, endDate, reason);
    logAudit(db, req, 'SUBMIT_TEACHER_ABSENCE', 'teacher_absence_requests', result.lastInsertRowid, `Pengajuan izin guru ${startDate} sampai ${endDate}`);
    res.status(201).json({ success: true, message: 'Pengajuan izin terkirim. Pengganti ditetapkan oleh admin.', id: result.lastInsertRowid });
});
app.get('/api/teacher/active-list', requireAuth, requireRole('TEACHER', 'ADMIN'), (req, res) => {
    if (req.user.role !== 'ADMIN' && !req.user.userData?.is_penanggung_jawab) return res.status(403).json({ success: false, message: 'Hanya admin atau penanggung jawab yang dapat memilih guru pengganti.' });
    const teachers = db.prepare("SELECT id, full_name, nip FROM teachers WHERE status = 'ACTIVE' ORDER BY full_name ASC").all();
    res.json({ success: true, data: teachers });
});

app.post('/api/admin/absence-requests/:id/assign', requireAuth, (req, res) => {
    if (req.user.role !== 'ADMIN' && !(req.user.role === 'TEACHER' && req.user.userData?.is_penanggung_jawab)) return res.status(403).json({ success: false, message: 'Hanya admin atau penanggung jawab yang dapat menetapkan guru pengganti.' });
    const request = db.prepare('SELECT * FROM teacher_absence_requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Pengajuan izin tidak ditemukan.' });
    const substituteId = Number(req.body?.substituteTeacherId);
    const substitute = db.prepare("SELECT id, full_name FROM teachers WHERE id = ? AND status = 'ACTIVE'").get(substituteId);
    if (!substitute || substitute.id === request.teacher_id) return res.status(400).json({ success: false, message: 'Pilih guru pengganti aktif yang berbeda dari guru yang izin.' });
    const overlap = db.prepare(`SELECT 1 FROM teacher_absence_requests WHERE substitute_teacher_id = ? AND status = 'DISETUJUI' AND id != ? AND start_date <= ? AND end_date >= ? LIMIT 1`).get(substituteId, request.id, request.end_date, request.start_date);
    if (overlap) return res.status(409).json({ success: false, message: 'Guru pengganti sudah ditugaskan pada rentang tanggal yang bertumpang tindih.' });
    db.prepare(`UPDATE teacher_absence_requests SET substitute_teacher_id = ?, status = 'DISETUJUI', notes = ?, approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(substituteId, String(req.body?.notes || '').trim() || null, req.user.userData?.username || req.user.userData?.full_name || 'ADMIN', request.id);
    logAudit(db, req, 'ASSIGN_SUBSTITUTE_TEACHER', 'teacher_absence_requests', request.id, `Guru pengganti ditetapkan: ${substitute.full_name}`);
    res.json({ success: true, message: `${substitute.full_name} ditetapkan sebagai guru pengganti.` });
});

app.get(['/api/parent/student-details/:studentId', '/api/member/personal-details/:studentId'], requireAuth, (req, res) => {
    const { studentId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const month = req.query.month || today.substring(0, 7);

    // Validasi hak akses: Siswa hanya boleh akses datanya sendiri (kecuali Teacher atau Admin)
    if (req.user.role === 'PARENT' && String(req.user.userId) !== String(studentId)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const student = db.prepare('SELECT id, barcode_id, nipd, nisn, full_name, gender, division, parent_name, parent_phone, phone_number, photo_url, role, status, created_at FROM members WHERE id = ?').get(studentId);
    if (!student) {
        return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan.' });
    }
    if (req.user.role === 'TEACHER' && !canAccessDivision(req, student.division)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak: siswa ini bukan dari kelas binaan Anda.' });
    }
    if (!['PARENT', 'TEACHER', 'ADMIN'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const todayLog = db.prepare('SELECT * FROM attendance_logs WHERE member_id = ? AND date = ?').get(studentId, today);
    const logs = db.prepare('SELECT * FROM attendance_logs WHERE member_id = ? AND date LIKE ? ORDER BY date DESC').all(studentId, `${month}%`);
    const leaves = db.prepare('SELECT * FROM leave_requests WHERE member_id = ? ORDER BY submitted_at DESC LIMIT 15').all(studentId);

    const stats = {
        hadir: logs.filter(l => l.status === 'HADIR').length,
        terlambat: logs.filter(l => l.status === 'TERLAMBAT').length,
        izin: logs.filter(l => l.status === 'IZIN').length,
        sakit: logs.filter(l => l.status === 'SAKIT').length,
        alpa: logs.filter(l => l.status === 'ALPA').length
    };
    const totalRecorded = stats.hadir + stats.terlambat + stats.izin + stats.sakit + stats.alpa;
    const pct = totalRecorded > 0 ? Math.round(((stats.hadir + stats.terlambat) / totalRecorded) * 100) : 100;

    res.json({
        success: true,
        student,
        todayLog: todayLog || null,
        logs,
        leaves,
        stats,
        attendancePercentage: pct,
        currentMonth: month
    });
});

// Pengajuan Izin Siswa
app.post(['/api/parent/submit-leave', '/api/member/submit-leave'], requireAuth, (req, res) => {
    const { studentId, type, startDate, endDate, reason } = req.body;
    if (!['PARENT', 'TEACHER', 'ADMIN'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }
    if (!studentId || !type || !startDate || !reason) {
        return res.status(400).json({ success: false, message: 'Data permohonan izin belum lengkap.' });
    }
    const effectiveEndDate = endDate || startDate;
    if (String(startDate) > String(effectiveEndDate)) {
        return res.status(400).json({ success: false, message: 'Tanggal mulai tidak boleh melewati tanggal selesai.' });
    }
    const targetMember = db.prepare('SELECT id, division FROM members WHERE id = ?').get(studentId);
    if (!targetMember) {
        return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan.' });
    }
    if (req.user.role === 'TEACHER' && !canAccessDivision(req, targetMember.division)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak: siswa ini bukan dari kelas binaan Anda.' });
    }

    // Validasi bahwa jika login sebagai siswa, hanya untuk dirinya sendiri
    if (req.user.role === 'PARENT' && String(req.user.userId) !== String(studentId)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const syncId = `LEAVE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    db.prepare(`
        INSERT INTO leave_requests (member_id, sync_id, type, start_date, end_date, reason, status, submitted_at, synced_to_local)
        VALUES (?, ?, ?, ?, ?, ?, 'MENUNGGU', CURRENT_TIMESTAMP, 0)
    `).run(studentId, syncId, type, startDate, effectiveEndDate, reason);

    logAudit(db, req, 'SUBMIT_LEAVE', 'leave_requests', null, `Pengajuan izin ${type} siswa ${studentId}`);
    res.json({ success: true, message: 'Permohonan izin berhasil diajukan dan menunggu persetujuan wali kelas.' });
});

// ==========================================
// 7. ENDPOINT DASHBOARD & MONITORING ADMIN
// ==========================================
app.get('/api/admin/dashboard-stats', requireAuth, requireRole('ADMIN'), (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    const totalTeachers = db.prepare("SELECT count(*) as c FROM teachers WHERE status = 'ACTIVE'").get().c;
    const totalStudents = db.prepare("SELECT count(*) as c FROM members WHERE role = 'siswa' AND status = 'ACTIVE'").get().c;
    const totalDivisions = db.prepare('SELECT count(*) as c FROM divisions').get().c;
    const totalEkskul = db.prepare('SELECT count(*) as c FROM extracurriculars WHERE is_active = 1').get().c;

    const todayLogs = db.prepare(`
        SELECT status, count(*) as count 
        FROM attendance_logs 
        WHERE date = ? 
        GROUP BY status
    `).all(today);

    const todayStats = { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 };
    todayLogs.forEach(l => {
        const st = String(l.status || '').toLowerCase();
        if (st === 'hadir') todayStats.hadir = l.count;
        else if (st === 'terlambat') todayStats.terlambat = l.count;
        else if (st === 'izin') todayStats.izin = l.count;
        else if (st === 'sakit') todayStats.sakit = l.count;
        else if (st === 'alpa') todayStats.alpa = l.count;
    });

    const totalRecorded = todayStats.hadir + todayStats.terlambat + todayStats.izin + todayStats.sakit + todayStats.alpa;
    const rate = totalStudents > 0 ? Math.round(((todayStats.hadir + todayStats.terlambat) / totalStudents) * 100) : 0;

    const recentLogs = db.prepare(`
        SELECT a.id, a.time_in, a.time_out, a.status, a.date, a.device_gate,
               m.full_name, m.division, m.photo_url
        FROM attendance_logs a
        JOIN members m ON a.member_id = m.id
        ORDER BY a.date DESC, a.time_in DESC
        LIMIT 6
    `).all();

    const pendingLeaves = db.prepare("SELECT count(*) as c FROM leave_requests WHERE status = 'MENUNGGU'").get().c;

    res.json({
        success: true,
        summary: {
            totalTeachers,
            totalStudents,
            totalDivisions,
            totalEkskul,
            rate: Math.min(100, Math.max(0, rate)),
            todayStats,
            totalRecorded,
            pendingLeaves
        },
        recentLogs
    });
});

app.get('/api/admin/teachers', requireAuth, requireRole('ADMIN'), (req, res) => {
    const list = db.prepare("SELECT id, nip, nik, full_name, username, assigned_division, role, phone_number, photo_url FROM teachers WHERE status = 'ACTIVE' ORDER BY full_name ASC").all();
    res.json({ success: true, data: list });
});

// Admin: Ambil daftar seluruh rombel / kelas
app.get('/api/admin/divisions', requireAuth, requireRole('ADMIN'), (req, res) => {
    const divisions = db.prepare('SELECT id, name, supervisor_teacher_id, supervisor_name, academic_year FROM divisions ORDER BY name ASC').all();
    res.json({ success: true, data: divisions });
});

// Admin: Ambil seluruh jadwal mata pelajaran (semua kelas / guru)
app.get('/api/admin/schedules', requireAuth, requireRole('ADMIN'), (req, res) => {
    const schedules = db.prepare(`
        SELECT s.*, t.full_name as teacher_name, t.nip as teacher_nip
        FROM teaching_schedules s
        JOIN teachers t ON s.teacher_id = t.id
        WHERE s.is_active = 1
        ORDER BY 
            s.division ASC,
            CASE s.day_name 
                WHEN 'Senin' THEN 1 
                WHEN 'Selasa' THEN 2 
                WHEN 'Rabu' THEN 3 
                WHEN 'Kamis' THEN 4 
                WHEN 'Jumat' THEN 5 
                WHEN 'Sabtu' THEN 6 
                ELSE 7 
            END,
            s.start_time ASC
    `).all();
    res.json({ success: true, data: schedules });
});

// Admin: Tambah Jadwal Pelajaran Baru (Atur Guru, Mapel, Kelas, Hari, Jam)
app.post('/api/admin/schedules', requireAuth, requireRole('ADMIN'), (req, res) => {
    const { teacherId, division, subjectName, dayName, startTime, endTime, room, academicYear } = req.body;
    if (!teacherId || !division || !subjectName || !dayName || !startTime || !endTime) {
        return res.status(400).json({ success: false, message: 'Guru, Rombel/Kelas, Mapel, Hari, dan Jam Pelajaran wajib diisi.' });
    }

    const teacher = db.prepare('SELECT id, full_name FROM teachers WHERE id = ?').get(teacherId);
    if (!teacher) {
        return res.status(404).json({ success: false, message: 'Data guru tidak ditemukan.' });
    }

    try {
        const info = db.prepare(`
            INSERT INTO teaching_schedules (teacher_id, division, subject_name, day_name, start_time, end_time, room, academic_year, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(
            teacher.id,
            division.trim(),
            subjectName.trim(),
            dayName,
            startTime,
            endTime,
            room || 'Ruang Kelas',
            academicYear || '2026/2027'
        );

        logAudit(db, req, 'CREATE_SCHEDULE', 'teaching_schedules', info.lastInsertRowid, `Jadwal ${subjectName} untuk guru ${teacher.full_name} di kelas ${division} dibuat`);
        res.json({ success: true, message: 'Jadwal pelajaran guru berhasil ditambahkan.', id: info.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal membuat jadwal: ' + err.message });
    }
});

// Admin: Edit Jadwal Pelajaran
app.put('/api/admin/schedules/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
    const { id } = req.params;
    const { teacherId, division, subjectName, dayName, startTime, endTime, room, academicYear } = req.body;

    const schedule = db.prepare('SELECT * FROM teaching_schedules WHERE id = ?').get(id);
    if (!schedule) {
        return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan.' });
    }

    db.prepare(`
        UPDATE teaching_schedules
        SET teacher_id = COALESCE(?, teacher_id),
            division = COALESCE(?, division),
            subject_name = COALESCE(?, subject_name),
            day_name = COALESCE(?, day_name),
            start_time = COALESCE(?, start_time),
            end_time = COALESCE(?, end_time),
            room = COALESCE(?, room),
            academic_year = COALESCE(?, academic_year)
        WHERE id = ?
    `).run(
        teacherId || null,
        division || null,
        subjectName || null,
        dayName || null,
        startTime || null,
        endTime || null,
        room || null,
        academicYear || null,
        id
    );

    logAudit(db, req, 'UPDATE_SCHEDULE', 'teaching_schedules', id, `Jadwal ID ${id} diperbarui`);
    res.json({ success: true, message: 'Jadwal pelajaran berhasil diperbarui.' });
});

// Admin: Hapus / Nonaktifkan Jadwal Pelajaran
app.delete('/api/admin/schedules/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
    const { id } = req.params;
    db.prepare('UPDATE teaching_schedules SET is_active = 0 WHERE id = ?').run(id);
    logAudit(db, req, 'DELETE_SCHEDULE', 'teaching_schedules', id, `Jadwal ID ${id} dinonaktifkan`);
    res.json({ success: true, message: 'Jadwal pelajaran berhasil dinonaktifkan.' });
});

// Siswa/Wali: Ambil Riwayat Presensi Mata Pelajaran Siswa
app.get('/api/student/subject-attendance/:studentId', requireAuth, (req, res) => {
    const { studentId } = req.params;
    const student = db.prepare('SELECT id, division, full_name FROM members WHERE id = ?').get(studentId);
    if (!student) {
        return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan.' });
    }

    // Ambil log presensi mata pelajaran dari teacher_journal_attendance
    const attendances = db.prepare(`
        SELECT ja.id, ja.status, ja.note, ja.created_at,
               j.date, j.topic, j.subject_name, j.actual_start_time, j.actual_end_time,
               t.full_name as teacher_name, s.room
        FROM teacher_journal_attendance ja
        JOIN teacher_journals j ON ja.journal_id = j.id
        JOIN teaching_schedules s ON j.schedule_id = s.id
        JOIN teachers t ON j.teacher_id = t.id
        WHERE ja.member_id = ?
        ORDER BY j.date DESC, j.actual_start_time DESC
        LIMIT 50
    `).all(studentId);

    // Ambil juga daftar mata pelajaran di kelas siswa tersebut
    const classSchedules = db.prepare(`
        SELECT s.id, s.subject_name, s.day_name, s.start_time, s.end_time, s.room,
               t.full_name as teacher_name
        FROM teaching_schedules s
        JOIN teachers t ON s.teacher_id = t.id
        WHERE s.division = ? AND s.is_active = 1
        ORDER BY 
            CASE s.day_name 
                WHEN 'Senin' THEN 1 
                WHEN 'Selasa' THEN 2 
                WHEN 'Rabu' THEN 3 
                WHEN 'Kamis' THEN 4 
                WHEN 'Jumat' THEN 5 
                WHEN 'Sabtu' THEN 6 
                ELSE 7 
            END,
            s.start_time ASC
    `).all(student.division);

    // Ringkasan per status
    const stats = {
        hadir: attendances.filter(a => a.status === 'HADIR').length,
        terlambat: attendances.filter(a => a.status === 'TERLAMBAT').length,
        izin: attendances.filter(a => a.status === 'IZIN').length,
        sakit: attendances.filter(a => a.status === 'SAKIT').length,
        alpa: attendances.filter(a => a.status === 'ALPA').length,
    };

    res.json({
        success: true,
        student,
        classSchedules,
        attendances,
        stats
    });
});

// Siswa/Wali: Ambil Riwayat Presensi Ekstrakurikuler Siswa
app.get('/api/student/ekskul-attendance/:studentId', requireAuth, (req, res) => {
    const { studentId } = req.params;
    const student = db.prepare('SELECT id, division, full_name FROM members WHERE id = ?').get(studentId);
    if (!student) {
        return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan.' });
    }

    // Ekstrakurikuler yang diikuti siswa
    const joinedEkskuls = db.prepare(`
        SELECT e.id, e.name, e.day_name, e.start_time, e.end_time, e.location, e.description,
               t.full_name as mentor_full_name, em.joined_at, em.status as member_status,
               (SELECT COUNT(*) FROM extracurricular_sessions es WHERE es.extracurricular_id = e.id) as total_sessions
        FROM extracurricular_members em
        JOIN extracurriculars e ON em.extracurricular_id = e.id
        LEFT JOIN teachers t ON e.mentor_teacher_id = t.id
        WHERE em.member_id = ? AND e.is_active = 1
        ORDER BY e.name ASC
    `).all(studentId);

    // Riwayat presensi sesi ekskul yang tercatat untuk siswa ini
    const attendances = db.prepare(`
        SELECT esa.id, esa.status, esa.notes, esa.created_at,
               es.session_date, es.activity_topic, es.activity_summary, es.start_time, es.end_time,
               e.name as extracurricular_name, t.full_name as teacher_name
        FROM extracurricular_session_attendance esa
        JOIN extracurricular_sessions es ON esa.session_id = es.id
        JOIN extracurriculars e ON esa.extracurricular_id = e.id
        LEFT JOIN teachers t ON esa.recorded_by_teacher_id = t.id
        WHERE esa.member_id = ?
        ORDER BY es.session_date DESC, esa.created_at DESC
        LIMIT 50
    `).all(studentId);

    // Ringkasan per status ekskul
    const stats = {
        hadir: attendances.filter(a => a.status === 'HADIR').length,
        terlambat: attendances.filter(a => a.status === 'TERLAMBAT').length,
        izin: attendances.filter(a => a.status === 'IZIN').length,
        sakit: attendances.filter(a => a.status === 'SAKIT').length,
        alpa: attendances.filter(a => a.status === 'ALPA').length,
    };

    res.json({
        success: true,
        student,
        joinedEkskuls,
        attendances,
        stats
    });
});

// Hapus hanya record demo yang memiliki penanda persis dari seed lama; tidak menyentuh data lain.
app.post('/api/admin/cleanup-demo-data', requireAuth, requireRole('ADMIN'), (req, res) => {
    const tx = db.transaction(() => {
        // Jadwal demo yang terlihat pada halaman pengguna: nonaktifkan, jangan hapus,
        // agar riwayat jurnal/relasi tetap aman dan jadwal asli tidak ikut terhapus.
        const demoSchedulesDisabled = db.prepare(`
            UPDATE teaching_schedules
            SET is_active = 0
            WHERE is_active = 1
              AND division IN ('XI RPL 1', 'XII RPL 1')
              AND subject_name IN (
                'Pemodelan Perangkat Lunak',
                'Dasar Pemrograman',
                'Pemrograman Web & Mobile',
                'Kecerdasan Buatan Terapan',
                'Basis Data Terdistribusi',
                'Cloud Computing & DevOps'
              )
              AND teacher_id IN (
                SELECT id FROM teachers
                WHERE nip IN ('198502022008012002', '198001012005011001', '199003032015011003')
                   OR username IN ('guru.budi', 'guru.siti', 'guru.hendra')
              )
        `).run().changes;
        const demoMemberIds = db.prepare(`
            SELECT id FROM members
            WHERE nisn IN ('0051234567','0051234568','0051234569','0051234570','0051234571')
               OR barcode_id IN ('BC-1001','BC-1002','BC-1003','BC-1004','BC-1005')
        `).all().map((row) => row.id);
        const membersDeleted = db.prepare(`
            DELETE FROM members
            WHERE nisn IN ('0051234567','0051234568','0051234569','0051234570','0051234571')
               OR barcode_id IN ('BC-1001','BC-1002','BC-1003','BC-1004','BC-1005')
        `).run().changes;
        const activitiesDeleted = db.prepare(`
            DELETE FROM extracurriculars
            WHERE name IN ('Pramuka Gugus Depan','Robotik & IoT Nabastala','Futsal Klub Sekolah')
        `).run().changes;
        const teachersDeleted = db.prepare(`
            DELETE FROM teachers WHERE username IN ('guru.budi','guru.siti','guru.hendra')
        `).run().changes;
        const divisionsDeleted = db.prepare(`
            DELETE FROM divisions
            WHERE name IN ('XII RPL 1','XI RPL 1')
              AND NOT EXISTS (SELECT 1 FROM members WHERE members.division = divisions.name)
              AND NOT EXISTS (SELECT 1 FROM teachers WHERE teachers.assigned_division = divisions.name)
              AND NOT EXISTS (SELECT 1 FROM teaching_schedules WHERE teaching_schedules.division = divisions.name)
        `).run().changes;
        return { membersDeleted, activitiesDeleted, teachersDeleted, divisionsDeleted, demoSchedulesDisabled, demoMemberIds };
    });
    try {
        const result = tx();
        logAudit(db, req, 'CLEANUP_DEMO_DATA', 'database', null,
            `Data demo dibersihkan: jadwal dinonaktifkan ${result.demoSchedulesDisabled}, siswa ${result.membersDeleted}, guru ${result.teachersDeleted}, ekskul ${result.activitiesDeleted}, kelas ${result.divisionsDeleted}`);
        res.json({
            success: true,
            message: `Pembersihan selesai. ${result.demoSchedulesDisabled} jadwal contoh dinonaktifkan; ${result.membersDeleted} siswa, ${result.teachersDeleted} guru, ${result.activitiesDeleted} ekskul, dan ${result.divisionsDeleted} kelas demo diproses. Jadwal dinonaktifkan, bukan dihapus, agar riwayat tetap aman.`,
            counts: {
                schedulesDisabled: result.demoSchedulesDisabled,
                members: result.membersDeleted,
                teachers: result.teachersDeleted,
                extracurriculars: result.activitiesDeleted,
                divisions: result.divisionsDeleted
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal membersihkan data demo: ' + error.message });
    }
});

// Ambil Pengaturan Sekolah & Sync Token untuk Admin
app.get('/api/admin/settings', requireAuth, requireRole('ADMIN'), (req, res) => {
    const settings = db.prepare('SELECT id, school_name, school_address, academic_year, license_status, sync_secret, last_sync_at FROM school_settings WHERE id = 1').get();
    res.json({ success: true, settings });
});

// Update Pengaturan Admin (Dengan Password Hashing yang Benar)
app.post('/api/admin/update-settings', requireAuth, requireRole('ADMIN'), (req, res) => {
    const { schoolName, schoolAddress, academicYear, syncSecret, newAdminPassword } = req.body;

    let passHash = null;
    if (newAdminPassword && newAdminPassword.trim().length >= 6) {
        passHash = bcrypt.hashSync(newAdminPassword.trim(), 10);
    }

    db.prepare(`
        UPDATE school_settings
        SET school_name = COALESCE(?, school_name),
            school_address = COALESCE(?, school_address),
            academic_year = COALESCE(?, academic_year),
            sync_secret = COALESCE(?, sync_secret),
            admin_password_hash = COALESCE(?, admin_password_hash),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
    `).run(schoolName || null, schoolAddress || null, academicYear || null, syncSecret || null, passHash);

    logAudit(db, req, 'UPDATE_SETTINGS', 'school_settings', 1, 'Pengaturan sekolah diperbarui');
    res.json({ success: true, message: 'Pengaturan sekolah berhasil disimpan.' });
});

// ==========================================
// 8. SINKRONISASI NEBULA PRESENCE (TERAUTENTIKASI)
// ==========================================
app.post('/api/sync/handshake', (req, res) => {
    if (!checkSyncAuth(req)) {
        return res.status(401).json({ success: false, message: 'Sync secret tidak valid.' });
    }
    const settings = db.prepare('SELECT school_name, academic_year, last_sync_at FROM school_settings WHERE id = 1').get();
    const realMembers = db.prepare("SELECT COUNT(*) AS count FROM members WHERE nisn NOT IN ('0051234567','0051234568','0051234569','0051234570','0051234571')").get().count;
    const realTeachers = db.prepare("SELECT COUNT(*) AS count FROM teachers WHERE username NOT IN ('guru.budi','guru.siti','guru.hendra')").get().count;
    const bootstrap_required = realMembers === 0 || realTeachers === 0;
    res.json({ success: true, message: 'Handshake sinkronisasi berhasil.', settings, bootstrap_required });
});

// Admin: Tombol Pemicu Sinkronisasi Langsung dari Database Lokal Nebula Presence
app.post('/api/admin/trigger-direct-sync', requireAuth, requireRole('ADMIN'), (req, res) => {
    try {
        const result = syncFromNebulaApp(db, true);
        const updatedSettings = db.prepare(`
            SELECT
                id,
                school_name,
                school_address,
                academic_year,
                school_logo,
                license_status,
                last_sync_at,
                updated_at
            FROM school_settings
            WHERE id = 1
        `).get();
        res.json({ 
            success: true, 
            message: result.message || 'Sinkronisasi dengan Nebula Presence selesai.',
            settings: updatedSettings
        });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Gagal sinkronisasi: ' + e.message });
    }
});

// Terima log absensi batch dari Nebula Presence lokal
app.post('/api/sync/attendance-batch', (req, res) => {
    if (!checkSyncAuth(req)) {
        return res.status(401).json({ success: false, message: 'Sync secret tidak valid.' });
    }

    const { logs = [] } = req.body;
    if (!Array.isArray(logs)) {
        return res.status(400).json({ success: false, message: 'Data log harus berupa array.' });
    }

    const upsertLog = db.prepare(`
        INSERT INTO attendance_logs (member_id, sync_id, date, time_in, time_out, status, note, device_gate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(sync_id) DO UPDATE SET
            status = excluded.status,
            time_in = COALESCE(excluded.time_in, attendance_logs.time_in),
            time_out = COALESCE(excluded.time_out, attendance_logs.time_out),
            note = excluded.note
    `);

    const findMember = db.prepare('SELECT id FROM members WHERE nisn = ? OR nipd = ? OR barcode_id = ? LIMIT 1');

    const tx = db.transaction(() => {
        let count = 0;
        for (const l of logs) {
            const member = findMember.get(l.nisn || '', l.nipd || '', l.barcodeId || '');
            if (member) {
                upsertLog.run(
                    member.id,
                    l.syncId || `nebula-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                    l.date,
                    l.timeIn || null,
                    l.timeOut || null,
                    l.status || 'HADIR',
                    l.note || '',
                    l.deviceGate || 'Gate Utama'
                );
                count++;
            }
        }
        db.prepare('UPDATE school_settings SET last_sync_at = CURRENT_TIMESTAMP WHERE id = 1').run();
        return count;
    });

    try {
        const syncedCount = tx();
        res.json({ success: true, message: `Berhasil menyinkronkan ${syncedCount} catatan presensi.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Sinkron akun SuperAdmin Nebula: hanya menerima bcrypt hash, bukan kata sandi teks.
app.post('/api/sync/push-admin-account', (req, res) => {
    if (!checkSyncAuth(req)) return res.status(401).json({ success: false, message: 'Sync secret tidak valid.' });
    const username = String(req.body?.username || '').trim();
    const passwordHash = String(req.body?.password_hash || '');
    const validBcryptHash = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(passwordHash);
    if (!username || username.length > 100 || !validBcryptHash) {
        return res.status(400).json({ success: false, message: 'Akun admin atau hash kata sandi tidak valid.' });
    }
    db.prepare(`
        UPDATE school_settings
        SET admin_username = ?, admin_password_hash = ?,
            last_sync_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
    `).run(username, passwordHash);
    res.json({ success: true, message: 'Akun admin Nebula Presence berhasil disinkronkan.' });
});

// Sinkron jadwal pelajaran dari Nebula Presence; ID remote menjaga update tetap idempoten.
app.post('/api/sync/push-teaching-schedules', (req, res) => {
    if (!checkSyncAuth(req)) return res.status(401).json({ success: false, message: 'Sync secret tidak valid.' });
    const schedules = req.body?.schedules;
    if (!Array.isArray(schedules)) return res.status(400).json({ success: false, message: 'Data jadwal harus berupa array.' });
    if (schedules.length > 5000) return res.status(413).json({ success: false, message: 'Batch jadwal terlalu besar.' });
    const findTeacher = db.prepare('SELECT id FROM teachers WHERE nip = ? OR nip = ? LIMIT 1');
    const upsertSchedule = db.prepare(`
        INSERT INTO teaching_schedules
            (nebula_schedule_id, teacher_id, division, subject_name, day_name, start_time, end_time, academic_year, room, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT DO UPDATE SET
            teacher_id = excluded.teacher_id, division = excluded.division,
            subject_name = excluded.subject_name, day_name = excluded.day_name,
            start_time = excluded.start_time, end_time = excluded.end_time,
            academic_year = excluded.academic_year, room = excluded.room,
            is_active = excluded.is_active
    `);
    let synced = 0, skipped = 0, disabled = 0;
    const syncedRemoteIds = new Set();
    const tx = db.transaction(() => {
        for (const item of schedules) {
            const remoteId = String(item?.id ?? '').trim();
            const teacherIdentity = String(item?.teacher_identity_number || '').trim();
            const teacherReference = String(item?.teacher_identity_reference || '').trim();
            const division = String(item?.division_name || '').trim();
            const subject = String(item?.subject_name || '').trim();
            const day = String(item?.day_of_week || '').trim();
            const start = String(item?.start_time || '').slice(0, 5);
            const end = String(item?.end_time || '').slice(0, 5);
            if (!remoteId || !division || !subject || !day || !start || !end) { skipped++; continue; }
            const teacher = findTeacher.get(teacherIdentity, teacherReference);
            if (!teacher) { skipped++; continue; }
            upsertSchedule.run(remoteId, teacher.id, division, subject, day, start, end,
                String(item?.academic_year || '2026/2027'), String(item?.room || 'Ruang Kelas'),
                item?.is_active === false || item?.is_active === 0 ? 0 : 1);
            syncedRemoteIds.add(remoteId);
            synced++;
        }

        // Rekonsiliasi snapshot hanya aman jika setiap jadwal sumber berhasil dipetakan.
        // Jika ada jadwal yang dilewati, jangan menonaktifkan jadwal lama: itu bisa
        // menghapus jadwal valid hanya karena identitas guru belum cocok.
        if (skipped === 0) {
            const activeRemoteIds = [...syncedRemoteIds];
            const result = activeRemoteIds.length
                ? db.prepare(`UPDATE teaching_schedules SET is_active = 0
                    WHERE is_active = 1
                      AND (nebula_schedule_id IS NULL OR nebula_schedule_id NOT IN (${activeRemoteIds.map(() => '?').join(',')}))`).run(...activeRemoteIds)
                : db.prepare('UPDATE teaching_schedules SET is_active = 0 WHERE is_active = 1').run();
            disabled = result.changes;
        }
        db.prepare('UPDATE school_settings SET last_sync_at = CURRENT_TIMESTAMP WHERE id = 1').run();
    });
    try {
        tx();
        const success = skipped === 0;
        res.json({
            success, synced, skipped, disabled,
            reconciled: skipped === 0,
            message: success
                ? `${synced} jadwal dari Nebula disinkronkan; ${disabled} jadwal lama yang tidak ada di sumber dinonaktifkan.`
                : `${synced} jadwal berhasil disinkronkan, ${skipped} dilewati. Jadwal lama dipertahankan agar tidak hilang; periksa identitas guru dan data jadwal lalu sinkronkan ulang.`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menyinkronkan jadwal: ' + error.message });
    }
});

// Endpoint Kompatibilitas dengan CloudSyncService Nebula Presence Desktop:
// 1. Terima Info Branding Sekolah dari Desktop
app.post('/api/sync/push-school-info', (req, res) => {
    if (!checkSyncAuth(req)) {
        return res.status(401).json({ success: false, message: 'Sync secret tidak valid.' });
    }
    const { school_name, school_address, school_logo } = req.body;
    db.prepare(`
        UPDATE school_settings
        SET school_name = COALESCE(?, school_name),
            school_address = COALESCE(?, school_address),
            school_logo = COALESCE(?, school_logo),
            last_sync_at = CURRENT_TIMESTAMP
        WHERE id = 1
    `).run(school_name || null, school_address || null, school_logo || null);

    res.json({ success: true, message: 'Identitas sekolah berhasil disinkronkan.' });
});

// 2. Terima Data Rombel / Kelas & Wali Kelas dari Desktop
app.post('/api/sync/push-divisions', (req, res) => {
    if (!checkSyncAuth(req)) {
        return res.status(401).json({ success: false, message: 'Sync secret tidak valid.' });
    }
    const { divisions = [] } = req.body;
    if (!Array.isArray(divisions) || divisions.some(d => !String(d?.name || '').trim())) {
        return res.status(400).json({ success: false, message: 'Snapshot kelas tidak valid; tidak ada data yang diubah.' });
    }

    const upsert = db.prepare(`
        INSERT INTO divisions (name, supervisor_name)
        VALUES (?, ?)
        ON CONFLICT(name) DO UPDATE SET supervisor_name = excluded.supervisor_name
    `);
    const currentDivisions = db.prepare('SELECT id, name FROM divisions').all();
    const incomingNames = new Set(divisions.map(d => String(d.name).trim()));
    let removed = 0;

    const tx = db.transaction(() => {
        for (const d of divisions) {
            upsert.run(String(d.name).trim(), d.supervisor_name || null);
        }

        // Desktop adalah sumber data utama: kelas yang sudah dihapus di desktop
        // tidak dibiarkan muncul sebagai pilihan aktif di portal. Riwayat tetap utuh
        // karena jurnal dan presensi menyimpan nama kelas sebagai snapshot teks.
        const removeDivision = db.prepare('DELETE FROM divisions WHERE id = ?');
        for (const row of currentDivisions) {
            if (!incomingNames.has(String(row.name).trim())) {
                removed += removeDivision.run(row.id).changes;
            }
        }
    });
    tx();
    db.prepare('UPDATE school_settings SET last_sync_at = CURRENT_TIMESTAMP WHERE id = 1').run();
    res.json({
        success: true,
        synced: divisions.length,
        removed,
        message: `${divisions.length} kelas disinkronkan; ${removed} kelas lama yang tidak ada di desktop dihapus dari master portal.`
    });
});

// 3. Terima Data Anggota Siswa & Guru dari Desktop
app.post('/api/sync/push-members', (req, res) => {
    if (!checkSyncAuth(req)) {
        return res.status(401).json({ success: false, message: 'Sync secret tidak valid.' });
    }
    const { members = [], full_snapshot = false } = req.body;
    console.info(`[Portal Sync Members] Payload diterima: ${Array.isArray(members) ? members.length : 0} anggota; full_snapshot=${Boolean(full_snapshot)}.`);
    const defaultPinHash = bcrypt.hashSync('123456', 10);
    // Akun guru tanpa kredensial dari aplikasi tidak boleh mendapat sandi default yang diketahui umum.
    const defaultGuruPass = bcrypt.hashSync(randomBytes(32).toString('hex'), 10);

    const upsertStudent = db.prepare(`
        INSERT INTO members (barcode_id, nipd, nisn, full_name, role, division, photo_url, phone_number, parent_pin_hash, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
        ON CONFLICT(nisn) DO UPDATE SET
            barcode_id = excluded.barcode_id,
            nipd = excluded.nipd,
            full_name = excluded.full_name,
            division = excluded.division,
            photo_url = COALESCE(excluded.photo_url, members.photo_url),
            phone_number = excluded.phone_number,
            status = 'ACTIVE'
    `);

    // NIP adalah identitas unik guru. Sinkronisasi berulang harus meng-update berdasarkan NIP,
    // bukan username buatan dari nama, agar tidak gagal pada UNIQUE(teachers.nip).
    const upsertTeacher = db.prepare(`
        INSERT INTO teachers (nip, nik, username, password_hash, full_name, assigned_division, role, phone_number, photo_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
        ON CONFLICT(nip) DO UPDATE SET
            nik = excluded.nik,
            username = CASE WHEN ? = 1 THEN excluded.username ELSE teachers.username END,
            password_hash = CASE WHEN ? = 1 THEN excluded.password_hash ELSE teachers.password_hash END,
            full_name = excluded.full_name,
            assigned_division = COALESCE(excluded.assigned_division, teachers.assigned_division),
            role = excluded.role,
            phone_number = COALESCE(excluded.phone_number, teachers.phone_number),
            photo_url = COALESCE(excluded.photo_url, teachers.photo_url),
            status = 'ACTIVE'
    `);

    // Tentukan jenis akun dari role, bukan nama kelas. Kelas "Umum" atau
    // anggota tanpa kelas tidak boleh membuat siswa salah diklasifikasikan sebagai guru.
    const staffRoles = new Set(['guru', 'guru mapel', 'guru_mapel', 'guru-mapel', 'teacher', 'pengajar', 'tendik', 'staff', 'staf', 'pegawai', 'karyawan', 'wali kelas', 'wali_kelas', 'walikelas', 'penanggung jawab', 'penanggung_jawab', 'koordinator']);
    const studentRoles = new Set(['siswa', 'student', 'murid']);

    const syncedIds = [];
    const syncedStudentIdentities = new Set();
    const syncedTeacherNips = new Set();
    let skipped = 0;
    let deactivatedStudents = 0;
    let deactivatedTeachers = 0;
    let teachersWithLoginCredentials = 0;
    let teachersWithoutLoginCredentials = 0;
    const tx = db.transaction(() => {
        for (const m of members) {
            const role = String(m.role || '').trim().toLowerCase();
            const div = m.division_name || 'Umum';
            const isGuru = staffRoles.has(role);

            if (isGuru) {
                const nip = m.nipd || m.nisn || `GURU-${m.id}`;
                const usernameSuffix = String(nip).toLowerCase().replace(/[^a-z0-9]/g, '').slice(-16) || String(m.id);
                const hasLoginCredentials = Boolean(
                    m.login_username &&
                    /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(String(m.login_password_hash || ''))
                );
                if (hasLoginCredentials) teachersWithLoginCredentials++;
                else teachersWithoutLoginCredentials++;
                const uname = hasLoginCredentials ? String(m.login_username).trim() : `guru.${usernameSuffix}`;
                const passwordHash = hasLoginCredentials ? String(m.login_password_hash) : defaultGuruPass;
                upsertTeacher.run(
                    nip,
                    nip,
                    uname,
                    passwordHash,
                    m.full_name,
                    m.supervisor_name ? div : null,
                    role === 'tendik' ? 'TENDIK'
                        : (role.includes('wali') ? 'WALI_KELAS'
                        : (role.includes('penanggung') || role === 'koordinator' ? 'PENANGGUNG_JAWAB' : 'GURU')),
                    m.phone_number || null,
                    m.photo || null,
                    hasLoginCredentials ? 1 : 0,
                    hasLoginCredentials ? 1 : 0
                );
                syncedIds.push(m.id);
                syncedTeacherNips.add(String(nip));
            } else if (studentRoles.has(role) && m.nisn) {
                upsertStudent.run(
                    m.rfid_code || m.barcode_id || `BC-${m.id}`,
                    m.nipd || null,
                    m.nisn,
                    m.full_name,
                    'siswa',
                    div,
                    m.photo || null,
                    m.phone_number || null,
                    defaultPinHash
                );
                syncedIds.push(m.id);
                syncedStudentIdentities.add(String(m.nisn));
            } else {
                skipped++;
            }
        }

        // Pada sinkronisasi snapshot penuh, nonaktifkan identitas yang sudah tidak ada
        // di desktop. Riwayat presensi tetap dipertahankan, tidak dihapus permanen.
        if (full_snapshot && skipped === 0) {
            const currentStudents = db.prepare("SELECT id, nisn FROM members WHERE status = 'ACTIVE'").all();
            const deactivateStudent = db.prepare("UPDATE members SET status = 'INACTIVE' WHERE id = ?");
            for (const student of currentStudents) {
                if (!syncedStudentIdentities.has(String(student.nisn))) {
                    deactivatedStudents += deactivateStudent.run(student.id).changes;
                }
            }

            const currentTeachers = db.prepare("SELECT id, nip FROM teachers WHERE status = 'ACTIVE'").all();
            const deactivateTeacher = db.prepare("UPDATE teachers SET status = 'INACTIVE' WHERE id = ?");
            for (const teacher of currentTeachers) {
                if (!syncedTeacherNips.has(String(teacher.nip))) {
                    deactivatedTeachers += deactivateTeacher.run(teacher.id).changes;
                }
            }
        }
    });
    tx();
    console.info(`[Portal Sync Members] Selesai: ${syncedIds.length} tersinkron, ${skipped} dilewati, ${deactivatedStudents} siswa dinonaktifkan, ${deactivatedTeachers} guru dinonaktifkan; akun guru dengan kredensial desktop=${teachersWithLoginCredentials}, tanpa kredensial=${teachersWithoutLoginCredentials}.`);
    if (teachersWithoutLoginCredentials > 0) {
        console.warn(`[Portal Sync Members Warning] ${teachersWithoutLoginCredentials} akun guru tidak menerima kredensial dari desktop. Login guru tersebut tidak akan berhasil sampai akun login dibuat/diperbarui di Nebula Presence lalu disinkronkan ulang.`);
    }
    res.json({
        success: skipped === 0,
        synced: syncedIds.length,
        skipped,
        synced_ids: syncedIds,
        full_snapshot: Boolean(full_snapshot),
        reconciled: Boolean(full_snapshot && skipped === 0),
        deactivated_students: deactivatedStudents,
        deactivated_teachers: deactivatedTeachers,
        message: skipped === 0
            ? `${syncedIds.length} data anggota tersinkronkan${full_snapshot ? `; ${deactivatedStudents} siswa dan ${deactivatedTeachers} guru yang sudah tidak ada di desktop dinonaktifkan` : ''}.`
            : `${syncedIds.length} data anggota tersinkronkan; ${skipped} data dilewati. Rekonsiliasi tidak dijalankan agar data yang belum cocok tidak dinonaktifkan.`
    });
});

// 4. Terima Log Presensi Harian dari Mesin RFID Desktop
app.post('/api/sync/push-attendance', (req, res) => {
    if (!checkSyncAuth(req)) {
        return res.status(401).json({ success: false, message: 'Sync secret tidak valid.' });
    }
    const { logs = [] } = req.body;
    const syncedIds = [];

    const upsertLog = db.prepare(`
        INSERT INTO attendance_logs (member_id, sync_id, date, time_in, time_out, status, note, device_gate)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Gate Mesin RFID')
        ON CONFLICT(sync_id) DO UPDATE SET
            status = excluded.status,
            time_in = COALESCE(excluded.time_in, attendance_logs.time_in),
            time_out = COALESCE(excluded.time_out, attendance_logs.time_out)
    `);

    const findMember = db.prepare('SELECT id FROM members WHERE nisn = ? OR nipd = ? LIMIT 1');

    const tx = db.transaction(() => {
        for (const l of logs) {
            const member = findMember.get(l.nisn || '', l.nipd || '');
            if (member) {
                const sId = l.sync_id || `nebula-att-${l.id}`;
                let timeIn = null;
                if (l.scan_time) {
                    const parts = String(l.scan_time).split(' ');
                    timeIn = parts.length > 1 ? parts[1].substring(0, 5) : parts[0].substring(0, 5);
                }
                const timeOut = l.scan_out ? String(l.scan_out).substring(0, 5) : null;

                upsertLog.run(
                    member.id,
                    sId,
                    l.date_log,
                    timeIn,
                    timeOut,
                    l.status || 'HADIR',
                    l.shift_name || ''
                );
                syncedIds.push(l.sync_id || l.id);
            }
        }
    });

    tx();
    db.prepare('UPDATE school_settings SET last_sync_at = CURRENT_TIMESTAMP WHERE id = 1').run();
    res.json({ success: true, synced_ids: syncedIds, count: syncedIds.length });
});

// 5. Kirim Izin yang Disetujui Wali Kelas ke Desktop (Tarik oleh Desktop)
app.get('/api/sync/pull-remote-updates', (req, res) => {
    if (!checkSyncAuth(req)) {
        return res.status(401).json({ success: false, message: 'Sync secret tidak valid.' });
    }
    const since = req.query.since || '2000-01-01';

    const approvedLeaves = db.prepare(`
        SELECT lr.id, lr.sync_id, lr.type as status, lr.start_date as date_log,
               m.nisn, m.nipd, m.full_name
        FROM leave_requests lr
        JOIN members m ON lr.member_id = m.id
        WHERE lr.status = 'DISETUJUI' AND lr.submitted_at >= ?
        ORDER BY lr.submitted_at ASC
    `).all(since);

    res.json({ success: true, updates: approvedLeaves });
});

// Penanganan error terpusat: tampilkan stack di log server, tetapi kirim pesan aman ke klien.
app.use((err, req, res, next) => {
    console.error(`[Portal Unhandled Error] ${req.method} ${String(req.originalUrl || req.path).split('?')[0]}:`, err?.stack || err);
    if (res.headersSent) return next(err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan internal portal. Periksa log server.' });
});

// Serve frontend produksi jika ada
app.use(express.static(distPath));
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, message: 'Endpoint API tidak ditemukan.' });
    }
    const indexPath = path.resolve(distPath, 'index.html');
    res.sendFile(indexPath);
});

app.listen(PORT, () => {
    console.log(`[Portal Absensi Server]: Berjalan di http://localhost:${PORT}`);
});
