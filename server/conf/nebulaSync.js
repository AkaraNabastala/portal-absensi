import fs from 'fs';
import path from 'path';
import os from 'os';
import betterSqlite from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const NEBULA_DB_PATH = path.join(os.homedir(), '.nebula-presence-app', 'database.sqlite');

let lastNebulaDbFingerprint = '';

/**
 * Sinkronisasi instan langsung dari database aplikasi Nebula Presence ke database Portal
 */
export function syncFromNebulaApp(portalDb, force = false) {
    if (!fs.existsSync(NEBULA_DB_PATH)) {
        return { success: false, message: 'Database Nebula Presence lokal tidak ditemukan' };
    }

    try {
        const fileStat = fs.statSync(NEBULA_DB_PATH);
        // SQLite WAL can change while the main database file timestamp stays the same.
        const walPath = `${NEBULA_DB_PATH}-wal`;
        let walFingerprint = 'no-wal';
        try {
            const walStat = fs.statSync(walPath);
            walFingerprint = `${walStat.mtimeMs}:${walStat.size}`;
        } catch {
            // No WAL file is normal when SQLite has checkpointed all changes.
        }
        const sourceFingerprint = `${fileStat.mtimeMs}:${fileStat.size}:${walFingerprint}`;
        if (!force && sourceFingerprint === lastNebulaDbFingerprint) {
            return { success: true, message: 'Database tidak ada perubahan baru' };
        }
        const nebulaDb = betterSqlite(NEBULA_DB_PATH, { readonly: true });
        let hadSyncErrors = false;

        // 1. Sinkron School Info (Branding, Logo, Nama Sekolah)
        try {
            const rawSettings = nebulaDb.prepare('SELECT setting_key, setting_value FROM app_settings').all();
            const settingsMap = {};
            rawSettings.forEach(s => {
                if (s.setting_key && s.setting_value) settingsMap[s.setting_key] = s.setting_value;
            });

            portalDb.prepare(`
                UPDATE school_settings
                SET school_name = COALESCE(?, school_name),
                    school_address = COALESCE(?, school_address),
                    school_logo = COALESCE(?, school_logo),
                    last_sync_at = CURRENT_TIMESTAMP
                WHERE id = 1
            `).run(
                settingsMap['nama_sekolah'] || null,
                settingsMap['alamat_sekolah'] || null,
                settingsMap['logo_sekolah'] || null
            );
        } catch (e) {
            hadSyncErrors = true;
            console.warn('[NebulaDirectSync] Sync settings warning:', e.message);
        }

        // 2. Sinkron Divisi / Kelas & Penanggung Jawab (Wali Kelas)
        try {
            const rawDivisions = nebulaDb.prepare('SELECT id, name, supervisor_name FROM divisions').all();
            const upsertDivision = portalDb.prepare(`
                INSERT INTO divisions (name, supervisor_name)
                VALUES (?, ?)
                ON CONFLICT(name) DO UPDATE SET
                    supervisor_name = excluded.supervisor_name
            `);

            const nonClass = ['Guru', 'Tendik', 'Staff', 'Pegawai', 'Umum', 'Karyawan', 'Semua', 'Semua Kelas'];
            for (const div of rawDivisions) {
                const isNonClass = nonClass.some(nc => nc.toLowerCase() === div.name.toLowerCase());
                const supName = (!isNonClass && div.supervisor_name) ? div.supervisor_name : null;
                upsertDivision.run(div.name, supName);
                if (supName && !isNonClass) {
                    portalDb.prepare("UPDATE teachers SET assigned_division = ? WHERE full_name LIKE ?").run(div.name, `%${supName}%`);
                }
            }
        } catch (e) {
            hadSyncErrors = true;
            console.warn('[NebulaDirectSync] Sync divisions warning:', e.message);
        }

        // 3. Sinkron Members (Siswa & Guru)
        try {
            const members = nebulaDb.prepare(`
                SELECT m.id, m.identity_number as nipd, m.identity_reference as nisn,
                       m.full_name, m.role, m.rfid_code, m.photo, m.phone_number, d.name as division_name,
                       d.supervisor_name, ta.username AS login_username, ta.password_hash AS login_password_hash
                FROM members m
                LEFT JOIN divisions d ON m.division_id = d.id
                LEFT JOIN teacher_accounts ta ON ta.member_id = m.id AND ta.is_active = 1
            `).all();

            const findMember = portalDb.prepare(`
                SELECT id, parent_pin_hash FROM members 
                WHERE (nisn IS NOT NULL AND nisn != '' AND nisn = ?) 
                   OR (nipd IS NOT NULL AND nipd != '' AND nipd = ?) 
                   OR (barcode_id IS NOT NULL AND barcode_id != '' AND barcode_id = ?)
                LIMIT 1
            `);

            // PIN wali/siswa tidak boleh dibuat dengan nilai bawaan yang diketahui umum.
            // PIN bersama lama akan dicabut saat sinkronisasi menemukan akun terkait.

            const upsertMember = portalDb.prepare(`
                INSERT INTO members (barcode_id, nipd, nisn, full_name, division, parent_pin_hash, parent_name, parent_phone, photo_url, role)
                VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
                ON CONFLICT(barcode_id) DO UPDATE SET
                    full_name = excluded.full_name,
                    division = excluded.division,
                    nipd = COALESCE(excluded.nipd, members.nipd),
                    nisn = COALESCE(excluded.nisn, members.nisn),
                    parent_phone = COALESCE(excluded.parent_phone, members.parent_phone),
                    photo_url = COALESCE(excluded.photo_url, members.photo_url),
                    role = COALESCE(excluded.role, members.role)
            `);

            const updateMemberById = portalDb.prepare(`
                UPDATE members 
                SET full_name = ?,
                    division = ?,
                    nipd = COALESCE(?, nipd),
                    nisn = COALESCE(?, nisn),
                    barcode_id = COALESCE(?, barcode_id),
                    parent_phone = COALESCE(?, parent_phone),
                    photo_url = COALESCE(?, photo_url),
                    role = COALESCE(?, role)
                WHERE id = ?
            `);

            const upsertTeacher = portalDb.prepare(`
                INSERT INTO teachers (nip, username, password_hash, full_name, assigned_division, role)
                VALUES (?, ?, ?, ?, ?, 'WALI_KELAS')
                ON CONFLICT(nip) DO UPDATE SET
                    username = CASE WHEN ? = 1 THEN excluded.username ELSE teachers.username END,
                    password_hash = CASE WHEN ? = 1 THEN excluded.password_hash ELSE teachers.password_hash END,
                    full_name = excluded.full_name,
                    assigned_division = COALESCE(excluded.assigned_division, teachers.assigned_division)
            `);

            for (const m of members) {
                const rawNipd = m.nipd || null;
                const rawNisn = m.nisn || null;
                const nipdVal = rawNipd && String(rawNipd).trim() !== '' ? String(rawNipd).trim() : null;
                const nisnVal = rawNisn && String(rawNisn).trim() !== '' ? String(rawNisn).trim() : (nipdVal || `ID-${Date.now()}-${Math.floor(Math.random()*1000)}`);
                const barcodeVal = m.rfid_code || nisnVal || nipdVal;
                const nameVal = m.full_name || 'Anggota';
                const roleVal = m.role ? String(m.role).normalize('NFKC').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ') : 'siswa';
                const divisionVal = m.division_name || 'Umum';
                const phoneVal = m.phone_number || null;
                const photoVal = m.photo || null;

                const existing = findMember.get(nisnVal, nipdVal || '', barcodeVal || '');
                if (existing) {
                    if (existing.parent_pin_hash && bcrypt.compareSync('123456', existing.parent_pin_hash)) {
                        portalDb.prepare('UPDATE members SET parent_pin_hash = NULL WHERE id = ?').run(existing.id);
                    }
                    updateMemberById.run(
                        nameVal,
                        divisionVal,
                        nipdVal,
                        nisnVal,
                        barcodeVal,
                        phoneVal,
                        photoVal,
                        roleVal,
                        existing.id
                    );
                } else {
                    upsertMember.run(
                        barcodeVal,
                        nipdVal,
                        nisnVal,
                        nameVal,
                        divisionVal,
                        null,
                        phoneVal,
                        photoVal,
                        roleVal
                    );
                }

                const isTeacher = new Set(['guru', 'guru mapel', 'guru mata pelajaran', 'guru kelas', 'teacher', 'pengajar', 'wali kelas', 'walikelas', 'tendik', 'staff', 'staf', 'pegawai', 'karyawan', 'penanggung jawab', 'koordinator']).has(roleVal);
                if (isTeacher) {
                    const teacherNip = nipdVal || nisnVal;
                    const nonClass = ['Guru', 'Tendik', 'Staff', 'Pegawai', 'Umum', 'Karyawan', 'Semua', 'Semua Kelas'];
                    const managedClass = portalDb.prepare(`
                        SELECT name FROM divisions 
                        WHERE (supervisor_name LIKE ? OR ? LIKE ('%' || supervisor_name || '%'))
                          AND name NOT IN ('Guru', 'Tendik', 'Staff', 'Pegawai', 'Umum', 'Karyawan', 'Semua', 'Semua Kelas')
                        ORDER BY id DESC
                        LIMIT 1
                    `).get(`%${nameVal}%`, nameVal);
                    const assignedClass = managedClass ? managedClass.name : (!nonClass.includes(divisionVal) ? divisionVal : null);

                    const validBcryptHash = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(String(m.login_password_hash || ''));
                    const hasLoginCredentials = Boolean(m.login_username && validBcryptHash);
                    const existingTeacher = portalDb.prepare('SELECT password_hash FROM teachers WHERE nip = ? LIMIT 1').get(teacherNip);
                    const existingHash = String(existingTeacher?.password_hash || '');
                    // Revoke the old shared default password if an account was created by an older sync.
                    const hasLegacyDefaultPassword = !hasLoginCredentials
                        && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(existingHash)
                        && bcrypt.compareSync('Guru2026!', existingHash);
                    const updateCredentials = hasLoginCredentials || hasLegacyDefaultPassword;
                    const loginUsername = hasLoginCredentials ? String(m.login_username).trim() : String(teacherNip);
                    const loginPasswordHash = hasLoginCredentials
                        ? String(m.login_password_hash)
                        : bcrypt.hashSync(randomBytes(32).toString('hex'), 10);
                    upsertTeacher.run(
                        teacherNip,
                        loginUsername,
                        loginPasswordHash,
                        nameVal,
                        assignedClass,
                        updateCredentials ? 1 : 0,
                        updateCredentials ? 1 : 0
                    );
                }
            }
        } catch (e) {
            hadSyncErrors = true;
            console.warn('[NebulaDirectSync] Sync members warning:', e.message);
        }

        // 4. Sinkron Attendance Logs
        try {
            const logs = nebulaDb.prepare(`
                SELECT a.id, a.sync_id, a.status, a.date_log, a.scan_time, a.scan_out, a.shift_name, a.source,
                       m.identity_number as nipd, m.identity_reference as nisn, m.full_name
                FROM attendance_logs a
                JOIN members m ON a.member_id = m.id
            `).all();

            const findMemberInPortal = portalDb.prepare(`
                SELECT id FROM members WHERE nisn = ? OR nipd = ? LIMIT 1
            `);

            const upsertLog = portalDb.prepare(`
                INSERT INTO attendance_logs (member_id, sync_id, date, time_in, time_out, status, note, device_gate)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Gate Mesin Presensi')
                ON CONFLICT(sync_id) DO UPDATE SET
                    status = excluded.status,
                    time_in = COALESCE(excluded.time_in, attendance_logs.time_in),
                    time_out = COALESCE(excluded.time_out, attendance_logs.time_out),
                    note = excluded.note
            `);

            for (const l of logs) {
                const member = findMemberInPortal.get(l.nisn || '', l.nipd || '');
                if (!member) continue;

                let timeIn = null;
                if (l.scan_time) {
                    const parts = String(l.scan_time).split(' ');
                    timeIn = parts.length > 1 ? parts[1].substring(0, 5) : parts[0].substring(0, 5);
                }
                const timeOut = l.scan_out ? String(l.scan_out).substring(0, 5) : null;
                const syncId = l.sync_id || `nebula-${l.id}`;

                upsertLog.run(
                    member.id,
                    syncId,
                    l.date_log,
                    timeIn,
                    timeOut,
                    l.status || 'HADIR',
                    l.shift_name || ''
                );
            }
        } catch (e) {
            hadSyncErrors = true;
            console.warn('[NebulaDirectSync] Sync attendance logs warning:', e.message);
        }

        nebulaDb.close();
        // Do not cache a partial pass: retry it on the next scheduler tick.
        if (hadSyncErrors) {
            return { success: false, partial: true, message: 'Sinkronisasi langsung belum lengkap; sistem akan mencoba kembali.' };
        }
        lastNebulaDbFingerprint = sourceFingerprint;
        return { success: true };
    } catch (err) {
        console.error('[NebulaDirectSync] Fatal Error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Tulis permohonan izin yang disetujui langsung ke database Nebula Presence lokal
 */
export function writeApprovedLeaveToNebulaApp(memberNisn, memberNipd, leaveType, dateLog, reason) {
    if (!fs.existsSync(NEBULA_DB_PATH)) return;

    try {
        const nebulaDb = betterSqlite(NEBULA_DB_PATH);
        const mem = nebulaDb.prepare(`
            SELECT id FROM members WHERE identity_reference = ? OR identity_number = ? LIMIT 1
        `).get(memberNisn, memberNipd);

        if (mem) {
            const existLog = nebulaDb.prepare(`
                SELECT id FROM attendance_logs WHERE member_id = ? AND date_log = ?
            `).get(mem.id, dateLog);

            if (existLog) {
                nebulaDb.prepare(`
                    UPDATE attendance_logs 
                    SET status = ?, source = 'portal_cloud', is_synced = 1 
                    WHERE id = ?
                `).run(leaveType, existLog.id);
            } else {
                nebulaDb.prepare(`
                    INSERT INTO attendance_logs (member_id, status, date_log, scan_time, sync_id, is_synced, source)
                    VALUES (?, ?, ?, ?, ?, 1, 'portal_cloud')
                `).run(mem.id, leaveType, dateLog, `${dateLog} 07:00:00`, `PORTAL-${Date.now()}`);
            }
        }
        nebulaDb.close();
    } catch (e) {
        console.warn('[NebulaDirectSync] Error writing leave to nebula app:', e.message);
    }
}
