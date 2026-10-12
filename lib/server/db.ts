import { mkdirSync } from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"

const globalForDb = globalThis as unknown as { keelDb?: DatabaseSync }

export function dataDir() {
  return process.env.KEEL_DATA_DIR ?? path.join(process.cwd(), "data")
}

export function getDb() {
  if (globalForDb.keelDb) return globalForDb.keelDb
  const root = dataDir()
  mkdirSync(root, { recursive: true })
  const db = new DatabaseSync(path.join(root, "keel.db"))
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS memberships (
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      PRIMARY KEY (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS memberships_user ON memberships(user_id);
  `)
  globalForDb.keelDb = db
  return db
}

export function transaction<T>(run: () => T): T {
  const db = getDb()
  db.exec("BEGIN IMMEDIATE")
  try {
    const result = run()
    db.exec("COMMIT")
    return result
  } catch (error) {
    try {
      db.exec("ROLLBACK")
    } catch {
      // The transaction is already closed when the statement failed.
    }
    throw error
  }
}
