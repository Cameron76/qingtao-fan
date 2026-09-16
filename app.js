// ============================================================
//  卿涛 · Qing Tao
//  - Home：snap-scroll 标题菜单（每个 panel 点击 → 切换到对应 page）
//  - 其他页面：page-switch，各自独立可滚动
//  - 字符从下至上浮现（chars）
//  - WORKS / CULTURE / NEWS / GUESTBOOK 由 Turso 拉取
//  - EDIT 模式：底部 EDIT 按钮开关，新增/编辑/删除/图片上传
// ============================================================

const API = {
  list: async (kind) => {
    const r = await fetch(`/api/${kind}`);
    const j = await r.json();
    return (j && j.data) || [];
  },
  post: async (kind, body) => {
    const r = await fetch(`/api/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  },
  put: async (kind, body) => {
    const r = await fetch(`/api/${kind}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  },
  del: async (kind, id) => {
    const r = await fetch(`/api/${kind}?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return r.json();
  },
  upload: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/upload', { method: 'POST', body: fd });
    const j = await r.json();
    if (!r.ok || !j || !j.data || !j.data.url) {
      throw new Error(j?.error || '上传失败');
    }
    return j.data.url;
  }
};

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

// ============================================================
//  HTML 转义
// ============================================================
function esc(s = '') {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ============================================================
//  字符拆分 → .ch，由 .chars.in 触发从下至上浮现
//  stagger=true：逐字错开浮出（用于非主页）
//  stagger=false：所有字同时浮出（用于主页 snap 菜单）
// ============================================================
function wrapChars(el, stagger = true) {
  if (el.dataset.wrapped === '1') return;
  el.dataset.wrapped = '1';
  const text = el.dataset.text || el.textContent;
  el.textContent = '';
  [...text].forEach((ch, i) => {
    if (ch === ' ' || ch === '\u00A0') {
      el.appendChild(document.createTextNode(' '));
      return;
    }
    const span = document.createElement('span');
    span.className = 'ch';
    span.textContent = ch;
    if (stagger) span.style.transitionDelay = `${i * 0.06}s`;
    el.appendChild(span);
  });
}

// ============================================================
//  页面切换
// ============================================================
const tabs   = $$('.tab');
const pages  = $$('.page');
const snapEl = $('#snap');

function switchPage(name) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  pages.forEach(p => p.classList.toggle('active', p.id === name));

  // 回到顶部
  window.scrollTo({ top: 0, behavior: 'instant' });

  // home 内重置 snap 滚动位置 + 重设激活面板
  if (name === 'home' && snapEl) {
    snapEl.scrollTop = 0;
    setActivePanel(0);
  }

  history.replaceState(null, '', '#' + name);

  // 非主页字符入场（force-reflow 保证 transition 完整播放）
  if (name !== 'home') {
    const page = document.getElementById(name);
    if (page) {
      page.querySelectorAll('.chars').forEach(el => {
        el.classList.remove('in');
        void el.offsetWidth;
        el.classList.add('in');
      });
    }
  }
}

// tab 点击
tabs.forEach(tab => {
  tab.addEventListener('click', (e) => {
    e.preventDefault();
    switchPage(tab.dataset.tab);
  });
});

// home 内 panel 点击（非 hero：必须有 data-tab 才生效）
$$('.page-home .panel').forEach(panel => {
  panel.addEventListener('click', (e) => {
    e.preventDefault();
    const tab = panel.dataset.tab;
    if (tab) switchPage(tab);
  });
});

// 品牌点击回 home
$('.brand').addEventListener('click', (e) => {
  e.preventDefault();
  switchPage('home');
});

// ============================================================
//  Home 内 snap-scroll 字符动画
// ============================================================
function setActivePanel(idx) {
  if (!snapEl) return;
  const panels = Array.from(snapEl.children);
  panels.forEach((panel, i) => {
    panel.querySelectorAll('.chars').forEach(el => {
      const isActive = (i === idx);
      const hasIn = el.classList.contains('in');
      if (isActive && !hasIn) {
        el.classList.add('in');
      } else if (isActive && hasIn) {
        el.classList.remove('in');
        void el.offsetWidth;
        el.classList.add('in');
      } else {
        el.classList.remove('in');
      }
    });
  });
}

let snapTimer = null;
function onSnapScroll() {
  clearTimeout(snapTimer);
  snapTimer = setTimeout(() => {
    if (!snapEl) return;
    const idx = Math.round(snapEl.scrollTop / snapEl.clientHeight);
    setActivePanel(idx);
  }, 70);
}
if (snapEl) snapEl.addEventListener('scroll', onSnapScroll, { passive: true });

// ============================================================
//  公共：图片预览（file → url.createObjectURL → 显示）
// ============================================================
function bindImagePreview(fileInput, previewEl) {
  if (!fileInput || !previewEl) return;
  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    previewEl.style.backgroundImage = `url(${URL.createObjectURL(f)})`;
  });
}

// ============================================================
//  通用：在容器后插入 "+ 添加新项" 按钮
// ============================================================
function addPlusButton(container, onClick) {
  if (!container) return;
  let btn = container.parentElement.querySelector('.add-item-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'add-item-btn';
    btn.type = 'button';
    btn.textContent = '+ 添加新项';
    btn.addEventListener('click', onClick);
    container.insertAdjacentElement('afterend', btn);
  }
}

// ============================================================
//  渲染：WORKS（forms.world 风格 · 单列 · grid/list 切换）
// ============================================================
let worksAll = [];        // 缓存所有作品
let currentCat = 'all';   // 当前过滤类别
let currentView = 'grid'; // 'grid' | 'list'

function buildWorkCard(w) {
  const card = document.createElement('article');
  card.className = 'work-card';
  card.dataset.id = w.id;
  card.dataset.author = w.author;
  card.dataset.cat = w.cat;

  // 类别 (小字 monospace)
  const cat = document.createElement('p');
  cat.className = 'work-meta';
  const catParts = [
    esc(catLabel(w.cat)),
    esc(authorLabel(w.author))
  ];
  if (w.year) catParts.push(esc(String(w.year)));
  cat.textContent = catParts.join(' · ');

  // 标题：大字 serif（title）+ 斜体（year 或占位）
  const title = document.createElement('h3');
  title.className = 'work-title';
  const roman = document.createElement('span');
  roman.className = 'work-title-roman';
  roman.textContent = w.title || '';
  title.appendChild(roman);
  if (w.year) {
    const em = document.createElement('em');
    em.textContent = String(w.year);
    title.appendChild(em);
  }

  // tags: 类别 chip + 作者 chip
  const tags = document.createElement('div');
  tags.className = 'work-tags';
  [catLabel(w.cat), authorLabel(w.author)].forEach(t => {
    if (!t) return;
    const chip = document.createElement('span');
    chip.className = 'work-tag';
    chip.textContent = t;
    tags.appendChild(chip);
  });

  // 封面
  const cover = document.createElement('div');
  cover.className = 'work-cover';
  if (w.cover_url) cover.style.backgroundImage = `url(${esc(w.cover_url)})`;

  // 编辑 / 删除
  const acts = makeItemActions({
    onEdit: () => openWorksForm(w),
    onDelete: async () => {
      if (!confirm('确认删除该作品？')) return;
      await API.del('works', w.id);
      renderWorks();
    }
  });

  card.append(cat, title, tags, cover, acts);

  // 有链接时整卡可点击跳转
  if (w.link_url) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      // 编辑/删除按钮已 stopPropagation，这里直接跳转
      window.open(w.link_url, '_blank', 'noopener,noreferrer');
    });
  }
  return card;
}

function buildListRow(w) {
  const row = document.createElement('article');
  row.className = 'list-row';
  row.dataset.id = w.id;
  row.dataset.cat = w.cat;

  const lc = document.createElement('div');
  lc.className = 'list-cat';
  lc.textContent = catLabel(w.cat) || '';

  const title = document.createElement('div');
  title.className = 'list-title';
  const roman = document.createElement('span');
  roman.textContent = w.title || '';
  title.appendChild(roman);
  if (w.year) {
    const em = document.createElement('em');
    em.textContent = String(w.year);
    title.appendChild(em);
  }

  const tags = document.createElement('div');
  tags.className = 'list-tags';
  [authorLabel(w.author)].forEach(t => {
    if (!t) return;
    const chip = document.createElement('span');
    chip.className = 'list-tag';
    chip.textContent = t;
    tags.appendChild(chip);
  });

  // 编辑 / 删除（list-row 用相对定位的 badge）
  const acts = makeItemActions({
    onEdit: () => openWorksForm(w),
    onDelete: async () => {
      if (!confirm('确认删除该作品？')) return;
      await API.del('works', w.id);
      renderWorks();
    }
  });

  row.append(lc, title, tags, acts);

  // 有链接时整行可点击跳转
  if (w.link_url) {
    row.style.cursor = 'pointer';
    row.addEventListener('click', (e) => {
      window.open(w.link_url, '_blank', 'noopener,noreferrer');
    });
  }
  return row;
}

function makeItemActions({ onEdit, onDelete }) {
  const wrap = document.createElement('div');
  wrap.className = 'item-actions';
  const e = document.createElement('button');
  e.type = 'button'; e.textContent = '编辑';
  e.addEventListener('click', (ev) => { ev.stopPropagation(); onEdit && onEdit(); });
  const d = document.createElement('button');
  d.type = 'button'; d.textContent = '删除'; d.className = 'del';
  d.addEventListener('click', async (ev) => {
    ev.stopPropagation();
    if (onDelete) await onDelete();
  });
  wrap.append(e, d);
  return wrap;
}

function applyFilter() {
  const g = $('#worksGrid');
  const l = $('#worksList');
  if (!g || !l) return;
  g.innerHTML = '';
  l.innerHTML = '';
  const filtered = worksAll.filter(w => currentCat === 'all' || w.cat === currentCat);
  // 统一按年份 DESC，再按 id DESC
  filtered.sort((a, b) => (b.year || 0) - (a.year || 0) || (b.id - a.id));
  filtered.forEach((w, i) => {
    const card = buildWorkCard(w);
    card.style.animationDelay = `${i * 0.05}s`;
    g.appendChild(card);

    const row = buildListRow(w);
    row.style.animationDelay = `${i * 0.04}s`;
    l.appendChild(row);
  });
  // list 默认隐藏
  l.style.display = 'none';
  // grid 默认显示
  g.style.display = 'flex';
}

async function renderWorks() {
  const grid = $('#worksGrid');
  const list = $('#worksList');
  if (!grid || !list) return;
  try { worksAll = await API.list('works'); } catch (e) { console.warn(e); return; }
  applyFilter();
  bindFilterChips();
  bindViewToggle();
  addPlusButton(grid, () => openWorksForm(null));
}

function bindFilterChips() {
  const nav = $('#filterChips');
  if (!nav || nav.dataset.bound === '1') return;
  nav.dataset.bound = '1';
  nav.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    nav.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentCat = chip.dataset.cat || 'all';
    // 切换时给 grid/list 重启动画
    const g = $('#worksGrid');
    const l = $('#worksList');
    [g, l].forEach(el => {
      if (!el) return;
      el.classList.add('is-leaving');
      setTimeout(() => {
        applyFilter();
        el.classList.remove('is-leaving');
      }, 200);
    });
  });
}

function bindViewToggle() {
  const wrap = $('#viewToggle');
  if (!wrap || wrap.dataset.bound === '1') return;
  wrap.dataset.bound = '1';
  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.vt-btn');
    if (!btn) return;
    wrap.querySelectorAll('.vt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    if (view === currentView) return;
    const fromEl = currentView === 'grid' ? $('#worksGrid') : $('#worksList');
    const toEl   = view       === 'grid' ? $('#worksGrid') : $('#worksList');
    currentView = view;

    // 渐隐 → 切换 display → 渐显
    fromEl.classList.add('is-leaving');
    setTimeout(() => {
      fromEl.style.display = 'none';
      fromEl.classList.remove('is-leaving');
      toEl.classList.add('is-entering');
      toEl.style.display = view === 'grid' ? 'flex' : 'flex';
      // 强制 reflow 再去掉 is-entering 让 transition 触发
      void toEl.offsetWidth;
      toEl.classList.remove('is-entering');
    }, 220);
  });
}

function catLabel(c) {
  return ({ host: '主持', produce: '制作', judge: '评委', music: '音乐' })[c] || c;
}
function authorLabel(a) {
  return ({ tao: '涛', qing: '卿', both: '卿+涛' })[a] || a;
}

// ============================================================
//  渲染：CULTURE
// ============================================================
// ============================================================
//  渲染：CULTURE（mschristensen 风格 · 全宽卡片 · type 过滤）
// ============================================================
let cultureAll = [];
let currentType = 'all';

function cultureTypeLabel(t) {
  return ({ interview: 'Interview', book: 'Book', script: 'Script' })[t] || t;
}

function buildCultureCard(c, index) {
  const card = document.createElement('article');
  card.className = 'culture-card';
  card.dataset.id = c.id;
  card.dataset.type = c.type || '';

  // 编号
  const idx = document.createElement('span');
  idx.className = 'culture-index';
  idx.textContent = String(index).padStart(2, '0');

  // 主体：meta + title
  const body = document.createElement('div');
  body.className = 'culture-body';

  const meta = document.createElement('div');
  meta.className = 'culture-meta-row';
  if (c.type) {
    const tag = document.createElement('span');
    tag.className = 'culture-type-tag';
    tag.textContent = cultureTypeLabel(c.type);
    meta.appendChild(tag);
  }
  if (c.author) {
    const au = document.createElement('span');
    au.className = 'culture-author';
    au.textContent = c.author;
    meta.appendChild(au);
  }
  if (c.year) {
    const yr = document.createElement('span');
    yr.className = 'culture-year';
    yr.textContent = String(c.year);
    meta.appendChild(yr);
  }

  const title = document.createElement('h3');
  title.className = 'culture-title';
  title.textContent = c.title || '';

  body.append(meta, title);

  // hover 浮现的图片预览
  const hoverImg = document.createElement('div');
  hoverImg.className = 'culture-hover-img';
  if (c.image_url) hoverImg.style.backgroundImage = `url(${esc(c.image_url)})`;

  // edit / delete
  const acts = makeItemActions({
    onEdit: () => openCultureForm(c),
    onDelete: async () => {
      if (!confirm('确认删除该条目？')) return;
      await API.del('culture', c.id);
      renderCulture();
    }
  });

  card.append(idx, body, hoverImg, acts);

  // click → 内部详情页
  card.addEventListener('click', () => {
    location.hash = `#culture/${c.id}`;
  });
  return card;
}

function applyCultureFilter() {
  const box = $('#cultureList');
  if (!box) return;
  box.innerHTML = '';
  const filtered = cultureAll.filter(c => currentType === 'all' || c.type === currentType);
  filtered.sort((a, b) => (b.year || 0) - (a.year || 0) || (b.id - a.id));
  filtered.forEach((c, i) => {
    const card = buildCultureCard(c, i + 1);
    card.style.animationDelay = `${i * 0.08}s`;
    box.appendChild(card);
  });
}

async function renderCulture() {
  const box = $('#cultureList');
  if (!box) return;
  try { cultureAll = await API.list('culture'); } catch (e) { console.warn(e); return; }
  applyCultureFilter();
  bindCultureFilter();
  addPlusButton(box, () => openCultureForm(null));
}

function bindCultureFilter() {
  const nav = $('#cultureFilter');
  if (!nav || nav.dataset.bound === '1') return;
  nav.dataset.bound = '1';
  nav.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    nav.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentType = chip.dataset.type || 'all';
    const box = $('#cultureList');
    if (box) box.classList.add('is-leaving');
    setTimeout(() => {
      applyCultureFilter();
      if (box) box.classList.remove('is-leaving');
    }, 200);
  });
}

