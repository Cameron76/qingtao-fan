// ========== /api/updates ==========
// GET    : 列表（按日期 DESC）
// POST   : 新增
// PUT    : 按 id 更新
// DELETE : 按 ?id=N
import { getDB, ensureSchema, seedIfEmpty } from '../lib/db.js';
import { ok, fail, readJson } from './_helpers.js';

const COLS = ['date', 'title', 'content'];

export async function GET() {
  try {
    await ensureSchema();
    await seedIfEmpty();
    const db = getDB();
    const r = await db.execute('SELECT * FROM updates ORDER BY date DESC, id DESC');
    return ok(r.rows);
  } catch (e) { return fail(e.message, 500); }
}

export async function POST(request) {
  const body = await readJson(request);
  if (!body) return fail('请求体不是合法 JSON');
  const { date, title, content } = body;
  if (!date || !title) return fail('缺少必填字段 (date / title)');
  try {
    await ensureSchema();
    const db = getDB();
    const r = await db.execute({
      sql: `INSERT INTO updates (${COLS.join(', ')}) VALUES (?, ?, ?)`,
      args: [date, title, content || '']
    });
    return ok({ id: Number(r.lastInsertRowid) });
  } catch (e) { return fail(e.message, 500); }
}

export async function PUT(request) {
  const body = await readJson(request);
  if (!body || !body.id) return fail('缺少 id');
  const { date, title, content } = body;
  try {
    const db = getDB();
    await db.execute({
      sql: 'UPDATE updates SET date = ?, title = ?, content = ? WHERE id = ?',
      args: [date || '', title || '', content || '', Number(body.id)]
    });
    return ok({ id: Number(body.id) });
  } catch (e) { return fail(e.message, 500); }
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('缺少 id');
  try {
    const db = getDB();
    await db.execute({ sql: 'DELETE FROM updates WHERE id = ?', args: [Number(id)] });
    return ok({ id: Number(id) });
  } catch (e) { return fail(e.message, 500); }
}