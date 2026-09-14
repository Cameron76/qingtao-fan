// ========== /api/guestbook ==========
// GET  : 拉取最近 50 条留言（按 id 倒序）
// POST : 提交留言
import { getDB, ensureSchema, seedIfEmpty } from '../lib/db.js';
import { ok, fail, readJson } from './_helpers.js';

export async function GET() {
  try {
    await ensureSchema();
    await seedIfEmpty();
    const db = getDB();
    const r = await db.execute(
      'SELECT id, name, message, created_at FROM guestbook ORDER BY id DESC LIMIT 50'
    );
    return ok(r.rows);
  } catch (e) {
    return fail(e.message, 500);
  }
}

export async function POST(request) {
  const body = await readJson(request);
  if (!body) return fail('请求体不是合法 JSON');
  const { name, message } = body;
  if (!name || !message) return fail('昵称与留言均不可为空');
  try {
    await ensureSchema();
    const db = getDB();
    const r = await db.execute({
      sql: 'INSERT INTO guestbook (name, message) VALUES (?, ?)',
      args: [String(name).slice(0, 32), String(message).slice(0, 500)]
    });
    return ok({ id: Number(r.lastInsertRowid) });
  } catch (e) {
    return fail(e.message, 500);
  }
}