import fs from 'fs';
import path from 'path';
import os from 'os';
import betterSqlite from 'better-sqlite3';

const NEBULA_DB_PATH = path.join(os.homedir(), '.nebula-presence-app', 'database.sqlite');

let lastNebulaDbMtime = 0;

/**
 * Sinkronisasi instan langsung dari database aplikasi Nebula Presence ke database Portal
 */
export function syncFromNebulaApp(portalDb) {
    if (!fs.existsSync(NEBULA_DB_PATH)) {
        return { success: false, message: 'Database Nebula Presence lokal tidak ditemukan' };
    }

    try {
        const fileStat = fs.statSync(NEBULA_DB_PATH);
        if (fileStat.mtimeMs <= lastNebulaDbMtime) {
            return { success: true, message: 'Database tidak ada perubahan baru' };
        }
        lastNebulaDbMtime = fileStat.mtimeMs;
        const nebulaDb = betterSqlite(NEBULA_DB_PATH, { readonly: false });

        // 1. Sinkron School Info (Branding, Logo, Nama Sekolah)
        try {
            const rawSettings = nebulaDb.prepare('SELECT setting_key, setting_value FROM app_settings').all();
            const settingsMap = {};
            // 1.1 Sinkron Admin dari tabel admins desktop jika tersedia
            try {
                const adminRow = nebulaDb.prepare('SELECT username, password FROM admins ORDER BY id ASC LIMIT 1').get();
                if (adminRow && adminRow.username) {
                    settingsMap['admin_username'] = adminRow.username;
                    settingsMap['admin_password_hash'] = adminRow.password;
                }
            } catch (_) {}

            portalDb.prepare(`
                UPDATE school_settings 
                SET school_name = COALESCE(?, school_name),
                    school_address = COALESCE(?, school_address),
                    school_logo = COALESCE(?, school_logo),
                    admin_username = COALESCE(?, admin_username),
                    admin_password_hash = COALESCE(?, admin_password_hash),
                    last_sync_at = CURRENT_TIMESTAMP
                WHERE id = 1
            `).run(
                settingsMap['nama_sekolah'] || null,
                settingsMap['alamat_sekolah'] || null,
                settingsMap['logo_sekolah'] || null,
                settingsMap['admin_username'] || null,
                settingsMap['admin_password_hash'] || null
            );
        } catch (e) {
            console.warn('[NebulaDirectSync] Sync settings warning:', e.message);
        }

        // 1.5. Sinkron Divisi / Kelas & Penanggung Jawab (Wali Kelas)
        try {
            portalDb.exec(`
                CREATE TABLE IF NOT EXISTS divisions (
                    id INTEGER PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    supervisor_name TEXT
                );
            `);

            const rawDivisions = nebulaDb.prepare('SELECT id, name, supervisor_name FROM divisions').all();
            const upsertDivision = portalDb.prepare(`
                INSERT INTO divisions (id, name, supervisor_name)
                VALUES (?, ?, ?)
                ON CONFLICT(name) DO UPDATE SET
                    id = excluded.id,
                    supervisor_name = excluded.supervisor_name
            `);

            const nonClass = ['Guru', 'Tendik', 'Staff', 'Pegawai', 'Umum', 'Karyawan', 'Semua', 'Semua Kelas'];
            for (const div of rawDivisions) {
                const isNonClass = nonClass.some(nc => nc.toLowerCase() === div.name.toLowerCase());
                const supName = (!isNonClass && div.supervisor_name) ? div.supervisor_name : null;
                upsertDivision.run(div.id, div.name, supName);
                if (supName && !isNonClass) {
                    portalDb.prepare("UPDATE teachers SET assigned_division = ? WHERE full_name LIKE ?").run(div.name, `%${supName}%`);
                }
            }
        } catch (e) {
            console.warn('[NebulaDirectSync] Sync divisions warning:', e.message);
        }

        // 2. Sinkron Members (Siswa & Guru)
        try {
            const members = nebulaDb.prepare(`
                SELECT m.id, m.identity_number as nipd, m.identity_reference as nisn,
                       m.full_name, m.role, m.rfid_code, m.photo, m.phone_number, d.name as division_name,
                       d.supervisor_name
                FROM members m
                LEFT JOIN divisions d ON m.division_id = d.id
            `).all();

            const findMember = portalDb.prepare(`
                SELECT id FROM members 
                WHERE (nisn IS NOT NULL AND nisn != '' AND nisn = ?) 
                   OR (nipd IS NOT NULL AND nipd != '' AND nipd = ?) 
                   OR (barcode_id IS NOT NULL AND barcode_id != '' AND barcode_id = ?)
                LIMIT 1
            `);

            const upsertMember = portalDb.prepare(`
                INSERT INTO members (barcode_id, nipd, nisn, full_name, division, parent_pin, parent_name, parent_phone, photo_url, role)
                VALUES (?, ?, ?, ?, ?, '123456', NULL, ?, ?, ?)
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
                INSERT INTO teachers (nip, username, password, full_name, assigned_division, role)
                VALUES (?, ?, 'guru123', ?, ?, 'WALI_KELAS')
                ON CONFLICT(nip) DO UPDATE SET
                    full_name = excluded.full_name,
                    assigned_division = excluded.assigned_division
            `);

            for (const m of members) {
                const rawNipd = m.nipd || null;
                const rawNisn = m.nisn || null;
                const nipdVal = rawNipd && String(rawNipd).trim() !== '' ? String(rawNipd).trim() : null;
                const nisnVal = rawNisn && String(rawNisn).trim() !== '' ? String(rawNisn).trim() : (nipdVal || `ID-${Date.now()}-${Math.floor(Math.random()*1000)}`);
                const barcodeVal = m.rfid_code || nisnVal || nipdVal;
                const nameVal = m.full_name || 'Anggota';
                const roleVal = m.role ? String(m.role).toLowerCase() : 'siswa';
                const divisionVal = m.division_name || 'Umum';
                const phoneVal = m.phone_number || null;
                const photoVal = m.photo || null;

                const existing = findMember.get(nisnVal, nipdVal || '', barcodeVal || '');
                if (existing) {
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
                        phoneVal,
                        photoVal,
                        roleVal
                    );
                }

                const isTeacher = ['guru', 'teacher', 'tendik', 'staff', 'pegawai'].includes(roleVal);
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

                    upsertTeacher.run(
                        teacherNip,
                        teacherNip,
                        nameVal,
                        assignedClass
                    );
                }
            }
        } catch (e) {
            console.warn('[NebulaDirectSync] Sync members warning:', e.message);
        }

        // 3. Sinkron Attendance Logs
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
                ON CONFLICT(member_id, date) DO UPDATE SET
                    status = excluded.status,
                    time_in = COALESCE(excluded.time_in, attendance_logs.time_in),
                    time_out = COALESCE(excluded.time_out, attendance_logs.time_out),
                    sync_id = COALESCE(excluded.sync_id, attendance_logs.sync_id),
                    note = COALESCE(excluded.note, attendance_logs.note)
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
            console.warn('[NebulaDirectSync] Sync attendance logs warning:', e.message);
        }

        nebulaDb.close();
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
