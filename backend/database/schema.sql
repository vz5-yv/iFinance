-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('Admin', 'Accountant', 'Viewer')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  scope TEXT NOT NULL CHECK(scope IN ('personal', 'business')),
  category_id INTEGER,
  source TEXT,
  status TEXT DEFAULT 'confirmed' CHECK(status IN ('pending', 'confirmed', 'rejected')),
  suggested_category_id INTEGER,
  confidence_score REAL,
  ai_explanation TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (suggested_category_id) REFERENCES categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK(scope IN ('personal', 'business', 'both')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Classification rules table
CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  scope TEXT NOT NULL CHECK(scope IN ('personal', 'business', 'both')),
  priority INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert default categories (INSERT OR IGNORE prevents duplicates on restart)
INSERT OR IGNORE INTO categories (id, name, scope) VALUES
  (1,  'Lương', 'business'),
  (2,  'Thưởng', 'business'),
  (3,  'Bán hàng', 'business'),
  (4,  'Tiền mặt', 'personal'),
  (5,  'Ăn uống', 'both'),
  (6,  'Di chuyển', 'both'),
  (7,  'Văn phòng phẩm', 'business'),
  (8,  'Tiền điện', 'both'),
  (9,  'Tiền nước', 'both'),
  (10, 'Internet', 'both'),
  (11, 'Giải trí', 'personal'),
  (12, 'Mua sắm', 'personal'),
  (13, 'Y tế', 'both'),
  (14, 'Giáo dục', 'personal'),
  (15, 'Khác', 'both');

-- Insert default admin user (password: admin123)
-- Password hash generated with bcrypt, rounds=10
INSERT OR IGNORE INTO users (username, password_hash, role) VALUES
  ('admin', '$2b$10$LOQtkQOV38LVYDIKtYymtOkPr4FC8WW0ZbgeKVfDAQH8WfoIuJd6C', 'Admin');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_scope ON transactions(scope);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Settings table for app-wide configurations
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default AI storage path (empty means use default backend/bin)
INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_storage_path', '');
