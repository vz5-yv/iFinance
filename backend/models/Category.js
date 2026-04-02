const db = require('../database/connection');

const CategoryModel = {
    create(name, scope) {
        const stmt = db.prepare('INSERT INTO categories (name, scope) VALUES (?, ?)');
        const result = stmt.run(name, scope);
        return result.lastInsertRowid;
    },

    findById(id) {
        const stmt = db.prepare('SELECT * FROM categories WHERE id = ?');
        return stmt.get(id);
    },

    getAll(scope = null) {
        let query = `
            SELECT c.*, COUNT(t.id) as transaction_count 
            FROM categories c
            LEFT JOIN transactions t ON c.id = t.category_id
        `;
        const params = [];

        if (scope) {
            query += ' WHERE c.scope = ? OR c.scope = "both"';
            params.push(scope);
        }

        query += ' GROUP BY c.id ORDER BY c.name';

        const stmt = db.prepare(query);
        return stmt.all(...params);
    },

    update(id, name, scope) {
        const stmt = db.prepare(
            'UPDATE categories SET name = ?, scope = ? WHERE id = ?'
        );
        return stmt.run(name, scope, id);
    },

    delete(id) {
        const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
        return stmt.run(id);
    }
};

module.exports = CategoryModel;
