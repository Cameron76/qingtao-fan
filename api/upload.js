// ========== /api/upload ==========
// POST : multipart/form-data 上传文件，返回公网 HTTP/HTTPS URL
//   走哪家由 IMAGE_PROVIDER 环境变量决定：
//     - 'vercel-blob'（默认）：Vercel Blob  →  https://<id>.public.blob.vercel-storage.com/...
//     - 'cloudinary'      ：Cloudinary    →  https://res.cloudinary.com/<cloud>/image/upload/v.../...
//     - 'imgbb'           ：ImgBB          →  https://i.ibb.co/...
//     - 不配置或 fallback 时：base64 入 Turso（仅本地调试，返回 /api/upload?id=N）
// GET  : ?id=N 取回二进制（仅 base64 模式下相关）
import { getDB, ensureSchema } from '../lib/db.js';
import { ok, fail } from './_helpers.js';

const MAX_BASE64 = 4 * 1024 * 1024;     // 4 MB，避开 Serverless 4.5MB 限制
const ALLOWED    = /^image\/(png|jpe?g|gif|webp|svg\+xml|bmp|avif)$|^video\//;

// ---------- Vercel Blob ----------
async function uploadVercelBlob(file, buf) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('已设置 IMAGE_PROVIDER=vercel-blob，但缺少 BLOB_READ_WRITE_TOKEN');
  }
  const { put } = await import('@vercel/blob');
  const blob = await put(file.name || `upload-${Date.now()}`, buf, {
    access: 'public',
    contentType: file.type || 'application/octet-stream',
    token: process.env.BLOB_READ_WRITE_TOKEN
  });
  return { url: blob.url, store: 'vercel-blob' };
}

// ---------- Cloudinary ----------
async function uploadCloudinary(file, buf) {
  const cloud  = process.env.CLOUDINARY_CLOUD_NAME;
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET; // 推荐用 unsigned preset
  if (!cloud || !preset) {
    throw new Error('Cloudinary 未配置：CLOUDINARY_CLOUD_NAME / CLOUDINARY_UPLOAD_PRESET');
  }
  const fd = new FormData();
  fd.append('file', `data:${file.type};base64,${buf.toString('base64')}`);
  fd.append('upload_preset', preset);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST', body: fd
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Cloudinary 上传失败');
  return { url: j.secure_url, store: 'cloudinary' };
}

// ---------- ImgBB ----------
async function uploadImgBB(file, buf) {
  const key = process.env.IMGBB_API_KEY;
  if (!key) throw new Error('ImgBB 未配置：IMGBB_API_KEY');
  const fd = new FormData();
  fd.append('image', buf.toString('base64'));
  if (file.name) fd.append('name', file.name);
  const r = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, {
    method: 'POST', body: fd
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(j.error?.message || 'ImgBB 上传失败');
  return { url: j.data.url, store: 'imgbb' };
}

// ---------- POST ----------
export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') return fail('未提供 file 字段');
    if (!ALLOWED.test(file.type || '')) {
      return fail('仅支持 image/* 与 video/* 类型');
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const provider = (process.env.IMAGE_PROVIDER || 'vercel-blob').toLowerCase();

    if (provider === 'cloudinary') {
      const out = await uploadCloudinary(file, buf);
      return ok({ ...out, size: buf.length, mime: file.type });
    }
    if (provider === 'imgbb') {
      const out = await uploadImgBB(file, buf);
      return ok({ ...out, size: buf.length, mime: file.type });
    }
    if (provider === 'vercel-blob' || (provider === '' && process.env.BLOB_READ_WRITE_TOKEN)) {
      try {
        const out = await uploadVercelBlob(file, buf);
        return ok({ ...out, size: buf.length, mime: file.type });
      } catch (e) {
        // 没有 Blob token → 自动降级到 base64
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          // 继续往下走 base64 分支
        } else {
          throw e;
        }
      }
    }

    // ---------- base64 兜底（仅本地/无图床时）----------
    if (buf.length > MAX_BASE64) {
      return fail('文件超过 4MB 上限，请配置 IMAGE_PROVIDER 走真图床');
    }
    await ensureSchema();
    const db = getDB();
    const r = await db.execute({
      sql: 'INSERT INTO uploads (filename, mime, data) VALUES (?, ?, ?)',
      args: [file.name || 'upload', file.type || 'application/octet-stream', buf.toString('base64')]
    });
    const id = Number(r.lastInsertRowid);
    return ok({
      url: `/api/upload?id=${id}`,
      id, size: buf.length, store: 'base64',
      warning: '使用 base64 兜底；生产请配置 IMAGE_PROVIDER'
    });
  } catch (e) {
    return fail(e.message, 500);
  }
}

// ---------- GET（仅 base64 模式使用）----------
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