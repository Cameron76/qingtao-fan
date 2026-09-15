// ============================================================
//  卿涛 · Qing Tao  ─  前端主脚本
//  - Tab 切换 / 导航 / 留言板
//  - 从 Turso API 拉取作品 / 视频 / 动态 / 考古 / 个人简介并渲染
//  - 编辑模式下：每张卡显示 ✏️ / 🗑️，底部 + 添加
//  - 图片上传走 /api/upload（Vercel Blob 优先，base64 回落）
// ============================================================

// ========== Tab 切换 ==========
const tabs = document.querySelectorAll('.tab');
const pages = document.querySelectorAll('.page');
function switchTab(tabName) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  pages.forEach(p => p.classList.toggle('active', p.id === tabName));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.querySelector('.tabs')?.classList.remove('open');
  history.replaceState(null, '', '#' + tabName);
}
tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
document.querySelector('.brand').addEventListener('click', e => {
  e.preventDefault();
  switchTab('home');
});
switchTab(location.hash.replace('#', '') || 'home');

// ========== 导航栏滚动阴影 ==========
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 20);
});

// ========== 移动端菜单 ==========
document.getElementById('menuBtn').addEventListener('click', () => {
  document.querySelector('.tabs').classList.toggle('open');
});

// ============================================================
//  API 客户端
// ============================================================
async function api(method, url, body) {
  const opt = { method, headers: {} };
  if (body instanceof FormData) { opt.body = body; }
  else if (body) {
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(body);
  }
  const res = await fetch(url, opt);
  let j = null;
  try { j = await res.json(); } catch { /* 非 JSON */ }
  if (!res.ok || (j && j.ok === false)) {
    throw new Error((j && j.error) || `HTTP ${res.status}`);
  }
  return j || { ok: true };
}
const API = {
  list:    (kind)             => api('GET',    `/api/${kind}`),
  create:  (kind, data)       => api('POST',   `/api/${kind}`, data),
  update:  (kind, id, data)   => api('PUT',    `/api/${kind}`, { ...data, id }),
  remove:  (kind, id)         => api('DELETE', `/api/${kind}?id=${id}`),
  upload:  (file)             => {
    const fd = new FormData();
    fd.append('file', file);
    return api('POST', '/api/upload', fd);
  }
};