// ============================================================
//  渲染：NEWS
// ============================================================
async function renderUpdates() {
  const box = $('#updatesList');
  if (!box) return;
  box.innerHTML = '';
  let rows = [];
  try { rows = await API.list('updates'); } catch (e) { console.warn(e); return; }
  rows.forEach(u => {
    const item = document.createElement('article');
    item.className = 't-item';
    item.dataset.id = u.id;
    item.innerHTML = `
      <div class="t-date">${esc(u.date || '')}</div>
      <p class="t-content">${esc(u.content || '')}</p>`;
    const acts = makeItemActions({
      onEdit: () => openNewsForm(u),
      onDelete: async () => {
        if (!confirm('确认删除该动态？')) return;
        await API.del('updates', u.id);
        renderUpdates();
      }
    });
    item.appendChild(acts);
    box.appendChild(item);
  });
  addPlusButton(box, () => openNewsForm(null));
}

// ============================================================
//  渲染：PROFILE
// ============================================================
async function renderProfile() {
  let rows = [];
  try { rows = await API.list('profile'); } catch (e) { console.warn(e); return; }
  rows.forEach(p => {
    const card = document.querySelector(`.profile-card[data-profile="${p.author_key}"]`);
    if (!card) return;
    if (p.photo_url) {
      const ph = card.querySelector('.profile-photo');
      if (ph) ph.style.backgroundImage = `url(${esc(p.photo_url)})`;
    }
    if (p.author_key === 'middle' && p.text_content) {
      const mid = document.querySelector('.profile-middle');
      if (mid) {
        mid.innerHTML = '';
        p.text_content.split('\n').forEach((line) => {
          const pEl = document.createElement('p');
          pEl.textContent = line || '\u00A0';
          mid.appendChild(pEl);
        });
      }
    }
  });
  bindProfileEditing();
}

