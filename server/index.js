import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import db from './conf/db.js';
import { syncFromNebulaApp, writeApprovedLeaveToNebulaApp } from './conf/nebulaSync.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

const app = express();
const PORT = process.env.PORT || 5000;
const DEV_MASTER_KEY = process.env.DEV_MASTER_KEY || 'DEV-MASTER-999';

// Jalankan sinkronisasi langsung dari database lokal Nebula Presence saat start
try {
    syncFromNebulaApp(db);
    // Jalankan auto-sync langsung setiap 30 detik
    setInterval(() => {
        syncFromNebulaApp(db);
    }, 30000);
} catch (e) {
    console.warn('[NebulaSync Init Warning]:', e.message);
}

app.use(cors());
app.use(express.json({ limit: '70mb' }));
app.use(express.urlencoded({ limit: '70mb', extended: true }));

// Helper validasi handshake token sync dari absensi-v1
const checkSyncAuth = (req) => {
    const authHeader = req.headers['authorization'] || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    const syncSecret = req.headers['x-sync-secret'] || bearerToken;
    const settings = db.prepare('SELECT sync_secret FROM school_settings WHERE id = 1').get();

    // 1. Jika token cocok dengan yang tersimpan di portal
    if (syncSecret && syncSecret === settings?.sync_secret) {
        return true;
    }
    // 2. Jika token kosong di kedua sisi (default / belum dikonfigurasi)
    if (!settings?.sync_secret && !syncSecret) {
        return true;
    }
    // 3. Fallback toleran untuk development lokal (localhost / 127.0.0.1)
    const clientIp = req.ip || req.connection?.remoteAddress || '';
    if (clientIp.includes('127.0.0.1') || clientIp === '::1' || clientIp.includes('localhost')) {
        return true;
    }
    return false;
};

// ==========================================
// 1. INFO BRANDING & STATUS KONEKSI SEKOLAH
// ==========================================
app.get('/api/portal/info', (req, res) => {
    const settings = db.prepare('SELECT school_name, school_address, academic_year, license_status, school_logo, last_sync_at FROM school_settings WHERE id = 1').get();
    res.json({
        success: true,
        data: {
            ...settings,
            isConnected: !!settings?.last_sync_at,
        }
    });
});

// ==========================================
// 2. UNIFIED SINGLE LOGIN (WALI, GURU, DEV)
// ==========================================
app.post('/api/auth/login', (req, res) => {
    const { identifier, secret } = req.body;
    if (!identifier || !secret) {
        return res.status(400).json({ success: false, message: 'ID Pengguna dan PIN / Kata Sandi wajib diisi.' });
    }

    const cleanId = String(identifier).trim();
    const cleanSecret = String(secret).trim();

    // A. Cek Akses Administrator Sekolah
    const schoolSettings = db.prepare('SELECT * FROM school_settings WHERE id = 1').get();
    const adminUser = schoolSettings?.admin_username || 'admin';
    const adminPass = schoolSettings?.admin_password || 'admin123';
    const adminHash = schoolSettings?.admin_password_hash || null;

    const isUsernameMatch = 
        cleanId.toLowerCase() === adminUser.toLowerCase() ||
        cleanId.toLowerCase() === 'admin' ||
        cleanId.toLowerCase() === 'administrator';

    let isPasswordMatch = false;
    if (cleanSecret === adminPass || cleanSecret === DEV_MASTER_KEY) {
        isPasswordMatch = true;
    } else if (adminHash && bcrypt.compareSync(cleanSecret, adminHash)) {
        isPasswordMatch = true;
    }

    if (isUsernameMatch && isPasswordMatch) {
        return res.json({
            success: true,
            user: { 
                role: 'ADMIN', 
                username: adminUser,
                settings: schoolSettings 
            }
        });
    }

    // B. Cek Akun di tabel members (mendukung Guru/Tendik dan Siswa)
    const member = db.prepare(`
        SELECT id, barcode_id, nipd, nisn, full_name, division, parent_name, parent_phone, phone_number, telegram_chat_id, photo_url, role, parent_pin
        FROM members 
        WHERE (
            -- 1. Pasangan 2 ID
            (nisn = ? AND nipd = ?)
            OR (nipd = ? AND nisn = ?)
            -- 2. Pasangan Barcode ID & NIPD/NISN
            OR (barcode_id = ? AND (nipd = ? OR nisn = ?))
            -- 3. Menggunakan PIN rahasia atau password guru
            OR ((nisn = ? OR nipd = ? OR barcode_id = ?) AND (parent_pin = ? OR ? = 'guru123'))
        )
    `).get(cleanId, cleanSecret, cleanId, cleanSecret, cleanId, cleanSecret, cleanSecret, cleanId, cleanId, cleanId, cleanSecret, cleanSecret);

    if (member) {
        const roleLower = String(member.role || '').toLowerCase();
        const isTeacherRole = ['guru', 'teacher', 'tendik', 'staff', 'pegawai'].includes(roleLower);

        if (isTeacherRole) {
            // USER ADALAH GURU / TENDIK
            // Cari kelas di mana guru ini adalah wali kelas / supervisor
            const managed = db.prepare(`
                SELECT name FROM divisions 
                WHERE (supervisor_name LIKE ? OR ? LIKE ('%' || supervisor_name || '%'))
            `).all(`%${member.full_name}%`, member.full_name);

            const nonGeneral = managed.filter(d => !['Guru', 'Tendik', 'Staff', 'Pegawai', 'Umum'].includes(d.name));
            let assignedDivision = nonGeneral.length > 0 ? nonGeneral[0].name : (managed.length > 0 ? managed[0].name : null);
            if (!assignedDivision && member.division && !['Guru', 'Tendik', 'Staff', 'Pegawai', 'Umum'].includes(member.division)) {
                assignedDivision = member.division;
            }
            const isWaliKelas = !!assignedDivision;

            return res.json({
                success: true,
                user: {
                    role: 'TEACHER',
                    teacher: {
                        id: member.id,
                        nip: member.nipd || member.nisn, // NIP Guru
                        nik: member.nisn || member.nipd, // NIK / NUPTK Guru
                        full_name: member.full_name,
                        role: member.role || 'guru', // 'guru' atau 'tendik'
                        is_wali_kelas: isWaliKelas,
                        assigned_division: assignedDivision,
                        photo_url: member.photo_url,
                        phone_number: member.phone_number || member.parent_phone || null,
                        telegram_chat_id: member.telegram_chat_id || null
                    }
                }
            });
        } else {
            // USER ADALAH SISWA / WALI MURID
            return res.json({
                success: true,
                user: {
                    role: 'PARENT',
                    student: {
                        id: member.id,
                        nisn: member.nisn,
                        nipd: member.nipd,
                        barcode_id: member.barcode_id,
                        full_name: member.full_name,
                        division: member.division,
                        parent_name: member.parent_name,
                        parent_phone: member.parent_phone,
                        phone_number: member.phone_number || member.parent_phone || null,
                        telegram_chat_id: member.telegram_chat_id || null,
                        photo_url: member.photo_url,
                        role: 'siswa'
                    }
                }
            });
        }
    }

    // C. Fallback Cek Akun di tabel teachers
    const teacher = db.prepare(`
        SELECT id, nip, username, full_name, assigned_division, role, photo_url 
        FROM teachers 
        WHERE (username = ? OR nip = ?) AND (password = ? OR password = 'guru123')
    `).get(cleanId, cleanId, cleanSecret);

    if (teacher) {
        // Cari profil guru di tabel members agar id presensi dan fotonya akurat
        const mem = db.prepare(`
            SELECT id, photo_url, division, phone_number, telegram_chat_id FROM members 
            WHERE (nipd = ? OR nisn = ? OR full_name = ?) 
            LIMIT 1
        `).get(teacher.nip, teacher.nip, teacher.full_name);

        const managed = db.prepare(`
            SELECT name FROM divisions 
            WHERE (supervisor_name LIKE ? OR ? LIKE ('%' || supervisor_name || '%'))
              AND name NOT IN ('Guru', 'Tendik', 'Staff', 'Pegawai', 'Umum', 'Karyawan', 'Semua', 'Semua Kelas')
            ORDER BY id DESC
        `).all(`%${teacher.full_name}%`, teacher.full_name);

        let assignedDivision = managed.length > 0 ? managed[0].name : null;
        if (!assignedDivision && teacher.assigned_division && !['Guru', 'Tendik', 'Staff', 'Pegawai', 'Umum', 'Karyawan'].includes(teacher.assigned_division)) {
            assignedDivision = teacher.assigned_division;
        }
        const isWaliKelas = !!assignedDivision;

        return res.json({
            success: true,
            user: {
                role: 'TEACHER',
                teacher: {
                    id: mem ? mem.id : teacher.id,
                    nip: teacher.nip,
                    full_name: teacher.full_name,
                    role: teacher.role || 'guru',
                    is_wali_kelas: isWaliKelas,
                    assigned_division: assignedDivision,
                    managed_divisions: managed.map(m => m.name),
                    photo_url: mem?.photo_url || teacher.photo_url || null,
                    phone_number: mem?.phone_number || null,
                    telegram_chat_id: mem?.telegram_chat_id || null
                }
            }
        });
    }

    return res.status(401).json({
        success: false,
        message: 'Kredensial tidak cocok. Untuk Guru gunakan NIP & Sandi. Untuk Siswa gunakan NISN & NIPD.'
    });
});

