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
  status TEXT DEFAULT 'confirmed' CHECK(status IN ('pending', 'confirmed')),
  suggested_category_id INTEGER,
  confidence_score REAL,
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

-- Insert default categories
INSERT INTO categories (name, scope) VALUES
  ('Lương', 'business'),
  ('Thưởng', 'business'),
  ('Bán hàng', 'business'),
  ('Tiền mặt', 'personal'),
  ('Ăn uống', 'both'),
  ('Di chuyển', 'both'),
  ('Văn phòng phẩm', 'business'),
  ('Tiền điện', 'both'),
  ('Tiền nước', 'both'),
  ('Internet', 'both'),
  ('Giải trí', 'personal'),
  ('Mua sắm', 'personal'),
  ('Y tế', 'both'),
  ('Giáo dục', 'personal'),
  ('Khác', 'both');

-- Insert default admin user (password: admin123)
-- Password hash generated with bcrypt, rounds=10
INSERT INTO users (username, password_hash, role) VALUES
  ('admin', '$2b$10$X7VB.bJQl3B7qKl0qYmzTOqYTxZjHvYYyR1F7F4LRJZFqGJPkZQ2m', 'Admin');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_scope ON transactions(scope);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