// ============================================================
//  PROFILE：编辑模式 - 点击照片上传 / 中间文本可改
// ============================================================
function bindProfileEditing() {
  // 照片点击 → 触发隐藏的 file input
  $$('.profile-photo').forEach(photo => {
    photo.innerHTML = '';
    let fileInput = photo.querySelector('input.photo-file');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.className = 'photo-file';
      fileInput.style.position = 'absolute';
      fileInput.style.inset = '0';
      fileInput.style.opacity = '0';
      fileInput.style.cursor = 'pointer';
      photo.style.position = 'relative';
      photo.appendChild(fileInput);
    }
    fileInput.addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const card = photo.closest('.profile-card');
      const key  = card && card.dataset.profile;
      if (!key) return;
      try {
        const url = await API.upload(f);
        photo.style.backgroundImage = `url(${url})`;
        await API.post('profile', { author_key: key, photo_url: url, text_content: '' });
      } catch (err) { alert('上传失败：' + err.message); }
    });
  });

  // 中间区域：toolbar + contenteditable
  const mid = document.querySelector('.profile-middle');
  if (mid) {
    const initialText = Array.from(mid.querySelectorAll('p'))
      .map(p => p.textContent)
      .filter(t => t && t.trim() && !t.includes('——'))
      .join('\n');

    mid.innerHTML = '';
    const bar = document.createElement('div');
    bar.className = 'pm-toolbar';
    bar.innerHTML = `
      <button type="button" data-act="save">保存文字</button>
      <button type="button" data-act="reset">还原</button>`;
    mid.appendChild(bar);
    const editor = document.createElement('div');
    editor.className = 'pm-editor';
    editor.contentEditable = 'plaintext-only';
    editor.style.minHeight = '120px';
    editor.style.outline = 'none';
    editor.textContent = initialText;
    mid.appendChild(editor);

    bar.querySelector('[data-act="save"]').addEventListener('click', async () => {
      try {
        await API.post('profile', {
          author_key: 'middle',
          photo_url: '',
          text_content: editor.textContent
        });
        alert('已保存');
      } catch (err) { alert('保存失败：' + err.message); }
    });
    bar.querySelector('[data-act="reset"]').addEventListener('click', () => {
      editor.textContent = initialText;
    });
  }
}

