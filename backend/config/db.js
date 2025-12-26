const Database = require('better-sqlite3');
const path = require('path');

let db = null;

const connectDB = () => {
  try {
    const dbPath = path.join(__dirname, '..', 'database.sqlite');
    db = new Database(dbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT,
        name TEXT NOT NULL,
        googleId TEXT,
        avatar TEXT,
        isAdmin INTEGER DEFAULT 0,
        isVerified INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS downloads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        videoTitle TEXT,
        videoUrl TEXT,
        format TEXT,
        quality TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_downloads_userId ON downloads(userId);
    `);

    // Add columns if they don't exist (for existing databases)
    const columns = db.prepare("PRAGMA table_info(users)").all();
    const hasGoogleId = columns.some(c => c.name === 'googleId');
    const hasAvatar = columns.some(c => c.name === 'avatar');

    if (!hasGoogleId) {
      db.exec("ALTER TABLE users ADD COLUMN googleId TEXT;");
    }
    if (!hasAvatar) {
      db.exec("ALTER TABLE users ADD COLUMN avatar TEXT;");
    }

    console.log('✅ SQLite database initialized successfully');
    console.log(`📁 Database location: ${dbPath}`);

    return db;
  } catch (error) {
    console.error('❌ SQLite initialization failed:', error.message);
    process.exit(1);
  }
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
};

module.exports = { connectDB, getDB };
