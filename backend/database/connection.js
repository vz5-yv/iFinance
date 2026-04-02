const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'ifinance.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

console.log('Connecting to database at:', dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schemaPath = path.join(__dirname, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

const statements = schemaSql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

statements.forEach(statement => {
    try {
        db.exec(statement);
    } catch (error) {
        if (!error.message.includes('already exists')) {
            console.error('Error executing statement:', statement);
            console.error(error);
        }
    }
});

console.log('Database initialized successfully');

module.exports = db;
