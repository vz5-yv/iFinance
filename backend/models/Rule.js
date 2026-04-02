const db = require('../database/connection');

class RuleModel {
    getAll() {
        return db.prepare(`
            SELECT r.*, c.name as category_name
            FROM rules r
            JOIN categories c ON r.category_id = c.id
            ORDER BY r.priority DESC, r.keyword
        `).all();
    }

    findById(id) {
        return db.prepare('SELECT * FROM rules WHERE id = ?').get(id);
    }

    create(keyword, categoryId, scope, priority = 1) {
        const stmt = db.prepare(`
            INSERT INTO rules (keyword, category_id, scope, priority)
            VALUES (?, ?, ?, ?)
        `);
        return stmt.run(keyword, categoryId, scope, priority).lastInsertRowid;
    }

    update(id, keyword, categoryId, scope, priority) {
        db.prepare(`
            UPDATE rules SET keyword = ?, category_id = ?, scope = ?, priority = ?
            WHERE id = ?
        `).run(keyword, categoryId, scope, priority, id);
    }

    delete(id) {
        db.prepare('DELETE FROM rules WHERE id = ?').run(id);
    }
}

module.exports = new RuleModel();