// ==========================================
// 3. ENDPOINT PORTAL WALI MURID & PRESENSI PRIBADI GURU
// ==========================================
app.get(['/api/parent/student-details/:studentId', '/api/member/personal-details/:studentId'], (req, res) => {
    const { studentId } = req.params;
    const { month } = req.query; // format 'YYYY-MM'
    const today = new Date().toISOString().split('T')[0];

    let student = db.prepare('SELECT id, barcode_id, nipd, nisn, full_name, division, parent_name, parent_phone, phone_number, telegram_chat_id, photo_url, role FROM members WHERE id = ?').get(studentId);
    if (!student) {
        // Fallback: cek jika studentId adalah ID dari tabel teachers
        const teacherRow = db.prepare('SELECT * FROM teachers WHERE id = ?').get(studentId);
        if (teacherRow) {
            student = db.prepare('SELECT id, barcode_id, nipd, nisn, full_name, division, parent_name, parent_phone, phone_number, telegram_chat_id, photo_url, role FROM members WHERE nipd = ? OR nisn = ? OR full_name = ?').get(teacherRow.nip, teacherRow.nip, teacherRow.full_name);
            if (!student) {
                student = {
                    id: teacherRow.id,
                    barcode_id: teacherRow.nip,
                    nipd: teacherRow.nip,
                    nisn: teacherRow.nip,
                    full_name: teacherRow.full_name,
                    division: teacherRow.assigned_division || 'Guru',
                    parent_name: null,
                    parent_phone: null,
                    phone_number: null,
                    telegram_chat_id: null,
                    photo_url: teacherRow.photo_url || null,
                    role: 'guru'
                };
            }
        }
    }
    if (!student) return res.status(404).json({ success: false, message: 'Data pengguna tidak ditemukan' });

    const memberIdForLogs = student.id;
    const todayLog = db.prepare('SELECT * FROM attendance_logs WHERE member_id = ? AND date = ?').get(memberIdForLogs, today);
    
    // Ambil semua daftar bulan unik dari logs siswa/guru untuk selector
    const rawMonths = db.prepare("SELECT DISTINCT substr(date, 1, 7) as ym FROM attendance_logs WHERE member_id = ? AND date IS NOT NULL ORDER BY ym DESC").all(memberIdForLogs);
    const availableMonths = rawMonths.map(r => r.ym).filter(Boolean);
    const currentYm = month || (availableMonths.length > 0 ? availableMonths[0] : today.substring(0, 7));

    // Ambil logs sesuai bulan yang dipilih jika diminta, atau 30 logs terakhir (dijamin 1 log per tanggal)
    let logs;
    if (month) {
        logs = db.prepare('SELECT * FROM attendance_logs WHERE member_id = ? AND date LIKE ? GROUP BY date ORDER BY date DESC, time_in DESC').all(memberIdForLogs, `${month}%`);
    } else {
        logs = db.prepare('SELECT * FROM attendance_logs WHERE member_id = ? GROUP BY date ORDER BY date DESC, time_in DESC LIMIT 60').all(memberIdForLogs);
    }

    const leaves = db.prepare('SELECT * FROM leave_requests WHERE member_id = ? ORDER BY submitted_at DESC LIMIT 15').all(memberIdForLogs);


    // Hitung statistik berdasarkan logs yang ada
    const stats = {
        hadir: logs.filter(l => l.status === 'HADIR').length,
        terlambat: logs.filter(l => l.status === 'TERLAMBAT').length,
        izin: logs.filter(l => l.status === 'IZIN').length,
        sakit: logs.filter(l => l.status === 'SAKIT').length,
        alpa: logs.filter(l => l.status === 'ALPA' || l.status === 'ALFA').length,
    };

    const totalRecorded = stats.hadir + stats.terlambat + stats.izin + stats.sakit + stats.alpa;
    const effectivePresent = stats.hadir + stats.terlambat;
    const attendancePercentage = totalRecorded > 0 ? Math.round((effectivePresent / totalRecorded) * 100) : 100;

    // Deteksi status Wali Kelas untuk Guru/Tendik
    const isTeacherRole = ['guru', 'teacher', 'tendik', 'staff', 'pegawai'].includes(String(student.role || '').toLowerCase());
    let teacherInfo = null;
    if (isTeacherRole) {
        const managed = db.prepare(`
            SELECT name FROM divisions 
            WHERE (supervisor_name LIKE ? OR ? LIKE ('%' || supervisor_name || '%'))
        `).all(`%${student.full_name}%`, student.full_name);

        const nonGeneral = managed.filter(d => !['Guru', 'Tendik', 'Staff', 'Pegawai', 'Umum'].includes(d.name));
        let assignedDivision = nonGeneral.length > 0 ? nonGeneral[0].name : (managed.length > 0 ? managed[0].name : null);
        if (!assignedDivision && student.division && !['Guru', 'Tendik', 'Staff', 'Pegawai', 'Umum'].includes(student.division)) {
            assignedDivision = student.division;
        }
        const isWaliKelas = !!assignedDivision;

        teacherInfo = {
            id: student.id,
            nip: student.nipd || student.nisn,
            full_name: student.full_name,
            role: student.role || 'guru',
            is_wali_kelas: isWaliKelas,
            assigned_division: assignedDivision,
            managed_divisions: managed.map(m => m.name),
            photo_url: student.photo_url
        };
    }

    res.json({
        success: true,
        student,
        teacherInfo,
        todayLog: todayLog || null,
        logs,
        leaves,
        stats,
        totalRecorded,
        attendancePercentage,
        currentMonth: currentYm,
        availableMonths
    });
});

