const db = require('../database/connection');

const AuditLogModel = {
    log(userId, action, entityType, entityId, details, ipAddress) {
        const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(
            userId,
            action,
            entityType,
            entityId || null,
            details ? JSON.stringify(details) : null,
            ipAddress || null
        );
        return result.lastInsertRowid;
    },

    getAll(filters = {}) {
        let query = `
      SELECT al.*, u.username
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
        const params = [];

        if (filters.user_id) {
            query += ' AND al.user_id = ?';
            params.push(filters.user_id);
        }
        if (filters.action) {
            query += ' AND al.action = ?';
            params.push(filters.action);
        }
        if (filters.entity_type) {
            query += ' AND al.entity_type = ?';
            params.push(filters.entity_type);
        }
        if (filters.start_date) {
            query += ' AND al.created_at >= ?';
            params.push(filters.start_date);
        }

        query += ' ORDER BY al.created_at DESC';

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }

        const stmt = db.prepare(query);
        return stmt.all(...params);
    }
};

module.exports = AuditLogModel;
