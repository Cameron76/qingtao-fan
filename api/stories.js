// ========== /api/stories ==========
import { getDB, ensureSchema, seedIfEmpty } from '../lib/db.js';
import { ok, fail, readJson } from './_helpers.js';

const COLS = ['image_url', 'title'];

export async function GET() {
  try {
    await ensureSchema();
    await seedIfEmpty();
    const db = getDB();
    const r = await db.execute('SELECT * FROM stories ORDER BY id DESC');
    return ok(r.rows);
  } catch (e) { return fail(e.message, 500); }
}

export async function POST(request) {
  const body = await readJson(request);
  if (!body) return fail('请求体不是合法 JSON');
  const { image_url, title } = body;
  if (!image_url) return fail('缺少 image_url');
  try {
    await ensureSchema();
    const db = getDB();
    const r = await db.execute({
      sql: `INSERT INTO stories (${COLS.join(', ')}) VALUES (?, ?)`,
      args: [image_url, title || '']
    });
    return ok({ id: Number(r.lastInsertRowid) });
  } catch (e) { return fail(e.message, 500); }
}

export async function PUT(request) {
  const body = await readJson(request);
  if (!body || !body.id) return fail('缺少 id');
  const { image_url, title } = body;
  try {
    const db = getDB();
    await db.execute({
      sql: 'UPDATE stories SET image_url = ?, title = ? WHERE id = ?',
      args: [image_url || '', title || '', Number(body.id)]
    });
    return ok({ id: Number(body.id) });
  } catch (e) { return fail(e.message, 500); }
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('缺少 id');
  try {
    const db = getDB();
    await db.execute({ sql: 'DELETE FROM stories WHERE id = ?', args: [Number(id)] });
    return ok({ id: Number(id) });
  } catch (e) { return fail(e.message, 500); }
}