// ============================================================
//  EDIT 模式：FORM 构建器
// ============================================================
let activeFormEl = null;     // 当前展示中的 form（编辑）
let activeFormKind = null;   // 'works' | 'culture' | 'updates'

function closeActiveForm() {
  if (activeFormEl && activeFormEl.parentElement) {
    activeFormEl.parentElement.removeChild(activeFormEl);
  }
  activeFormEl = null;
  activeFormKind = null;
}

function buildForm({ fields, initial = {}, submitLabel = '保存', onSubmit, afterSubmit }) {
  const form = document.createElement('form');
  form.className = 'edit-form';
  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = {};
    const filePromises = [];
    fields.forEach(f => {
      const el = form.querySelector(`[name="${f.name}"]`);
      if (!el) return;
      if (f.type === 'file') {
        const file = el.files && el.files[0];
        if (file) {
          filePromises.push(API.upload(file).then(url => { data[f.name] = url; }));
        } else {
          data[f.name] = initial[f.name] || '';
        }
      } else if (f.type === 'textarea') {
        data[f.name] = el.value;
      } else {
        data[f.name] = el.value;
      }
    });
    try {
      if (filePromises.length) await Promise.all(filePromises);
      await onSubmit(data);
      if (afterSubmit) afterSubmit();
      closeActiveForm();
    } catch (err) {
      alert('保存失败：' + err.message);
    }
  };

  fields.forEach(f => {
    const row = document.createElement('div');
    row.className = 'form-row';
    const label = document.createElement('label');
    label.textContent = f.label;
    row.appendChild(label);

    if (f.type === 'select') {
      const sel = document.createElement('select');
      sel.name = f.name;
      (f.options || []).forEach(o => {
        const op = document.createElement('option');
        op.value = o.value;
        op.textContent = o.label;
        if (String(initial[f.name] || '') === String(o.value)) op.selected = true;
        sel.appendChild(op);
      });
      row.appendChild(sel);
    } else if (f.type === 'textarea') {
      const ta = document.createElement('textarea');
      ta.name = f.name;
      ta.rows = f.rows || 4;
      ta.value = initial[f.name] || '';
      row.appendChild(ta);
    } else if (f.type === 'file') {
      const wrap = document.createElement('div');
      wrap.className = 'image-row';
      const prev = document.createElement('div');
      prev.className = 'image-preview';
      if (initial[f.name]) prev.style.backgroundImage = `url(${initial[f.name]})`;
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.name = f.name;
      bindImagePreview(inp, prev);
      wrap.append(prev, inp);
      row.appendChild(wrap);
    } else {
      const inp = document.createElement('input');
      inp.type = f.type || 'text';
      inp.name = f.name;
      inp.value = initial[f.name] != null ? initial[f.name] : '';
      if (f.placeholder) inp.placeholder = f.placeholder;
      row.appendChild(inp);
    }
    form.appendChild(row);
  });

  const acts = document.createElement('div');
  acts.className = 'form-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button'; cancel.textContent = '取消'; cancel.className = 'cancel';
  cancel.addEventListener('click', closeActiveForm);
  const save = document.createElement('button');
  save.type = 'submit'; save.textContent = submitLabel; save.className = 'save';
  acts.append(cancel, save);
  form.appendChild(acts);

  return form;
}

