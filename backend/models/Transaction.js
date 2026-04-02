const db = require('../database/connection');

const TransactionModel = {
    create(data) {
        const stmt = db.prepare(`
      INSERT INTO transactions 
      (date, description, amount, type, scope, category_id, source, status, 
       suggested_category_id, confidence_score, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(
            data.date,
            data.description,
            data.amount,
            data.type,
            data.scope,
            data.category_id || null,
            data.source || null,
            data.status || 'confirmed',
            data.suggested_category_id || null,
            data.confidence_score || null,
            data.created_by
        );
        return result.lastInsertRowid;
    },

    findById(id) {
        const stmt = db.prepare(`
      SELECT t.*, c.name as category_name, sc.name as suggested_category_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN categories sc ON t.suggested_category_id = sc.id
      WHERE t.id = ?
    `);
        return stmt.get(id);
    },

    getAll(filters = {}) {
        let query = `
      SELECT t.*, c.name as category_name, sc.name as suggested_category_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN categories sc ON t.suggested_category_id = sc.id
      WHERE 1=1
    `;
        const params = [];

        if (filters.type) {
            query += ' AND t.type = ?';
            params.push(filters.type);
        }
        if (filters.scope) {
            query += ' AND t.scope = ?';
            params.push(filters.scope);
        }
        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query += ` AND t.status IN (${filters.status.map(() => '?').join(',')})`;
                params.push(...filters.status);
            } else {
                query += ' AND t.status = ?';
                params.push(filters.status);
            }
        }
        if (filters.category_id) {
            query += ' AND t.category_id = ?';
            params.push(filters.category_id);
        }
        if (filters.start_date) {
            query += ' AND t.date >= ?';
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            query += ' AND t.date <= ?';
            params.push(filters.end_date);
        }
        if (filters.search) {
            query += ' AND t.description LIKE ?';
            params.push(`%${filters.search}%`);
        }

        query += ' ORDER BY t.date DESC, t.created_at DESC';

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(parseInt(filters.limit));
            if (filters.offset) {
                query += ' OFFSET ?';
                params.push(parseInt(filters.offset));
            }
        }

        const stmt = db.prepare(query);
        return stmt.all(...params);
    },

    count(filters = {}) {
        let query = 'SELECT COUNT(*) as total FROM transactions t WHERE 1=1';
        const params = [];

        if (filters.type) { query += ' AND t.type = ?'; params.push(filters.type); }
        if (filters.scope) { query += ' AND t.scope = ?'; params.push(filters.scope); }
        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query += ` AND t.status IN (${filters.status.map(() => '?').join(',')})`;
                params.push(...filters.status);
            } else {
                query += ' AND t.status = ?'; params.push(filters.status);
            }
        }
        if (filters.category_id) { query += ' AND t.category_id = ?'; params.push(filters.category_id); }
        if (filters.start_date) { query += ' AND t.date >= ?'; params.push(filters.start_date); }
        if (filters.end_date) { query += ' AND t.date <= ?'; params.push(filters.end_date); }
        if (filters.search) { query += ' AND t.description LIKE ?'; params.push(`%${filters.search}%`); }

        const stmt = db.prepare(query);
        return stmt.get(...params).total;
    },

    update(id, data) {
        const fields = [];
        const params = [];

        if (data.date !== undefined) {
            fields.push('date = ?');
            params.push(data.date);
        }
        if (data.description !== undefined) {
            fields.push('description = ?');
            params.push(data.description);
        }
        if (data.amount !== undefined) {
            fields.push('amount = ?');
            params.push(data.amount);
        }
        if (data.type !== undefined) {
            fields.push('type = ?');
            params.push(data.type);
        }
        if (data.scope !== undefined) {
            fields.push('scope = ?');
            params.push(data.scope);
        }
        if (data.category_id !== undefined) {
            fields.push('category_id = ?');
            params.push(data.category_id);
        }
        if (data.status !== undefined) {
            fields.push('status = ?');
            params.push(data.status);
        }
        if (data.ai_explanation !== undefined) {
            fields.push('ai_explanation = ?');
            params.push(data.ai_explanation);
        }
        if (data.source !== undefined) {
            fields.push('source = ?');
            params.push(data.source);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        const stmt = db.prepare(
            `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`
        );
        return stmt.run(...params);
    },

    delete(id) {
        const stmt = db.prepare('DELETE FROM transactions WHERE id = ?');
        return stmt.run(id);
    },

    getStats(filters = {}) {
        let query = `
      SELECT 
        type,
        scope,
        SUM(amount) as total,
        COUNT(*) as count,
        AVG(amount) as average
      FROM transactions
      WHERE status = 'confirmed'
    `;
        const params = [];

        if (filters.start_date) {
            query += ' AND date >= ?';
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            query += ' AND date <= ?';
            params.push(filters.end_date);
        }
        if (filters.category_id) {
            query += ' AND category_id = ?';
            params.push(filters.category_id);
        }
        if (filters.scope) {
            query += ' AND scope = ?';
            params.push(filters.scope);
        }

        query += ' GROUP BY type, scope';

        const stmt = db.prepare(query);
        return stmt.all(...params);
    },

    getCategoryStats(filters = {}) {
        let query = `
      SELECT 
        c.id,
        c.name,
        t.type,
        t.scope,
        SUM(t.amount) as total,
        COUNT(*) as count,
        AVG(t.amount) as average,
        SQRT(AVG(t.amount * t.amount) - AVG(t.amount) * AVG(t.amount)) as std_dev
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.status = 'confirmed'
    `;
        const params = [];

        if (filters.start_date) {
            query += ' AND t.date >= ?';
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            query += ' AND t.date <= ?';
            params.push(filters.end_date);
        }
        if (filters.category_id) {
            query += ' AND t.category_id = ?';
            params.push(filters.category_id);
        }
        if (filters.scope) {
            query += ' AND t.scope = ?';
            params.push(filters.scope);
        }

        query += ' GROUP BY c.id, c.name, t.type, t.scope';

        const stmt = db.prepare(query);
        return stmt.all(...params);
    }
};

module.exports = TransactionModel;
