// ========== /api/works ==========
// GET    : 列表（按年份新→旧）
// POST   : 新增
// PUT    : 按 id 更新（body 含 id）
// DELETE : 按 ?id=N 删除
import { getDB, ensureSchema, seedIfEmpty } from '../lib/db.js';
import { ok, fail, readJson } from './_helpers.js';

const COLS = ['author', 'cat', 'year', 'title', 'cover_url'];

export async function GET() {
  try {
    await ensureSchema();
    await seedIfEmpty();
    const db = getDB();
    const r = await db.execute(
      'SELECT * FROM works ORDER BY year DESC, id DESC'
    );
    return ok(r.rows);
  } catch (e) { return fail(e.message, 500); }
}

export async function POST(request) {
  const body = await readJson(request);
  if (!body) return fail('请求体不是合法 JSON');
  const rec = pick(body, COLS);
  if (!rec.author || !rec.cat || !rec.year || !rec.title) {
    return fail('缺少必填字段 (author / cat / year / title)');
  }
  try {
    await ensureSchema();
    const db = getDB();
    const r = await db.execute({
      sql: `INSERT INTO works (${COLS.join(', ')}) VALUES (?, ?, ?, ?, ?)`,
      args: [rec.author, rec.cat, Number(rec.year), rec.title, rec.cover_url || null]
    });
    return ok({ id: Number(r.lastInsertRowid) });
  } catch (e) { return fail(e.message, 500); }
}

export async function PUT(request) {
  const body = await readJson(request);
  if (!body || !body.id) return fail('缺少 id');
  const rec = pick(body, COLS);
  try {
    const db = getDB();
    const set = COLS.map(c => `${c} = ?`).join(', ');
    const args = COLS.map(c => c === 'year' ? Number(rec[c] || 0) : (rec[c] ?? null));
    args.push(Number(body.id));
    await db.execute({ sql: `UPDATE works SET ${set} WHERE id = ?`, args });
    return ok({ id: Number(body.id) });
  } catch (e) { return fail(e.message, 500); }
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('缺少 id');
  try {
    const db = getDB();
    await db.execute({ sql: 'DELETE FROM works WHERE id = ?', args: [Number(id)] });
    return ok({ id: Number(id) });
  } catch (e) { return fail(e.message, 500); }
}

function pick(obj, keys) {
  const o = {};
  for (const k of keys) o[k] = obj[k];
  return o;
}