// ---------- WORKS 表单 ----------
function openWorksForm(row) {
  closeActiveForm();
  activeFormKind = 'works';
  const isEdit = !!row;
  const form = buildForm({
    fields: [
      { name: 'author', label: '归属', type: 'select', options: [
        { value: 'tao',  label: '涛' },
        { value: 'qing', label: '卿' },
        { value: 'both', label: '卿+涛' }
      ]},
      { name: 'cat', label: '类别', type: 'select', options: [
        { value: 'host',    label: '主持' },
        { value: 'produce', label: '制作' },
        { value: 'judge',   label: '评委' },
        { value: 'music',   label: '音乐' }
      ]},
      { name: 'title', label: '标题' },
      { name: 'year', label: '年份', type: 'number', placeholder: '如 2018' },
      { name: 'cover_url', label: '封面图', type: 'file' },
      { name: 'link_url', label: '超链接', type: 'text', placeholder: 'https://...（点击作品跳转）' }
    ],
    initial: row || {},
    submitLabel: isEdit ? '保存修改' : '添加',
    onSubmit: async (data) => {
      if (isEdit) await API.put('works', { id: row.id, ...data });
      else        await API.post('works', data);
      renderWorks();
    }
  });
  const grid = $('.works-grid');
  grid.parentElement.insertBefore(form, grid);
  activeFormEl = form;
}