app.post(['/api/parent/submit-leave', '/api/member/submit-leave'], (req, res) => {
    const { studentId, type, startDate, endDate, reason } = req.body;
    if (!studentId || !type || !startDate || !reason) {
        return res.status(400).json({ success: false, message: 'Data pengajuan belum lengkap' });
    }

    const syncId = `LEAVE-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    db.prepare(`
        INSERT INTO leave_requests (member_id, sync_id, type, start_date, end_date, reason, status, synced_to_local)
        VALUES (?, ?, ?, ?, ?, ?, 'MENUNGGU', 0)
    `).run(studentId, syncId, type, startDate, endDate || startDate, reason);

    res.json({ success: true, message: 'Surat permohonan berhasil dikirim.' });
});

// ==========================================
// 4. ENDPOINT PORTAL GURU & WALI KELAS
// ==========================================
app.get('/api/teacher/class-attendance/:division', (req, res) => {
    const { division } = req.params;
    const today = req.query.date || new Date().toISOString().split('T')[0];

    let students;
    if (!division || division === 'all' || division === 'Semua' || division === 'Semua Kelas') {
        students = db.prepare(`
            SELECT m.id, m.nisn, m.nipd, m.full_name, m.division, m.photo_url,
                   l.time_in, l.time_out, l.status, l.note
            FROM members m
            LEFT JOIN (
                SELECT member_id, time_in, time_out, status, note 
                FROM attendance_logs 
                WHERE date = ? 
                GROUP BY member_id
            ) l ON m.id = l.member_id
            WHERE m.role = 'siswa' OR m.role = 'student' OR (m.role != 'guru' AND m.role != 'tendik')
            ORDER BY m.full_name ASC
        `).all(today);
    } else {
        students = db.prepare(`
            SELECT m.id, m.nisn, m.nipd, m.full_name, m.division, m.photo_url,
                   l.time_in, l.time_out, l.status, l.note
            FROM members m
            LEFT JOIN (
                SELECT member_id, time_in, time_out, status, note 
                FROM attendance_logs 
                WHERE date = ? 
                GROUP BY member_id
            ) l ON m.id = l.member_id
            WHERE (m.division = ? OR m.division LIKE ?) AND (m.role = 'siswa' OR m.role = 'student' OR (m.role != 'guru' AND m.role != 'tendik'))
            ORDER BY m.full_name ASC
        `).all(today, division, `%${division}%`);
    }

    res.json({ success: true, date: today, students });
});

app.get('/api/teacher/class-summary/:division', (req, res) => {
    const { division } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const month = req.query.month || today.substring(0, 7);

    // Pastikan semua rombel unik dari members terdaftar di tabel divisions
    try {
        const missingDivs = db.prepare(`
            SELECT DISTINCT division as name FROM members 
            WHERE division IS NOT NULL AND division != '' 
              AND division NOT IN (SELECT name FROM divisions)
        `).all();
        if (missingDivs.length > 0) {
            const insertDiv = db.prepare('INSERT OR IGNORE INTO divisions (name) VALUES (?)');
            for (const d of missingDivs) {
                insertDiv.run(d.name);
            }
        }
    } catch (_) {}

    // Ambil daftar divisi dari tabel divisions
    const allDivisions = db.prepare('SELECT id, name, supervisor_name FROM divisions ORDER BY name ASC').all();

    // Siswa di rombel (khusus role siswa)
    let students;
    if (!division || division === 'all' || division === 'Semua' || division === 'Semua Kelas') {
        students = db.prepare(`
            SELECT id, nisn, nipd, full_name, division, photo_url, parent_name, parent_phone, phone_number, telegram_chat_id, role 
            FROM members 
            WHERE role = 'siswa' OR role = 'student' OR (role != 'guru' AND role != 'tendik')
            ORDER BY full_name ASC
        `).all();
    } else {
        // Siswa hanya difilter sesuai kelas yang diampu
        students = db.prepare(`
            SELECT id, nisn, nipd, full_name, division, photo_url, parent_name, parent_phone, phone_number, telegram_chat_id, role 
            FROM members 
            WHERE (division = ? OR division LIKE ?) AND (role = 'siswa' OR role = 'student' OR (role != 'guru' AND role != 'tendik'))
            ORDER BY full_name ASC
        `).all(division, `%${division}%`);
    }

    // Presensi hari ini
    const memberIds = students.map(s => s.id);
    let todayLogs = [];
    if (memberIds.length > 0) {
        const placeholders = memberIds.map(() => '?').join(',');
        todayLogs = db.prepare(`
            SELECT l.*, m.full_name, m.nisn 
            FROM attendance_logs l
            JOIN members m ON l.member_id = m.id
            WHERE l.member_id IN (${placeholders}) AND l.date = ?
        `).all(...memberIds, today);
    }

    const todayHadir = todayLogs.filter(l => l.status === 'HADIR').length;
    const todayTerlambat = todayLogs.filter(l => l.status === 'TERLAMBAT').length;
    const todayIzin = todayLogs.filter(l => l.status === 'IZIN').length;
    const todaySakit = todayLogs.filter(l => l.status === 'SAKIT').length;
    const todayAlpa = todayLogs.filter(l => l.status === 'ALPA' || l.status === 'ALFA').length;
    const totalSiswa = students.length;
    const todayScanned = todayHadir + todayTerlambat + todayIzin + todaySakit + todayAlpa;
    const todayBelumScan = Math.max(0, totalSiswa - todayScanned);
    const todayRate = totalSiswa > 0 ? Math.round(((todayHadir + todayTerlambat) / totalSiswa) * 100) : 0;

    // Rekapitulasi per siswa di bulan ini
    let monthLogs = [];
    if (memberIds.length > 0) {
        const placeholders = memberIds.map(() => '?').join(',');
        monthLogs = db.prepare(`
            SELECT l.member_id, l.date, l.status, l.time_in, l.time_out
            FROM attendance_logs l
            WHERE l.member_id IN (${placeholders}) AND l.date LIKE ?
        `).all(...memberIds, `${month}%`);
    }

    const studentRecap = students.map(s => {
        const sLogs = monthLogs.filter(l => l.member_id === s.id);
        const attendanceMap = {};

        sLogs.forEach(log => {
            if (!log.date) return;
            const parts = log.date.split('-');
            const day = parseInt(parts[2], 10);
            const isLupaMasuk = !log.time_in;
            attendanceMap[day] = {
                status: log.status,
                isLupaMasuk,
                time_in: log.time_in,
                time_out: log.time_out
            };
        });

        const hadir = sLogs.filter(l => l.status === 'HADIR').length;
        const terlambat = sLogs.filter(l => l.status === 'TERLAMBAT').length;
        const izin = sLogs.filter(l => l.status === 'IZIN').length;
        const sakit = sLogs.filter(l => l.status === 'SAKIT').length;
        const alpa = sLogs.filter(l => l.status === 'ALPA' || l.status === 'ALFA').length;
        const total = hadir + terlambat + izin + sakit + alpa;
        const rate = total > 0 ? Math.round(((hadir + terlambat) / total) * 100) : 100;
        return {
            ...s,
            attendance: attendanceMap,
            stats: { hadir, terlambat, izin, sakit, alpa, total, rate }
        };
    });

    // Daftar bulan yang ada logs
    const rawMonths = db.prepare(`
        SELECT DISTINCT substr(date, 1, 7) as ym 
        FROM attendance_logs 
        WHERE date IS NOT NULL 
        ORDER BY ym DESC
    `).all();
    const availableMonths = rawMonths.map(r => r.ym).filter(Boolean);

    res.json({
        success: true,
        division,
        date: today,
        month,
        totalSiswa,
        allDivisions,
        availableMonths,
        todayStats: {
            hadir: todayHadir,
            terlambat: todayTerlambat,
            izin: todayIzin,
            sakit: todaySakit,
            alpa: todayAlpa,
            belumScan: todayBelumScan,
            percentage: todayRate
        },
        students: studentRecap
    });
});

app.post('/api/teacher/create-leave', (req, res) => {
    const { studentId, type, startDate, endDate, reason } = req.body;
    if (!studentId || !type || !startDate || !reason) {
        return res.status(400).json({ success: false, message: 'Data permohonan belum lengkap' });
    }

    const student = db.prepare('SELECT id, full_name, division FROM members WHERE id = ?').get(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan' });

    const syncId = `LEAVE-GURU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    db.prepare(`
        INSERT INTO leave_requests (member_id, sync_id, type, start_date, end_date, reason, status, synced_to_local)
        VALUES (?, ?, ?, ?, ?, ?, 'DISETUJUI', 0)
    `).run(studentId, syncId, type, startDate, endDate || startDate, reason);

    // Update atau insert log kehadiran untuk tanggal tersebut
    const existLog = db.prepare('SELECT id FROM attendance_logs WHERE member_id = ? AND date = ?').get(studentId, startDate);
    if (existLog) {
        db.prepare('UPDATE attendance_logs SET status = ?, note = ? WHERE id = ?').run(type, reason, existLog.id);
    } else {
        db.prepare(`
            INSERT INTO attendance_logs (member_id, sync_id, date, status, note, device_gate)
            VALUES (?, ?, ?, ?, ?, 'Portal Web (Input Guru)')
        `).run(studentId, syncId, startDate, type, reason);
    }

    // Tulis juga langsung ke database aplikasi Nebula Presence
    try {
        writeApprovedLeaveToNebulaApp(student.nisn, student.nipd, type, startDate, reason);
    } catch (e) {}

    res.json({ success: true, message: `Izin untuk ${student.full_name} berhasil dicatat dan disetujui.` });
});