// ============================================================
//  工具
// ============================================================
function esc(s = '') {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function el(tag, props = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class')       n.className = v;
    else if (k === 'html')   n.innerHTML = v;
    else if (k === 'on')     for (const [evt, fn] of Object.entries(v)) n.addEventListener(evt, fn);
    else if (k === 'data')   for (const [dk, dv] of Object.entries(v)) n.dataset[dk] = dv;
    else                     n.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return n;
}
function placeholderBg(seed = 0) {
  const palettes = [
    'linear-gradient(135deg,#45978C,#89CFC4)',
    'linear-gradient(135deg,#F0E9CC,#F9F4DC)',
    'linear-gradient(135deg,#89CFC4,#45978C)',
    'linear-gradient(135deg,#2D6E65,#1A4A44)',
    'linear-gradient(135deg,#6BB5AA,#F0E9CC)',
    'linear-gradient(135deg,#45978C,#2D6E65)'
  ];
  return palettes[Math.abs(seed) % palettes.length];
}

// ============================================================
//  渲染：作品
// ============================================================
async function renderWorks() {
  const left  = document.getElementById('worksColLeft');
  const right = document.getElementById('worksColRight');
  if (!left || !right) return;
  left.innerHTML = ''; right.innerHTML = '';

  let rows = [];
  try { ({ data: rows } = await API.list('works')); }
  catch (e) { console.warn('拉取作品失败:', e); return; }

  rows.forEach(w => {
    const card = el('div', {
      class: 'work-card',
      data:  { id: w.id, cat: w.cat, author: w.author, year: w.year }
    });
    const cover = el('div', { class: 'work-cover' });
    if (w.cover_url) cover.style.backgroundImage = `url(${esc(w.cover_url)})`;
    else             cover.style.background = placeholderBg(w.id);
    const body = el('div', { class: 'work-body' }, [
      el('p', { class: 'work-type' }, w.cat_label || catLabel(w.cat)),
      el('h4', {}, w.title || ''),
      el('p', { class: 'work-date' }, String(w.year || ''))
    ]);
    card.append(cover, body);
    addItemControls(card, w, 'works');
    (w.author === 'qing' ? right : left).appendChild(card);
  });
}
function catLabel(c) {
  return ({ host: '主持', produce: '制作', judge: '评委', music: '音乐' })[c] || c;
}

// ============================================================
//  渲染：考古（STORY）
// ============================================================
async function renderStories() {
  const box = document.getElementById('storyGrid');
  if (!box) return;
  box.innerHTML = '';
  let rows = [];
  try { ({ data: rows } = await API.list('stories')); }
  catch (e) { console.warn('拉取考古失败:', e); return; }
  rows.forEach(s => {
    const card = el('div', { class: 'm-item', data: { id: s.id } });
    if (s.image_url) card.style.backgroundImage = `url(${esc(s.image_url)})`;
    else             card.style.background = placeholderBg(s.id);
    card.append(el('span', {}, s.title || s.id));
    addItemControls(card, s, 'story');
    box.appendChild(card);
  });
}

// ============================================================
//  渲染：视频
// ============================================================
async function renderVideos() {
  const box = document.getElementById('videoGrid');
  if (!box) return;
  box.innerHTML = '';
  let rows = [];
  try { ({ data: rows } = await API.list('videos')); }
  catch (e) { console.warn('拉取视频失败:', e); return; }
  rows.forEach(v => {
    const card = el('div', { class: 'video-card', data: { id: v.id } });
    const thumb = el('div', { class: 'video-thumb' });
    if (v.thumb_url) thumb.style.backgroundImage = `url(${esc(v.thumb_url)})`;
    else             thumb.style.background = placeholderBg(v.id);
    thumb.append(el('div', { class: 'play-btn' }));
    card.append(
      thumb,
      el('h4', {}, v.title || ''),
      el('p', {}, [v.year, v.duration].filter(Boolean).join(' · '))
    );
    addItemControls(card, v, 'video');
    box.appendChild(card);
  });
}

// ============================================================
//  渲染：动态（NEWS）
// ============================================================
async function renderUpdates() {
  const box = document.getElementById('updatesList');
  if (!box) return;
  box.innerHTML = '';
  let rows = [];
  try { ({ data: rows } = await API.list('updates')); }
  catch (e) { console.warn('拉取动态失败:', e); return; }
  rows.forEach(u => {
    const item = el('div', { class: 't-item', data: { id: u.id } });
    item.append(
      el('div', { class: 't-dot' }),
      el('div', { class: 't-card glass-card' }, [
        el('span', { class: 't-date' }, u.date || ''),
        el('h4', {}, u.title || ''),
        el('p',  {}, u.content || '')
      ])
    );
    addItemControls(item, u, 'update');
    box.appendChild(item);
  });
}

// ============================================================
//  渲染：个人简介（PROFILE）
// ============================================================
async function renderProfile() {
  let rows = [];
  try { ({ data: rows } = await API.list('profile')); }
  catch (e) { console.warn('拉取 profile 失败:', e); return; }
  rows.forEach(p => {
    const card = document.querySelector(`.profile-card[data-profile="${p.author_key}"]`);
    if (!card) return;
    const photo = card.querySelector('[data-profile-photo]');
    if (photo) {
      if (p.photo_url) {
        photo.style.backgroundImage = `url(${p.photo_url})`;
        photo.style.backgroundSize = 'cover';
        photo.style.backgroundPosition = 'center';
        photo.innerHTML = '';
      }
    }
    // 名字存在 text_content 字段里（周涛/董卿）
    if (p.text_content && (p.author_key === 'tao' || p.author_key === 'qing')) {
      const tagEl = card.querySelector('.profile-tag b');
      if (tagEl) tagEl.innerHTML = p.text_content.split('').join('&nbsp;');
    }
    // 中间文字（author_key='middle'）
    if (p.author_key === 'middle') {
      const mid = document.querySelector('.profile-middle');
      if (mid && p.text_content) mid.textContent = p.text_content;
    }
  });
  addProfileControls();
}

// ============================================================
//  个人简介编辑控件（两张卡片 + 中间区，仅 editing 模式下可见）
// ============================================================
function addProfileControls() {
  document.querySelectorAll('.profile-card').forEach(card => {
    if (card.querySelector('.item-ctrl')) return;
    const key = card.dataset.profile; // 'tao' | 'qing'
    card.appendChild(el('div', { class: 'item-ctrl' }, [
      el('button', { class: 'ic-btn edit', title: '编辑',
        on: { click: () => openProfileForm(card, key) } }, '✎')
    ]));
  });
  const middle = document.querySelector('.profile-middle');
  if (middle && !middle.querySelector('.item-ctrl')) {
    middle.appendChild(el('div', { class: 'item-ctrl' }, [
      el('button', { class: 'ic-btn edit', title: '编辑',
        on: { click: () => openProfileForm(middle, 'middle') } }, '✎')
    ]));
  }
}

async function openProfileForm(host, kind) {
  document.querySelectorAll('.inline-form').forEach(f => f.remove());

  const form = el('div', { class: 'inline-form profile-form' });

  if (kind === 'tao' || kind === 'qing') {
    // ====== 卡片：上传图片 + 改名字 ======
    let photoUrl = '';
    const photoEl = host.querySelector('[data-profile-photo]');
    if (photoEl && photoEl.style.backgroundImage) {
      const m = photoEl.style.backgroundImage.match(/url\(["']?(.+?)["']?\)/);
      if (m) photoUrl = m[1];
    }

    const preview = el('img', { class: 'if-preview', src: photoUrl || '' });
    const urlInput = el('input', { type: 'text', value: photoUrl, placeholder: '图片 URL' });
    urlInput.addEventListener('input', () => { preview.src = urlInput.value; });

    const file = el('input', { type: 'file', accept: 'image/*', class: 'if-file' });
    file.addEventListener('change', async () => {
      if (!file.files[0]) return;
      try {
        const j = await API.upload(file.files[0]);
        urlInput.value = j.data.url;
        preview.src = j.data.url;
      } catch (e) { alert('上传失败：' + e.message); }
    });

    // 名字（左周涛 / 右董卿）当前直接写在 HTML 里，这里把名字也存到 text_content 字段
    const tagEl = host.querySelector('.profile-tag b');
    const curName = tagEl ? tagEl.textContent.replace(/\s+/g, '') : '';
    const nameInput = el('input', { type: 'text', value: curName, placeholder: '名字' });

    form.append(
      el('label', { class: 'if-row' }, [el('span', {}, '图片'), preview]),
      el('label', { class: 'if-row' }, [el('span', {}, '上传/粘贴'), urlInput]),
      el('label', { class: 'if-row' }, [el('span', {}, '文件'), file]),
      el('label', { class: 'if-row' }, [el('span', {}, '名字'), nameInput]),
    );

    const save = el('button', { class: 'ic-btn save' }, '保存');
    const cancel = el('button', { class: 'ic-btn cancel' }, '取消');
    cancel.addEventListener('click', () => form.remove());
    save.addEventListener('click', async () => {
      save.disabled = true; save.textContent = '保存中…';
      try {
        await API.create('profile', {
          author_key: kind,
          photo_url: urlInput.value || null,
          text_content: nameInput.value || ''
        });
        form.remove();
        await renderProfile();
      } catch (e) { alert('保存失败：' + e.message); save.disabled = false; save.textContent = '保存'; }
    });

    form.append(el('div', { class: 'if-actions' }, [save, cancel]));
  } else {
    // ====== 中间区：多行文本 ======
    const ta = el('textarea', { class: 'if-textarea', rows: '6', placeholder: '在这里写一段介绍…' });
    ta.value = host.textContent.trim();

    const save = el('button', { class: 'ic-btn save' }, '保存');
    const cancel = el('button', { class: 'ic-btn cancel' }, '取消');
    cancel.addEventListener('click', () => form.remove());
    save.addEventListener('click', async () => {
      save.disabled = true; save.textContent = '保存中…';
      try {
        // 中间文字复用 author_key='middle'，前端渲染时单独处理
        await API.create('profile', {
          author_key: 'middle',
          text_content: ta.value
        });
        host.textContent = ta.value;
        form.remove();
      } catch (e) { alert('保存失败：' + e.message); save.disabled = false; save.textContent = '保存'; }
    });

    form.append(
      el('label', { class: 'if-row' }, [el('span', {}, '中间文字'), ta]),
      el('div', { class: 'if-actions' }, [save, cancel])
    );
  }

  host.appendChild(form);
}

// ============================================================
//  编辑控件：每张卡片的 ✏️ / 🗑️（仅 editing 模式下可见）
//  + 底部 + 添加按钮（editing 模式下显示）
// ============================================================
const FORM_FIELDS = {
  works:   [['author', '作者 tao|qing'], ['cat', '分类 host|produce|judge|music'], ['year', '年份'], ['title', '标题'], ['cover_url', '封面 URL']],
  story:   [['image_url', '图片 URL（必填）'], ['title', '标题']],
  video:   [['title', '标题'], ['duration', '时长 04:32'], ['year', '年份'], ['thumb_url', '缩略图 URL'], ['video_url', '视频 URL']],
  update:  [['date', '日期 2025 · 09 · 01'], ['title', '标题'], ['content', '内容']]
};

function addItemControls(card, record, kind) {
  const bar = el('div', { class: 'item-ctrl' }, [
    el('button', { class: 'ic-btn edit',  title: '编辑', on: { click: () => openForm(card, record, kind) } }, '✎'),
    el('button', { class: 'ic-btn del',   title: '删除', on: { click: () => onDelete(card, record, kind) } }, '✕')
  ]);
  card.appendChild(bar);
}

function openForm(card, record, kind, isNew = false) {
  // 折叠已有表单
  document.querySelectorAll('.inline-form').forEach(f => f.remove());

  const form = el('div', { class: 'inline-form' });
  const fields = FORM_FIELDS[kind];
  fields.forEach(([k, label]) => {
    const v = record ? (record[k] || '') : '';
    if (k.endsWith('_url')) {
      const wrap = el('label', { class: 'if-row' });
      wrap.append(el('span', {}, label));
      const preview = el('img', { class: 'if-preview' });
      if (v) preview.src = v;
      const file = el('input', { type: 'file', accept: 'image/*', class: 'if-file' });
      file.addEventListener('change', async () => {
        if (!file.files[0]) return;
        try {
          const j = await API.upload(file.files[0]);
          urlInput.value = j.data.url;
          preview.src = j.data.url;
        } catch (e) { alert('上传失败：' + e.message); }
      });
      const urlInput = el('input', { type: 'text', value: v, placeholder: '或粘贴 URL' });
      urlInput.addEventListener('input', () => { preview.src = urlInput.value; });
      wrap.append(preview, urlInput, file);
      form.appendChild(wrap);
    } else if (k === 'content') {
      form.append(el('label', { class: 'if-row' }, [
        el('span', {}, label),
        el('textarea', { rows: 4 }, v)
      ]));
    } else {
      form.append(el('label', { class: 'if-row' }, [
        el('span', {}, label),
        el('input', { type: 'text', value: v })
      ]));
    }
  });

  const actions = el('div', { class: 'if-actions' }, [
    el('button', { class: 'if-save', on: { click: () => onSave(form, card, record, kind, isNew) } }, isNew ? '添 加' : '保 存'),
    el('button', { class: 'if-cancel', on: { click: () => form.remove() } }, '取 消')
  ]);
  form.appendChild(actions);

  card.appendChild(form);
}

async function onSave(form, card, record, kind, isNew) {
  const inputs = form.querySelectorAll('input[type="text"], textarea');
  const fields = FORM_FIELDS[kind];
  const data = {};
  fields.forEach(([k], i) => {
    const v = inputs[i] ? inputs[i].value.trim() : '';
    if (k === 'year' && v) data[k] = Number(v);
    else                   data[k] = v;
  });
  try {
    if (isNew) await API.create(kind, data);
    else       await API.update(kind, record.id, data);
    form.remove();
    await reloadSection(kind);
  } catch (e) {
    alert('保存失败：' + e.message);
  }
}

async function onDelete(card, record, kind) {
  if (!confirm('确定删除？')) return;
  try {
    await API.remove(kind, record.id);
    card.remove();
  } catch (e) {
    alert('删除失败：' + e.message);
  }
}

async function reloadSection(kind) {
  const map = { works: renderWorks, story: renderStories, video: renderVideos, update: renderUpdates };
  await (map[kind] || (() => {}))();
}

// ============================================================
//  添加按钮（+ Add）
// ============================================================
document.querySelectorAll('.add-row').forEach(row => {
  const kind = row.dataset.add;
  row.querySelector('.add-btn').addEventListener('click', () => {
    const section = document.getElementById(sectionIdOf(kind));
    let host = section.querySelector('#worksGrid')      // works
            || section.querySelector(`#${kind}Grid`)     // story / video
            || section.querySelector(`#${kind}List`)     // update
            || section.querySelector(`#${kind === 'update' ? 'updatesList' : kind + 'Grid'}`);
    if (!host) {
      // 退化：用 add-row 的前一个兄弟节点作为插入点
      host = row.previousElementSibling;
    }
    const stub = el('div', { class: 'add-stub' });
    host.appendChild(stub);
    openForm(stub, null, kind, true);
  });
});
function sectionIdOf(kind) {
  return ({ works: 'works', story: 'gallery', video: 'video', update: 'updates' })[kind] || kind;
}

// ============================================================
//  编辑模式开关（Edit FAB）+ 顶部工具条
// ============================================================
let editing = false;
const editFab   = el('button', { class: 'edit-fab' }, 'EDIT');
const editBar   = el('div', { class: 'edit-bar' }, [
  el('span', { class: 'edit-bar-label' }, '编辑模式'),
  el('button', { class: 'eb-btn ghost', on: { click: () => { editing = false; applyEditingUI(); } } }, '退 出')
]);
document.body.append(editFab, editBar);
editFab.addEventListener('click', () => { editing = true; applyEditingUI(); });

function applyEditingUI() {
  document.body.classList.toggle('editing', editing);
  editFab.style.display    = editing ? 'none'  : '';
  editBar.style.display    = editing ? 'flex'  : 'none';
  document.querySelectorAll('.add-row').forEach(r =>
    r.style.display = editing ? 'flex' : 'none');
  // 关闭打开中的表单
  document.querySelectorAll('.inline-form').forEach(f => f.remove());
}
editFab.style.display = '';

// ============================================================
//  留言板（guestbook）
// ============================================================
const form     = document.getElementById('guestForm');
const msgList  = document.getElementById('msgList');

function renderMsg(name, message, prepend = true) {
  const item = el('div', { class: 'msg-item' },
    el('b', {}, name),
    el('p',  {}, message)
  );
  if (prepend) msgList.prepend(item); else msgList.appendChild(item);
}

async function loadMessages() {
  try {
    const j = await API.list('guestbook');
    msgList.innerHTML = '';
    (j.data || []).slice().reverse().forEach(m => renderMsg(m.name, m.message, false));
  } catch (e) { console.warn('加载留言失败:', e); }
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('gbName').value.trim();
  const msg  = document.getElementById('gbMsg').value.trim();
  if (!name || !msg) return;
  try {
    await API.create('guestbook', { name, message: msg });
    renderMsg(name, msg, true);
    form.reset();
  } catch (err) { console.warn('留言提交失败:', err); }
});

// ============================================================
//  启动：拉取所有数据
// ============================================================
(async function init() {
  await Promise.all([
    renderWorks(),
    renderStories(),
    renderVideos(),
    renderUpdates(),
    renderProfile(),
    loadMessages()
  ]);
})();