// ---------- CULTURE 表单 ----------
function openCultureForm(row) {
  closeActiveForm();
  activeFormKind = 'culture';
  const isEdit = !!row;
  const form = buildForm({
    fields: [
      { name: 'title', label: '标题' },
      { name: 'author', label: '作者' },
      { name: 'year', label: '年份', type: 'number' },
      { name: 'type', label: '类型', type: 'select', options: [
        { value: 'interview', label: 'Interview' },
        { value: 'book',      label: 'Book' },
        { value: 'script',    label: 'Script' }
      ]},
      { name: 'description', label: '简介', type: 'textarea', rows: 4 },
      { name: 'image_url', label: '图片', type: 'file' },
      { name: 'link_url', label: '超链接', type: 'text', placeholder: 'https://...（点击卡片跳转）' }
    ],
    initial: row || {},
    submitLabel: isEdit ? '保存修改' : '添加',
    onSubmit: async (data) => {
      if (isEdit) await API.put('culture', { id: row.id, ...data });
      else        await API.post('culture', data);
      renderCulture();
    }
  });
  const grid = $('#cultureList');
  grid.parentElement.insertBefore(form, grid);
  activeFormEl = form;
}

// ---------- NEWS 表单 ----------
function openNewsForm(row) {
  closeActiveForm();
  activeFormKind = 'updates';
  const isEdit = !!row;
  const form = buildForm({
    fields: [
      { name: 'date', label: '日期', placeholder: '2026-09-16 或 2026年9月16日' },
      { name: 'content', label: '内容', type: 'textarea', rows: 5 }
    ],
    initial: row || { date: todayStr() },
    submitLabel: isEdit ? '保存修改' : '添加',
    onSubmit: async (data) => {
      if (!data.date) { alert('请填写日期'); throw new Error('empty date'); }
      if (isEdit) await API.put('updates', { id: row.id, ...data });
      else        await API.post('updates', data);
      renderUpdates();
    }
  });
  const list = $('#updatesList');
  list.parentElement.insertBefore(form, list);
  activeFormEl = form;
}

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ============================================================
//  EDIT 模式切换
// ============================================================
let editMode = false;