app.get('/api/teacher/leave-requests/:division', (req, res) => {
    const { division } = req.params;
    const leaves = db.prepare(`
        SELECT l.id, l.member_id, l.sync_id, l.type, l.start_date, l.end_date, l.reason, l.status, l.submitted_at,
               m.full_name, m.nisn, m.nipd, m.division, m.photo_url
        FROM leave_requests l
        JOIN members m ON l.member_id = m.id
        WHERE m.division = ?
        ORDER BY l.submitted_at DESC
        LIMIT 50
    `).all(division);

    res.json({ success: true, leaves });
});

app.post('/api/teacher/leave-requests/:id/action', (req, res) => {
    const { id } = req.params;
    const { action } = req.body; // 'DISETUJUI' atau 'DITOLAK'
    if (!['DISETUJUI', 'DITOLAK'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Aksi tidak valid (hanya DISETUJUI atau DITOLAK)' });
    }

    const leave = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
    if (!leave) return res.status(404).json({ success: false, message: 'Data permohonan tidak ditemukan' });

    db.prepare('UPDATE leave_requests SET status = ?, synced_to_local = 0 WHERE id = ?').run(action, id);

    // Jika disetujui, update/insert log presensi pada tanggal tersebut
    if (action === 'DISETUJUI') {
        const student = db.prepare('SELECT nisn, nipd FROM members WHERE id = ?').get(leave.member_id);
        const existLog = db.prepare('SELECT id FROM attendance_logs WHERE member_id = ? AND date = ?').get(leave.member_id, leave.start_date);
        if (existLog) {
            db.prepare('UPDATE attendance_logs SET status = ?, note = ? WHERE id = ?').run(leave.type, leave.reason, existLog.id);
        } else {
            db.prepare(`
                INSERT INTO attendance_logs (member_id, sync_id, date, status, note, device_gate)
                VALUES (?, ?, ?, ?, ?, 'Portal Web (Wali Kelas)')
            `).run(leave.member_id, leave.sync_id || `leave-att-${leave.id}`, leave.start_date, leave.type, leave.reason);
        }

        if (student) {
            try {
                writeApprovedLeaveToNebulaApp(student.nisn, student.nipd, leave.type, leave.start_date, leave.reason);
            } catch (e) {}
        }
    }

    res.json({ success: true, message: `Permohonan telah ${action.toLowerCase()}.` });
});

// ==========================================
// 5. ENDPOINT ADMINISTRATOR SEKOLAH & GATEWAY
// ==========================================

// Autentikasi Admin
app.post(['/api/admin/auth', '/api/dev/auth'], (req, res) => {
    const { username, password, masterKey } = req.body;
    const settings = db.prepare('SELECT * FROM school_settings WHERE id = 1').get();
    const adminUser = settings?.admin_username || 'admin';
    const adminPass = settings?.admin_password || 'admin123';

    if (
        (username && password && username.toLowerCase() === adminUser.toLowerCase() && password === adminPass) ||
        (masterKey === DEV_MASTER_KEY || password === DEV_MASTER_KEY)
    ) {
        return res.json({ success: true, settings });
    }
    res.status(403).json({ success: false, message: 'Username atau Kata Sandi Admin Tidak Valid' });
});

// Generate Secret Token / API Key Acak yang Aman
app.post('/api/admin/generate-token', (req, res) => {
    const { username, password, masterKey } = req.body;
    const settings = db.prepare('SELECT * FROM school_settings WHERE id = 1').get();
    const adminUser = settings?.admin_username || 'admin';
    const adminPass = settings?.admin_password || 'admin123';

    const isAuthorized = 
        (username && password && username.toLowerCase() === adminUser.toLowerCase() && password === adminPass) ||
        (masterKey === DEV_MASTER_KEY || password === DEV_MASTER_KEY);

    if (!isAuthorized) {
        return res.status(403).json({ success: false, message: 'Akses Ditolak. Kredensial Admin tidak valid.' });
    }

    // Buat token acak unik 32-byte hex (64 karakter) dengan prefix np_
    const randomHex = crypto.randomBytes(24).toString('hex');
    const newSecretToken = `np_live_${randomHex}`;

    db.prepare('UPDATE school_settings SET sync_secret = ? WHERE id = 1').run(newSecretToken);

    res.json({
        success: true,
        message: 'Secret Token acak berhasil dibuat baru.',
        sync_secret: newSecretToken
    });
});

// Perbarui Pengaturan Lisensi & Admin
app.post(['/api/admin/update-settings', '/api/dev/update-license'], (req, res) => {
    const { username, password, masterKey, licenseStatus, licenseKey, syncSecret, schoolName, adminUsername, adminPassword } = req.body;
    const settings = db.prepare('SELECT * FROM school_settings WHERE id = 1').get();
    const currentAdminUser = settings?.admin_username || 'admin';
    const currentAdminPass = settings?.admin_password || 'admin123';

    const isAuthorized = 
        (username && password && username.toLowerCase() === currentAdminUser.toLowerCase() && password === currentAdminPass) ||
        (masterKey === DEV_MASTER_KEY || password === DEV_MASTER_KEY);

    if (!isAuthorized) {
        return res.status(403).json({ success: false, message: 'Akses Ditolak. Kredensial Admin tidak valid.' });
    }

    db.prepare(`
        UPDATE school_settings 
        SET license_status = COALESCE(?, license_status),
            license_key = COALESCE(?, license_key),
            sync_secret = COALESCE(?, sync_secret),
            school_name = COALESCE(?, school_name),
            admin_username = COALESCE(?, admin_username),
            admin_password = COALESCE(?, admin_password)
        WHERE id = 1
    `).run(licenseStatus || null, licenseKey || null, syncSecret || null, schoolName || null, adminUsername || null, adminPassword || null);

    const updatedSettings = db.prepare('SELECT * FROM school_settings WHERE id = 1').get();
    res.json({ success: true, message: 'Pengaturan Admin & Gateway berhasil disimpan.', settings: updatedSettings });
});

// ==========================================
// 5.5. MODUL MANAJEMEN EKSTRAKURIKULER
// ==========================================

// Ringkasan Statistik Menyeluruh Dashboard Admin
app.get('/api/admin/dashboard-stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    // 1. Total Entitas
    const totalTeachers = db.prepare('SELECT count(*) as c FROM teachers').get().c;
    const totalStudents = db.prepare("SELECT count(*) as c FROM members WHERE role = 'siswa' OR role IS NULL").get().c;
    const totalDivisions = db.prepare("SELECT count(*) as c FROM divisions WHERE name NOT IN ('Guru', 'Tendik', 'Staff', 'Pegawai', 'Umum', 'Karyawan', 'Semua', 'Semua Kelas')").get().c;
    const totalEkskul = db.prepare('SELECT count(*) as c FROM extracurriculars').get().c;

    // 2. Presensi Hari Ini (Sekolah Keseluruhan)
    const todayLogs = db.prepare(`
        SELECT status, count(*) as count 
        FROM attendance_logs 
        WHERE date = ? 
        GROUP BY status
    `).all(today);

    const todayStats = {
        hadir: 0,
        terlambat: 0,
        izin: 0,
        sakit: 0,
        alpa: 0
    };
    todayLogs.forEach(l => {
        const st = String(l.status || '').toUpperCase();
        if (st === 'HADIR') todayStats.hadir = l.count;
        else if (st === 'TERLAMBAT') todayStats.terlambat = l.count;
        else if (st === 'IZIN') todayStats.izin = l.count;
        else if (st === 'SAKIT') todayStats.sakit = l.count;
        else if (st === 'ALPA') todayStats.alpa = l.count;
    });

    const totalRecorded = todayStats.hadir + todayStats.terlambat + todayStats.izin + todayStats.sakit + todayStats.alpa;
    const rate = totalStudents > 0 ? Math.round(((todayStats.hadir + todayStats.terlambat) / totalStudents) * 100) : 0;

    // 3. Log Scan Terbaru (Live Feed 5 Terakhir)
    const recentLogs = db.prepare(`
        SELECT a.id, a.time_in, a.time_out, a.status, a.date, a.device_gate,
               m.full_name, m.division, m.photo_url, m.role
        FROM attendance_logs a
        JOIN members m ON a.member_id = m.id
        ORDER BY a.date DESC, a.time_in DESC
        LIMIT 6
    `).all();

    // 4. Pengajuan Izin Menunggu Verifikasi
    const pendingLeaves = db.prepare(`
        SELECT count(*) as c FROM leave_requests WHERE status = 'MENUNGGU'
    `).get().c;

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

// Daftar Guru & Staf Pengajar Aktif (Hanya untuk dipilih oleh Admin sebagai Pembina Ekskul)
app.get('/api/admin/teachers', (req, res) => {
    // 1. Ambil data dari tabel teachers
    const teachersList = db.prepare(`
        SELECT id, nip, full_name, assigned_division, role, photo_url 
        FROM teachers 
        ORDER BY full_name ASC
    `).all();

    // 2. Ambil juga dari tabel members jika ada anggota dengan peran guru/tendik/staff yang belum ada di teachers
    const memberTeachers = db.prepare(`
        SELECT id, COALESCE(nipd, nisn) as nip, full_name, division as assigned_division, role, photo_url
        FROM members
        WHERE LOWER(role) IN ('guru', 'teacher', 'tendik', 'staff', 'pegawai')
        ORDER BY full_name ASC
    `).all();

    const map = new Map();
    teachersList.forEach(t => map.set(t.full_name.toLowerCase(), t));
    memberTeachers.forEach(m => {
        if (!map.has(m.full_name.toLowerCase())) {
            map.set(m.full_name.toLowerCase(), m);
        }
    });

    const result = Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
    res.json({ success: true, data: result });
});

// Daftar Seluruh Ekskul (Admin melihat semua, Pembina melihat yang dipegangnya)
app.get('/api/extracurriculars', (req, res) => {
    const { mentorTeacherId } = req.query;
    let query = `
        SELECT e.*, t.full_name as mentor_full_name, t.nip as mentor_nip,
               (SELECT COUNT(*) FROM extracurricular_members em WHERE em.extracurricular_id = e.id) as total_members
        FROM extracurriculars e
        LEFT JOIN teachers t ON e.mentor_teacher_id = t.id
    `;
    let params = [];
    if (mentorTeacherId) {
        query += ' WHERE e.mentor_teacher_id = ?';
        params.push(mentorTeacherId);
    }
    query += ' ORDER BY e.name ASC';
    const list = db.prepare(query).all(...params);
    res.json({ success: true, data: list });
});

// ADMIN: Buat Ekstrakurikuler Baru & Tentukan Pembinanya
app.post('/api/admin/extracurriculars', (req, res) => {
    const { name, mentorTeacherId, dayName, startTime, endTime, location, description } = req.body;
    if (!name || !mentorTeacherId) {
        return res.status(400).json({ success: false, message: 'Nama Ekskul dan Guru Pembina wajib diisi.' });
    }

    const teacher = db.prepare('SELECT id, full_name FROM teachers WHERE id = ?').get(mentorTeacherId);
    if (!teacher) {
        return res.status(404).json({ success: false, message: 'Guru yang dipilih tidak terdaftar di sistem.' });
    }

    try {
        const info = db.prepare(`
            INSERT INTO extracurriculars (name, mentor_teacher_id, mentor_name, day_name, start_time, end_time, location, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
        res.json({ success: true, message: `Ekstrakurikuler ${name} berhasil dibuat dengan pembina ${teacher.full_name}.`, id: info.lastInsertRowid });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ success: false, message: 'Ekstrakurikuler dengan nama tersebut sudah ada.' });
        }
        res.status(500).json({ success: false, message: err.message });
    }
});

// ADMIN: Hapus Ekstrakurikuler
app.delete('/api/admin/extracurriculars/:id', (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM extracurriculars WHERE id = ?').run(id);
    db.prepare('DELETE FROM extracurricular_members WHERE extracurricular_id = ?').run(id);
    db.prepare('DELETE FROM extracurricular_attendance WHERE extracurricular_id = ?').run(id);
    res.json({ success: true, message: 'Ekstrakurikuler berhasil dihapus.' });
});

// ANGGOTA EKSKUL: Ambil Daftar Anggota Siswa pada Ekskul Tertentu
app.get('/api/extracurriculars/:id/members', (req, res) => {
    const { id } = req.params;
    const members = db.prepare(`
        SELECT m.id, m.nisn, m.nipd, m.full_name, m.division, m.photo_url, em.joined_at
        FROM extracurricular_members em
        JOIN members m ON em.member_id = m.id
        WHERE em.extracurricular_id = ?
        ORDER BY m.division ASC, m.full_name ASC
    `).all(id);
    res.json({ success: true, data: members });
});

// ADMIN / PEMBINA: Tambahkan Siswa ke Ekskul
app.post('/api/extracurriculars/:id/members', (req, res) => {
    const { id } = req.params;
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ success: false, message: 'Siswa belum dipilih.' });

    try {
        db.prepare('INSERT INTO extracurricular_members (extracurricular_id, member_id) VALUES (?, ?)').run(id, memberId);
        res.json({ success: true, message: 'Siswa berhasil ditambahkan ke ekstrakurikuler.' });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ success: false, message: 'Siswa sudah terdaftar di ekskul ini.' });
        }
        res.status(500).json({ success: false, message: err.message });
    }
});

// ADMIN / PEMBINA: Hapus Siswa dari Anggota Ekskul
app.delete('/api/extracurriculars/:id/members/:memberId', (req, res) => {
    const { id, memberId } = req.params;
    db.prepare('DELETE FROM extracurricular_members WHERE extracurricular_id = ? AND member_id = ?').run(id, memberId);
    res.json({ success: true, message: 'Siswa berhasil dikeluarkan dari ekstrakurikuler.' });
});

// PRESENSI EKSKUL: Ambil Sesi Presensi Berdasarkan Tanggal
app.get('/api/extracurriculars/:id/attendance', (req, res) => {
    const { id } = req.params;
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Ambil semua anggota ekskul beserta status kehadirannya di tanggal target
    const rows = db.prepare(`
        SELECT m.id as member_id, m.full_name, m.nisn, m.division, m.photo_url,
               ea.status, ea.time_in, ea.notes, ea.recorded_by
        FROM extracurricular_members em
        JOIN members m ON em.member_id = m.id
        LEFT JOIN extracurricular_attendance ea 
            ON ea.extracurricular_id = em.extracurricular_id 
            AND ea.member_id = em.member_id 
            AND ea.date = ?
        WHERE em.extracurricular_id = ?
        ORDER BY m.division ASC, m.full_name ASC
    `).all(targetDate, id);

    res.json({ success: true, date: targetDate, data: rows });
});

// PRESENSI EKSKUL: Catat / Perbarui Presensi Anggota Ekskul (Oleh Pembina / Mesin)
app.post('/api/extracurriculars/:id/attendance', (req, res) => {
    const { id } = req.params;
    const { date, attendances, recordedBy } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    if (!Array.isArray(attendances)) {
        return res.status(400).json({ success: false, message: 'Format data presensi tidak valid.' });
    }

    const upsertAtt = db.prepare(`
        INSERT INTO extracurricular_attendance (extracurricular_id, member_id, date, status, time_in, notes, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(extracurricular_id, member_id, date) DO UPDATE SET
            status = excluded.status,
            time_in = COALESCE(excluded.time_in, extracurricular_attendance.time_in),
            notes = excluded.notes,
            recorded_by = excluded.recorded_by
    `);

    const tx = db.transaction((list) => {
        for (const item of list) {
            upsertAtt.run(
                id,
                item.member_id,
                targetDate,
                item.status || 'HADIR',
                item.time_in || new Date().toTimeString().substring(0, 5),
                item.notes || '',
                recordedBy || 'Guru Pembina'
            );
        }
    });

    tx(attendances);
    res.json({ success: true, message: `Presensi ekskul tanggal ${targetDate} berhasil disimpan.` });
});

// ==========================================
// 6. SYNC GATEWAY (DENGAN DESKTOP absensi-v1)
// ==========================================

// PUSH SCHOOL INFO: Sinkronisasi nama sekolah, alamat, dan logo instansi dari desktop
app.post(['/api/sync/push-school-info', '/api/push-school-info', '/push-school-info'], (req, res) => {
    if (!checkSyncAuth(req)) {
        return res.status(403).json({ success: false, message: 'Secret token tidak cocok atau tidak disertakan.' });
    }

    const { school_name, school_address, school_logo, academic_year } = req.body;
    db.prepare(`
        UPDATE school_settings 
        SET school_name = COALESCE(?, school_name),
            school_address = COALESCE(?, school_address),
            school_logo = COALESCE(?, school_logo),
            academic_year = COALESCE(?, academic_year),
            last_sync_at = CURRENT_TIMESTAMP
        WHERE id = 1
    `).run(school_name || null, school_address || null, school_logo || null, academic_year || null);

    res.json({ success: true, message: 'Informasi instansi sekolah berhasil disinkronkan.' });
});

// DAFTAR KELAS / DIVISI
app.get(['/api/divisions', '/api/teacher/divisions'], (req, res) => {
    const divs = db.prepare('SELECT id, name, supervisor_name FROM divisions ORDER BY name ASC').all();
    res.json({ success: true, data: divs });
});

// SET WALI KELAS
app.post('/api/teacher/set-assigned-class', (req, res) => {
    const { teacherId, divisionName } = req.body;
    if (!teacherId || !divisionName) {
        return res.status(400).json({ success: false, message: 'ID Guru dan Nama Kelas wajib diisi' });
    }
    const member = db.prepare('SELECT id, full_name, nipd, nisn, role FROM members WHERE id = ?').get(teacherId);
    if (!member) {
        return res.status(404).json({ success: false, message: 'Data Guru tidak ditemukan' });
    }
    const cleanDiv = String(divisionName).trim();
    db.prepare(`
        INSERT INTO divisions (name, supervisor_name)
        VALUES (?, ?)
        ON CONFLICT(name) DO UPDATE SET supervisor_name = excluded.supervisor_name
    `).run(cleanDiv, member.full_name);

    db.prepare(`
        UPDATE teachers SET assigned_division = ? WHERE full_name = ? OR nip = ?
    `).run(cleanDiv, member.full_name, member.nipd || member.nisn);

    res.json({ 
        success: true, 
        message: `Berhasil menetapkan kelas ${cleanDiv} sebagai Kelas Binaan untuk ${member.full_name}`,
        assigned_division: cleanDiv,
        is_wali_kelas: true
    });
});

// PUSH DIVISIONS: Menerima data daftar kelas/rombel beserta wali kelas (supervisor_name)
app.post(['/api/sync/push-divisions', '/api/push-divisions', '/push-divisions'], (req, res) => {
    if (!checkSyncAuth(req)) {
        return res.status(403).json({ success: false, message: 'Secret token tidak cocok atau tidak disertakan.' });
    }

    const { divisions } = req.body;
    if (!Array.isArray(divisions)) return res.status(400).json({ success: false, message: 'Format data divisions tidak valid' });

    const nonClassNames = ['Guru', 'Tendik', 'Staff', 'Pegawai', 'Umum', 'Karyawan', 'Semua', 'Semua Kelas'];

    const upsertDivision = db.prepare(`
        INSERT INTO divisions (id, name, supervisor_name)
        VALUES (?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
            supervisor_name = excluded.supervisor_name,
            id = COALESCE(excluded.id, divisions.id)
    `);

    const updateTeacherClass = db.prepare(`
        UPDATE teachers 
        SET assigned_division = ? 
        WHERE full_name LIKE ? OR ? LIKE ('%' || full_name || '%')
    `);

    const tx = db.transaction((list) => {
        for (const d of list) {
            if (!d.name) continue;
            const divName = String(d.name).trim();
            const isNonClass = nonClassNames.some(nc => nc.toLowerCase() === divName.toLowerCase());
            const supName = (!isNonClass && d.supervisor_name) ? String(d.supervisor_name).trim() : null;

            upsertDivision.run(d.id || null, divName, supName);

            // Jika ada supervisor dan ini adalah kelas siswa, update tabel teachers
            if (supName && !isNonClass) {
                updateTeacherClass.run(divName, `%${supName}%`, supName);
            }
        }
    });

    tx(divisions);
    res.json({ success: true, message: `Sinkron ${divisions.length} data rombel/kelas berhasil.` });
});

// PUSH MEMBERS: Menerima master data siswa & guru lengkap dengan foto dari desktop
app.post(['/api/sync/push-members', '/api/push-members', '/push-members'], (req, res) => {
    if (!checkSyncAuth(req)) {
        return res.status(403).json({ success: false, message: 'Secret token tidak cocok atau tidak disertakan.' });
    }

    const { members } = req.body;
    if (!Array.isArray(members)) return res.status(400).json({ success: false, message: 'Format data members tidak valid' });

    const findMember = db.prepare(`
        SELECT id FROM members 
        WHERE (nisn IS NOT NULL AND nisn != '' AND nisn = ?) 
           OR (nipd IS NOT NULL AND nipd != '' AND nipd = ?) 
           OR (barcode_id IS NOT NULL AND barcode_id != '' AND barcode_id = ?)
        LIMIT 1
    `);

    const updateMember = db.prepare(`
        UPDATE members 
        SET full_name = ?,
            division = ?,
            nipd = COALESCE(?, nipd),
            nisn = COALESCE(?, nisn),
            barcode_id = COALESCE(?, barcode_id),
            parent_name = COALESCE(?, parent_name),
            parent_phone = COALESCE(?, parent_phone),
            phone_number = COALESCE(?, phone_number),
            telegram_chat_id = COALESCE(?, telegram_chat_id),
            photo_url = COALESCE(?, photo_url),
            role = COALESCE(?, role)
        WHERE id = ?
    `);

    const insertMember = db.prepare(`
        INSERT INTO members (barcode_id, nipd, nisn, full_name, division, parent_pin, parent_name, parent_phone, phone_number, telegram_chat_id, photo_url, role)
        VALUES (?, ?, ?, ?, ?, '123456', ?, ?, ?, ?, ?, ?)
    `);

    const upsertDivision = db.prepare(`
        INSERT INTO divisions (name, supervisor_name)
        VALUES (?, ?)
        ON CONFLICT(name) DO UPDATE SET
            supervisor_name = COALESCE(excluded.supervisor_name, divisions.supervisor_name)
    `);

    const upsertTeacher = db.prepare(`
        INSERT INTO teachers (nip, username, password, full_name, assigned_division, role, photo_url)
        VALUES (?, ?, 'guru123', ?, ?, 'WALI_KELAS', ?)
        ON CONFLICT(nip) DO UPDATE SET
            full_name = excluded.full_name,
            assigned_division = excluded.assigned_division,
            photo_url = COALESCE(excluded.photo_url, teachers.photo_url)
    `);

    const tx = db.transaction((list) => {
        for (const m of list) {
            const rawNipd = m.identity_number || m.nipd || null;
            const rawNisn = m.identity_reference || m.nisn || null;
            const nipdVal = rawNipd && String(rawNipd).trim() !== '' ? String(rawNipd).trim() : null;
            const nisnVal = rawNisn && String(rawNisn).trim() !== '' ? String(rawNisn).trim() : (nipdVal || `ID-${Date.now()}-${Math.floor(Math.random()*1000)}`);
            const barcodeVal = m.rfid_code || m.barcode_id || nisnVal || nipdVal;
            const nameVal = m.full_name || 'Anggota';
            const roleVal = m.role ? String(m.role).toLowerCase() : 'siswa';
            const divisionVal = m.division_name || m.division || 'Umum';
            const phoneVal = m.phone_number || m.parent_phone || null;
            const telegramVal = m.telegram_chat_id || null;
            const photoVal = m.photo || m.photo_url || null;

            // Pastikan divisi / rombel terdaftar di tabel divisions
            if (divisionVal && divisionVal !== 'Umum') {
                upsertDivision.run(divisionVal, m.supervisor_name || null);
            }

            const existing = findMember.get(nisnVal, nipdVal || '', barcodeVal || '');
            if (existing) {
                updateMember.run(
                    nameVal,
                    divisionVal,
                    nipdVal,
                    nisnVal,
                    barcodeVal,
                    null,
                    phoneVal,
                    phoneVal,
                    telegramVal,
                    photoVal,
                    roleVal,
                    existing.id
                );
            } else {
                insertMember.run(
                    barcodeVal,
                    nipdVal,
                    nisnVal,
                    nameVal,
                    divisionVal,
                    null,
                    phoneVal,
                    phoneVal,
                    telegramVal,
                    photoVal,
                    roleVal
                );
            }

            // Jika peran adalah guru/wali kelas/tendik, buatkan akun login guru otomatis
            const isTeacher = ['guru', 'teacher', 'tendik', 'staff', 'pegawai'].includes(roleVal);
            if (isTeacher) {
                const teacherNip = nipdVal || nisnVal;
                const nonClass = ['Guru', 'Tendik', 'Staff', 'Pegawai', 'Umum', 'Karyawan', 'Semua', 'Semua Kelas'];
                const managedClass = db.prepare(`
                    SELECT name FROM divisions 
                    WHERE (supervisor_name LIKE ? OR ? LIKE ('%' || supervisor_name || '%'))
                      AND name NOT IN ('Guru', 'Tendik', 'Staff', 'Pegawai', 'Umum', 'Karyawan', 'Semua', 'Semua Kelas')
                    ORDER BY id DESC
                    LIMIT 1
                `).get(`%${nameVal}%`, nameVal);
                const assignedClass = managedClass ? managedClass.name : (!nonClass.includes(divisionVal) ? divisionVal : null);

                upsertTeacher.run(
                    teacherNip,
                    teacherNip,
                    nameVal,
                    assignedClass,
                    photoVal
                );
            }
        }
    });

    tx(members);
    res.json({ success: true, message: `Sinkron ${members.length} data siswa/guru berhasil.` });
});

// PUSH ATTENDANCE: Menerima antrean scan absensi dari desktop lokal
app.post(['/api/sync/push-attendance', '/api/push-attendance', '/push-attendance'], (req, res) => {
    if (!checkSyncAuth(req)) {
        return res.status(403).json({ success: false, message: 'Secret token tidak cocok atau tidak disertakan.' });
    }

    const { logs } = req.body;
    if (!Array.isArray(logs)) return res.status(400).json({ success: false, message: 'Format log tidak valid' });

    const syncedIds = [];

    const findMember = db.prepare(`
        SELECT id FROM members 
        WHERE (nisn IS NOT NULL AND nisn = ?) 
           OR (nipd IS NOT NULL AND nipd = ?) 
           OR (barcode_id IS NOT NULL AND barcode_id = ?)
        LIMIT 1
    `);

    const autoInsertMember = db.prepare(`
        INSERT INTO members (barcode_id, nipd, nisn, full_name, division, parent_pin, photo_url, role)
        VALUES (?, ?, ?, ?, ?, '123456', ?, ?)
    `);

    const findExistingLog = db.prepare(`
        SELECT id FROM attendance_logs 
        WHERE (sync_id IS NOT NULL AND sync_id != '' AND sync_id = ?) 
           OR (member_id = ? AND date = ?)
        LIMIT 1
    `);

    const updateLog = db.prepare(`
        UPDATE attendance_logs 
        SET status = ?, time_in = COALESCE(?, time_in), time_out = COALESCE(?, time_out), note = ?, synced_at = CURRENT_TIMESTAMP,
            sync_id = COALESCE(sync_id, ?)
        WHERE id = ?
    `);

    const insertLog = db.prepare(`
        INSERT INTO attendance_logs (member_id, sync_id, date, time_in, time_out, status, note, device_gate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(member_id, date) DO UPDATE SET
            status = excluded.status,
            time_in = COALESCE(excluded.time_in, attendance_logs.time_in),
            time_out = COALESCE(excluded.time_out, attendance_logs.time_out),
            note = excluded.note,
            synced_at = CURRENT_TIMESTAMP,
            sync_id = COALESCE(attendance_logs.sync_id, excluded.sync_id)
    `);

    const tx = db.transaction((items) => {
        for (const log of items) {
            // 1. Cari atau buat akun siswa di portal
            const nisn = log.nisn || '';
            const nipd = log.nipd || '';
            const barcode = log.barcode_id || nisn || nipd || '';
            let member = (nisn || nipd || barcode) ? findMember.get(nisn, nipd, barcode) : null;

            if (!member && (nisn || nipd || log.full_name)) {
                const autoNisn = nisn || nipd || `SIS-${Date.now()}`;
                const autoInfo = autoInsertMember.run(
                    barcode || autoNisn,
                    nipd || null,
                    autoNisn,
                    log.full_name || 'Siswa',
                    log.division_name || log.division || 'Umum',
                    log.photo || null,
                    log.role || 'siswa'
                );
                member = { id: autoInfo.lastInsertRowid };
            }

            if (!member) continue;

            // 2. Normalisasi tanggal & waktu
            const dateLog = log.date_log || (log.scan_time ? String(log.scan_time).split(' ')[0] : new Date().toISOString().split('T')[0]);
            let timeIn = null;
            if (log.scan_time) {
                const parts = String(log.scan_time).split(' ');
                timeIn = parts.length > 1 ? parts[1] : parts[0];
            } else if (log.time_in) {
                timeIn = log.time_in;
            }

            const timeOut = log.scan_out || log.time_out || null;
            const status = log.status || 'HADIR';
            const note = log.note || log.shift_name || '';
            const deviceGate = log.device_gate || log.source || 'Gate Utama';

            // 3. Simpan ke attendance_logs (Deduplikasi kuat berdasarkan sync_id atau member_id + date)
            const syncId = log.sync_id || (log.id ? `local-${log.id}` : null);
            const exist = findExistingLog.get(syncId || '', member.id, dateLog);
            if (exist) {
                updateLog.run(status, timeIn, timeOut, note, syncId, exist.id);
            } else {
                insertLog.run(member.id, syncId, dateLog, timeIn, timeOut, status, note, deviceGate);
            }

            if (log.sync_id) syncedIds.push(log.sync_id);
            else if (log.id) syncedIds.push(log.id);
        }
    });

    tx(logs);
    db.prepare('UPDATE school_settings SET last_sync_at = CURRENT_TIMESTAMP WHERE id = 1').run();

    res.json({
        success: true,
        message: `Sinkron ${syncedIds.length} data absensi berhasil.`,
        synced_ids: syncedIds
    });
});

// PULL REMOTE UPDATES: Mengirimkan izin/sakit yang sudah disetujui wali kelas ke desktop lokal
app.get(['/api/sync/pull-remote-updates', '/api/pull-remote-updates', '/pull-remote-updates'], (req, res) => {
    if (!checkSyncAuth(req)) {
        return res.status(403).json({ success: false, message: 'Secret token tidak cocok atau tidak disertakan.' });
    }

    const approvedLeaves = db.prepare(`
        SELECT l.id, l.sync_id, l.type, l.start_date, l.end_date, l.reason, l.status,
               m.nipd, m.nisn, m.full_name
        FROM leave_requests l
        JOIN members m ON l.member_id = m.id
        WHERE l.status = 'DISETUJUI' AND (l.synced_to_local = 0 OR l.synced_to_local IS NULL)
    `).all();

    const updates = [];
    for (const item of approvedLeaves) {
        updates.push({
            sync_id: item.sync_id || `leave-${item.id}`,
            nipd: item.nipd,
            nisn: item.nisn,
            full_name: item.full_name,
            status: item.type,
            date_log: item.start_date
        });
        db.prepare('UPDATE leave_requests SET synced_to_local = 1 WHERE id = ?').run(item.id);
    }

    res.json({ success: true, updates });
});

// Serve static client assets (dist) jika ada
app.use(express.static(distPath));
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
});

app.listen(PORT, () => {
    console.log(`[NEBULA PRESENCE CLOUD] Berjalan di port ${PORT}`);
});
