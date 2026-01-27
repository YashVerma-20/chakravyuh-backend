const Database = require('better-sqlite3');
const path = require('path');

// Create SQLite database
const db = new Database(path.join(__dirname, '../chakravyuh.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Query wrapper to match pg interface
const query = (text, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      // Convert PostgreSQL placeholders ($1, $2) to SQLite (?, ?)
      const sqliteQuery = text.replace(/\$\d+/g, '?');
      const sqliteStmt = db.prepare(sqliteQuery);

      if (text.trim().toUpperCase().startsWith('SELECT')) {
        const rows = sqliteStmt.all(...params);
        resolve({ rows });
      } else {
        const info = sqliteStmt.run(...params);
        resolve({ rows: [], rowCount: info.changes, lastID: info.lastInsertRowid });
      }
    } catch (error) {
      console.error('Database query error:', error);
      reject(error);
    }
  });
};

console.log('✅ Connected to SQLite database');

module.exports = {
  query,
  db
};