function setEditMode(on) {
  editMode = !!on;
  document.body.classList.toggle('edit-mode', editMode);
  const btn = $('.edit-toggle');
  if (btn) {
    btn.classList.toggle('active', editMode);
    btn.textContent = editMode ? '完成' : 'EDIT';
  }
  // 非 EDIT 模式时关闭正在编辑的表单
  if (!editMode) closeActiveForm();
}

function attachEditToggle() {
  // 不在主页、guestbook 留客表单时显示
  const btn = document.createElement('button');
  btn.className = 'edit-toggle';
  btn.type = 'button';
  btn.textContent = 'EDIT';
  btn.addEventListener('click', () => setEditMode(!editMode));
  document.body.appendChild(btn);
}

// ============================================================
//  留言板（保持原有逻辑）
// ============================================================
const form    = $('#guestForm');
const msgList = $('#msgList');
function renderMsg(name, message, prepend = true) {
  const item = document.createElement('div');
  item.className = 'msg-item';
  const b = document.createElement('b'); b.textContent = name;
  const p = document.createElement('p'); p.textContent = message;
  item.append(b, p);
  if (prepend) msgList.prepend(item); else msgList.appendChild(item);
}
async function loadMessages() {
  try {
    const rows = await API.list('guestbook');
    msgList.innerHTML = '';
    rows.slice().reverse().forEach(m => renderMsg(m.name, m.message, false));
  } catch (e) { console.warn(e); }
}
form?.addEventListener('submit', async e => {
  e.preventDefault();
  const name = $('#gbName').value.trim();
  const msg  = $('#gbMsg').value.trim();
  if (!name || !msg) return;
  try {
    await API.post('guestbook', { name, message: msg });
    renderMsg(name, msg, true);
    form.reset();
  } catch (err) { console.warn(err); }
});

// ============================================================
//  启动
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  // 1. 拆字符：主页 stagger=false（同时浮现），其他页 stagger=true（依次浮现）
  $$('.chars').forEach(el => {
    const inHome = !!el.closest('.page-home');
    wrapChars(el, !inHome);
  });

  // 2. 主页初始化：让 snap 上第一个 panel 的字符浮现
  if (snapEl) setActivePanel(0);

  // 3. URL hash → 切到对应页
  const init = (location.hash || '#home').replace('#', '');
  if (init && document.getElementById(init)) switchPage(init);

  // 4. EDIT 按钮
  attachEditToggle();

  // 5. 拉数据
  Promise.all([
    renderWorks(),
    renderCulture(),
    renderUpdates(),
    renderProfile(),
    loadMessages()
  ]);
});