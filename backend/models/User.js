const db = require('../database/connection');

const UserModel = {
    create(username, passwordHash, role) {
        const stmt = db.prepare(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
        );
        const result = stmt.run(username, passwordHash, role);
        return result.lastInsertRowid;
    },

    findByUsername(username) {
        const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
        return stmt.get(username);
    },

    findById(id) {
        const stmt = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?');
        return stmt.get(id);
    },

    getAll() {
        const stmt = db.prepare('SELECT id, username, role, created_at FROM users');
        return stmt.all();
    },

    updateRole(id, role) {
        const stmt = db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        return stmt.run(role, id);
    },

    delete(id) {
        const stmt = db.prepare('DELETE FROM users WHERE id = ?');
        return stmt.run(id);
    }
};

module.exports = UserModel;
