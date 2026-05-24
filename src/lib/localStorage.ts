import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDB = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('krishna_nagar_fare.db');
    
    // Initialize tables
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS local_config (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE TABLE IF NOT EXISTS pending_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT,
        data TEXT,
        action TEXT, -- 'INSERT', 'UPDATE'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  return db;
};

export const saveLocalConfig = async (key: string, value: any) => {
  const database = await getDB();
  await database.runAsync(
    'INSERT OR REPLACE INTO local_config (key, value) VALUES (?, ?)',
    [key, JSON.stringify(value)]
  );
};

export const getLocalConfig = async (key: string, defaultValue: any) => {
  const database = await getDB();
  const result = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM local_config WHERE key = ?',
    [key]
  );
  return result ? JSON.parse(result.value) : defaultValue;
};

export const queueSync = async (tableName: string, action: string, data: any) => {
  const database = await getDB();
  await database.runAsync(
    'INSERT INTO pending_sync (table_name, action, data) VALUES (?, ?, ?)',
    [tableName, action, JSON.stringify(data)]
  );
};
