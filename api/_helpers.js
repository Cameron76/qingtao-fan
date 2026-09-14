// ========== API 通用辅助函数 ==========

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(init.headers || {})
    }
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function ok(data)     { return json({ ok: true,  data }); }
export function created(id)  { return json({ ok: true,  id }, { status: 201 }); }
export function fail(msg, status = 400) {
  return json({ ok: false, error: msg }, { status });
}