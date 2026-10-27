import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Buat sesi login baru di tabel database sessions
 */
export function createSession(db, { userRole, userId, userData = {} }) {
    // Generate secure 32 bytes (64 hex characters) token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 hari

    db.prepare(`
        INSERT INTO sessions (token, user_role, user_id, user_data, expires_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(token, userRole, userId, JSON.stringify(userData), expiresAt);

    return {
        token,
        expiresAt,
        userRole,
        userId
    };
}

/**
 * Verifikasi token sesi dari database
 */
export function verifySession(db, token) {
    if (!token || typeof token !== 'string') return null;

    const session = db.prepare(`
        SELECT token, user_role, user_id, user_data, expires_at
        FROM sessions
        WHERE token = ? AND datetime(expires_at) > datetime('now')
    `).get(token);

    if (!session) return null;

    let parsedData = {};
    try {
        parsedData = JSON.parse(session.user_data || '{}');
    } catch (_) {}

    return {
        token: session.token,
        role: session.user_role,
        userId: session.user_id,
        userData: parsedData,
        expiresAt: session.expires_at
    };
}

/**
 * Hapus sesi ketika logout
 */
export function destroySession(db, token) {
    if (!token) return;
    try {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    } catch (_) {}
}

/**
 * Bersihkan sesi yang sudah kedaluwarsa secara berkala
 */
export function purgeExpiredSessions(db) {
    try {
        db.prepare('DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP').run();
    } catch (_) {}
}

/**
 * Middleware untuk mengekstrak dan memverifikasi token dari Authorization header
 */
export function createAuthMiddleware(db) {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'] || '';
        let token = null;

        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7).trim();
        } else if (req.headers['x-auth-token']) {
            token = req.headers['x-auth-token'];
        }

        if (token) {
            const session = verifySession(db, token);
            if (session) {
                req.user = session;
            }
        }
        next();
    };
}

/**
 * Middleware mewajibkan login aktif
 */
export function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Sesi login tidak valid atau telah berakhir. Silakan login kembali.'
        });
    }
    next();
}

/**
 * Middleware mewajibkan role tertentu (ADMIN, TEACHER, PARENT)
 */
export function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Silakan login terlebih dahulu untuk mengakses menu ini.'
            });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak: Kewenangan akun Anda tidak mencukupi untuk aksi ini.'
            });
        }
        next();
    };
}

/**
 * Audit Logger Helper
 */
export function logAudit(db, req, action, entityType, entityId = null, details = null) {
    try {
        const userId = req?.user?.userId || null;
        const userRole = req?.user?.role || 'SYSTEM';
        const ipAddress = req?.ip || req?.socket?.remoteAddress || '127.0.0.1';
        const detailStr = typeof details === 'object' ? JSON.stringify(details) : String(details || '');

        db.prepare(`
            INSERT INTO audit_logs (user_id, user_role, action, entity_type, entity_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(userId, userRole, action, entityType, entityId, detailStr, ipAddress);
    } catch (err) {
        console.error('[AuditLog Error]:', err.message);
    }
}
