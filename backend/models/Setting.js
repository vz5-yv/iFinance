const db = require('../database/connection');

class SettingModel {
    get(key) {
        return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value;
    }

    set(key, value) {
        db.prepare(`
            INSERT INTO settings (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `).run(key, value);
    }
}

module.exports = new SettingModel();
