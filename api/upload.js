// ========== /api/upload ==========
// POST : multipart/form-data 上传文件
//        优先走 Vercel Blob（设置 BLOB_READ_WRITE_TOKEN 后启用）；
//        否则回落为 base64 存入 Turso，返回 /api/upload?id=N
// GET  : ?id=N 取回二进制（供 <img src> 使用，仅 base64 模式下相关）
import { getDB, ensureSchema } from '../lib/db.js';
import { ok, fail } from './_helpers.js';

const MAX_BASE64 = 4 * 1024 * 1024;     // 4 MB，避开 Serverless 4.5MB 限制
const ALLOWED    = /^image\/(png|jpe?g|gif|webp|svg\+xml|bmp|avif)$|^video\//;

export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') return fail('未提供 file 字段');
    if (!ALLOWED.test(file.type || '')) {
      return fail('仅支持 image/* 与 video/* 类型');
    }
    const buf = Buffer.from(await file.arrayBuffer());

    // 路径 A：Vercel Blob（推荐，部署到 Vercel 时自动启用）
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import('@vercel/blob');
      const blob = await put(file.name || `upload-${Date.now()}`, buf, {
        access: 'public',
        contentType: file.type || 'application/octet-stream',
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      return ok({ url: blob.url, size: buf.length, store: 'vercel-blob' });
    }

    // 路径 B：base64 入库（本地 / 无 Blob token 时）
    if (buf.length > MAX_BASE64) {
      return fail('文件超过 4MB 上限，请配置 BLOB_READ_WRITE_TOKEN 走 Vercel Blob');
    }
    const b64 = buf.toString('base64');
    await ensureSchema();
    const db = getDB();
    const r = await db.execute({
      sql: 'INSERT INTO uploads (filename, mime, data) VALUES (?, ?, ?)',
      args: [file.name || 'upload', file.type || 'application/octet-stream', b64]
    });
    const id = Number(r.lastInsertRowid);
    return ok({ url: `/api/upload?id=${id}`, id, size: buf.length, store: 'base64' });
  } catch (e) {
    return fail(e.message, 500);
  }
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return fail('缺少 id 参数');
    const db = getDB();
    const r = await db.execute({
      sql: 'SELECT * FROM uploads WHERE id = ?',
      args: [Number(id)]
    });
    if (r.rows.length === 0) return new Response('Not Found', { status: 404 });
    const u = r.rows[0];
    const buf = Buffer.from(u.data, 'base64');
    return new Response(buf, {
      headers: {
        'Content-Type': u.mime,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}