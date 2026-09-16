// ========== /api/culture ==========
// GET    : 列表（按年份 DESC）
// POST   : 新增
// PUT    : 按 id 更新
// DELETE : 按 ?id=N
import { getDB, ensureSchema } from '../lib/db.js';
import { ok, fail, readJson } from './_helpers.js';

const COLS = ['title', 'author', 'year', 'image_url', 'description', 'type', 'link_url'];

async function ensureTable() {
  const db = getDB();
  await db.execute(`CREATE TABLE IF NOT EXISTS culture (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT,
    year INTEGER,
    image_url TEXT,
    description TEXT,
    type TEXT,                                   -- interview / book / script
    link_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}

export async function GET(request) {
  try {
    await ensureSchema();
    await ensureTable();
    const db = getDB();
    const id = new URL(request.url).searchParams.get('id');
    if (id) {
      const r = await db.execute({ sql: 'SELECT * FROM culture WHERE id = ?', args: [Number(id)] });
      return ok(r.rows[0] || null);
    }
    const r = await db.execute('SELECT * FROM culture ORDER BY year DESC, id DESC');
    return ok(r.rows);
  } catch (e) { return fail(e.message, 500); }
}

export async function POST(request) {
  const body = await readJson(request);
  if (!body) return fail('请求体不是合法 JSON');
  if (!body.title) return fail('缺少必填字段 (title)');
  try {
    await ensureSchema();
    await ensureTable();
    const db = getDB();
    const r = await db.execute({
      sql: `INSERT INTO culture (${COLS.join(', ')}) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        body.title,
        body.author || null,
        body.year ? Number(body.year) : null,
        body.image_url || null,
        body.description || '',
        body.type || null,
        body.link_url || null
      ]
    });
    return ok({ id: Number(r.lastInsertRowid) });
  } catch (e) { return fail(e.message, 500); }
}

export async function PUT(request) {
  const body = await readJson(request);
  if (!body || !body.id) return fail('缺少 id');
  try {
    await ensureSchema();
    await ensureTable();
    const db = getDB();
    const set = COLS.map(c => `${c} = ?`).join(', ');
    const args = COLS.map(c => {
      if (c === 'year') return body[c] ? Number(body[c]) : null;
      return body[c] ?? null;
    });
    args.push(Number(body.id));
    await db.execute({ sql: `UPDATE culture SET ${set} WHERE id = ?`, args });
    return ok({ id: Number(body.id) });
  } catch (e) { return fail(e.message, 500); }
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('缺少 id');
  try {
    await ensureSchema();
    await ensureTable();
    const db = getDB();
    await db.execute({ sql: 'DELETE FROM culture WHERE id = ?', args: [Number(id)] });
    return ok({ id: Number(id) });
  } catch (e) { return fail(e.message, 500); }
}