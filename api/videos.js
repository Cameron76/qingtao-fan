// ========== /api/videos ==========
import { getDB, ensureSchema, seedIfEmpty } from '../lib/db.js';
import { ok, fail, readJson } from './_helpers.js';

const COLS = ['title', 'duration', 'year', 'thumb_url', 'video_url'];

export async function GET() {
  try {
    await ensureSchema();
    await seedIfEmpty();
    const db = getDB();
    const r = await db.execute('SELECT * FROM videos ORDER BY year DESC, id DESC');
    return ok(r.rows);
  } catch (e) { return fail(e.message, 500); }
}

export async function POST(request) {
  const body = await readJson(request);
  if (!body) return fail('请求体不是合法 JSON');
  const { title, duration, year, thumb_url, video_url } = body;
  if (!title) return fail('缺少 title');
  try {
    await ensureSchema();
    const db = getDB();
    const r = await db.execute({
      sql: `INSERT INTO videos (${COLS.join(', ')}) VALUES (?, ?, ?, ?, ?)`,
      args: [title, duration || null, year ? Number(year) : null, thumb_url || null, video_url || null]
    });
    return ok({ id: Number(r.lastInsertRowid) });
  } catch (e) { return fail(e.message, 500); }
}

export async function PUT(request) {
  const body = await readJson(request);
  if (!body || !body.id) return fail('缺少 id');
  const { title, duration, year, thumb_url, video_url } = body;
  try {
    const db = getDB();
    await db.execute({
      sql: 'UPDATE videos SET title = ?, duration = ?, year = ?, thumb_url = ?, video_url = ? WHERE id = ?',
      args: [title || '', duration || null, year ? Number(year) : null, thumb_url || null, video_url || null, Number(body.id)]
    });
    return ok({ id: Number(body.id) });
  } catch (e) { return fail(e.message, 500); }
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('缺少 id');
  try {
    const db = getDB();
    await db.execute({ sql: 'DELETE FROM videos WHERE id = ?', args: [Number(id)] });
    return ok({ id: Number(id) });
  } catch (e) { return fail(e.message, 500); }
}