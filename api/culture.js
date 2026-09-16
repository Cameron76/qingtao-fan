// /api/culture  ─  CULTURE 熏陶（只读展示）
import { getDB, ensureSchema } from '../lib/db.js';
import { ok, fail } from './_helpers.js';

export async function GET() {
  try {
    await ensureSchema();
    const db = getDB();
    await db.execute(`CREATE TABLE IF NOT EXISTS culture (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT,
      year INTEGER,
      image_url TEXT,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    const r = await db.execute('SELECT * FROM culture ORDER BY year DESC, id DESC');
    return ok(r.rows);
  } catch (e) { return fail(e.message, 500); }
}