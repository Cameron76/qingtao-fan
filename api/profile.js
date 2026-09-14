// ========== /api/profile ==========
// GET   : 读取 profile 表所有记录（tao / qing）
// POST  : 新增或更新（按 author_key UPSERT）
import { getDB, ensureSchema, seedIfEmpty } from '../lib/db.js';
import { ok, fail, readJson } from './_helpers.js';

export async function GET() {
  try {
    await ensureSchema();
    await seedIfEmpty();
    const db = getDB();
    const r = await db.execute('SELECT * FROM profile ORDER BY id ASC');
    return ok(r.rows);
  } catch (e) {
    return fail(e.message, 500);
  }
}

export async function POST(request) {
  const body = await readJson(request);
  if (!body) return fail('请求体不是合法 JSON');
  const { author_key, photo_url, text_content } = body;
  if (!author_key) return fail('缺少 author_key');
  try {
    await ensureSchema();
    const db = getDB();
    await db.execute({
      sql: `INSERT INTO profile (author_key, photo_url, text_content)
            VALUES (?, ?, ?)
            ON CONFLICT(author_key) DO UPDATE SET
              photo_url    = excluded.photo_url,
              text_content = excluded.text_content`,
      args: [author_key, photo_url || null, text_content || '']
    });
    return ok({ author_key });
  } catch (e) {
    return fail(e.message, 500);
  }
}