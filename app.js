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

  // cultureDetail 页不覆盖 hash（保留 #culture/id），其他页正常 replaceState
  if (name !== 'cultureDetail') {
    history.replaceState(null, '', '#' + name);
  }

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
      } else if (isActive && hasIn && !firstSnapInit) {
        // 重新激活：移除 → force-reflow → 重新加上，确保 transition 完整播放
        el.classList.remove('in');
        void el.offsetWidth;
        el.classList.add('in');
      } else if (!isActive) {
        el.classList.remove('in');
      }
    });
  });
}
let firstSnapInit = true;

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
  if (w.cover_url) cover.style.backgroundImage = `url("${w.cover_url}")`;

  // 编辑 / 删除
  const acts = makeItemActions({
    onEdit: () => openWorksForm(w),
    onDelete: async () => {
      if (!confirm('确认删除该作品？')) return;
      await API.del('works', w.id);
      renderWorks();
    }
  });

  card.append(title, tags, cover, acts);

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
  // grid 默认显示
  g.classList.remove('is-hidden');
  l.classList.add('is-hidden');
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
      fromEl.classList.add('is-hidden');
      fromEl.classList.remove('is-leaving');
      toEl.classList.remove('is-hidden');
      toEl.classList.add('is-entering');
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

  // 封面图
  const cover = document.createElement('div');
  cover.className = 'culture-cover';
  if (c.image_url) cover.style.backgroundImage = `url("${c.image_url}")`;

  // meta 行
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

  // 标题
  const title = document.createElement('h3');
  title.className = 'culture-title';
  title.textContent = c.title || '';

  card.append(cover, meta, title);

  // edit / delete（保留不动）
  const acts = makeItemActions({
    onEdit: () => openCultureForm(c),
    onDelete: async () => {
      if (!confirm('确认删除该条目？')) return;
      await API.del('culture', c.id);
      renderCulture();
    }
  });
  card.appendChild(acts);

  // click → 内部详情页（自动链接）
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
      if (ph) ph.style.backgroundImage = `url("${p.photo_url}")`;
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
//  PROFILE：编辑模式 - 点击照片粘贴 URL / 中间文本可改
// ============================================================
function bindProfileEditing() {
  // 照片点击 → 弹出 URL 输入对话框
  $('.profile-photo').forEach(photo => {
    photo.innerHTML = '';
    let urlInput = photo.querySelector('input.photo-url-input');
    let urlBtn   = photo.querySelector('button.photo-url-btn');
    let urlLabel = photo.querySelector('.photo-url-label');
    if (!urlLabel) {
      urlLabel = document.createElement('div');
      urlLabel.className = 'photo-url-label';
      urlLabel.textContent = '点击修改图片';
      photo.style.position = 'relative';
      photo.appendChild(urlLabel);
    }
    if (!urlInput) {
      urlInput = document.createElement('input');
      urlInput.type = 'url';
      urlInput.className = 'photo-url-input';
      urlInput.placeholder = 'https://...';
      urlInput.style.display = 'block';
      urlInput.style.width = '100%';
      urlInput.style.marginBottom = '4px';
      urlInput.value = (photo.style.backgroundImage || '').replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
      photo.appendChild(urlInput);
    }
    if (!urlBtn) {
      urlBtn = document.createElement('button');
      urlBtn.type = 'button';
      urlBtn.className = 'photo-url-btn';
      urlBtn.textContent = '保存图片';
      photo.appendChild(urlBtn);
    }
    urlBtn.addEventListener('click', async () => {
      const url = (urlInput.value || '').trim();
      if (!url) { alert('请输入图片 URL'); return; }
      const card = photo.closest('.profile-card');
      const key  = card && card.dataset.profile;
      if (!key) return;
      try {
        photo.style.backgroundImage = `url(${url})`;
        await API.post('profile', { author_key: key, photo_url: url, text_content: '' });
        urlLabel.textContent = '已保存';
        setTimeout(() => { urlLabel.textContent = '点击修改图片'; }, 1500);
      } catch (err) { alert('保存失败：' + err.message); }
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
        const fileInp = form.querySelector(`[name="${f.name}"]`);
        const urlInp = form.querySelector(`[name="${f.name}_url"]`);
        const urlVal = urlInp && urlInp.value && urlInp.value.trim();
        if (urlVal) {
          data[f.name] = urlVal;
        } else {
          const file = fileInp && fileInp.files && fileInp.files[0];
          if (file) {
            filePromises.push(API.upload(file).then(url => { data[f.name] = url; }));
          } else {
            data[f.name] = initial[f.name] || '';
          }
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
      // 文件上传输入
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.name = f.name;
      bindImagePreview(inp, prev);
      // URL 粘贴输入
      const urlLabel = document.createElement('div');
      urlLabel.className = 'image-url-label';
      urlLabel.textContent = '或粘贴图片 URL';
      const urlInp = document.createElement('input');
      urlInp.type = 'url';
      urlInp.name = f.name + '_url';
      urlInp.className = 'image-url-input';
      urlInp.value = initial[f.name] || '';
      urlInp.placeholder = 'https://...';
      // URL 改变 → 同步预览
      urlInp.addEventListener('input', () => {
        if (urlInp.value.trim()) prev.style.backgroundImage = `url(${urlInp.value.trim()})`;
      });
      wrap.append(prev, inp, urlLabel, urlInp);
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
      { name: 'description', label: '长文正文（支持 Markdown：# 标题、**加粗**、*斜体*、[链接](url)、![图片](url)、- 列表、> 引用）', type: 'textarea', rows: 12 },
      { name: 'image_url', label: '图片', type: 'file' }
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
  // 若在 culture 详情页，重新渲染为可编辑/只读
  if (document.getElementById('cultureDetail')?.classList.contains('active')) {
    const m = location.hash.match(/^#culture\/(\d+)$/);
    if (m) showCultureDetail(Number(m[1]));
  }
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
//  小屏菜单：MENU 按钮 + tabs 竖向下拉
// ============================================================
(function bindMobileMenu() {
  const btn  = $('#menuBtn');
  const tabs = $('#tabs');
  if (!btn || !tabs) return;

  function close() {
    btn.setAttribute('aria-expanded', 'false');
    tabs.classList.remove('is-open');
  }
  function open() {
    btn.setAttribute('aria-expanded', 'true');
    tabs.classList.add('is-open');
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (btn.getAttribute('aria-expanded') === 'true') close();
    else open();
  });

  // 点外部自动关闭
  document.addEventListener('click', (e) => {
    if (!tabs.classList.contains('is-open')) return;
    if (e.target.closest('#tabs') || e.target.closest('#menuBtn')) return;
    close();
  });

  // 选完一个 tab 后自动收起
  tabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    close();
  });

  // 切回大屏时清理展开状态
  window.addEventListener('resize', () => {
    if (window.innerWidth > 560) close();
  });
})();

// ============================================================
//  启动
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  // 1. 拆字符：主页 stagger=false（同时浮现），其他页 stagger=true（依次浮现）
  $$('.chars').forEach(el => {
    const inHome = !!el.closest('.page-home');
    wrapChars(el, !inHome);
  });

  // 2. URL hash → 切到对应页（含 culture 详情）
  handleCultureHash();
  window.addEventListener('hashchange', handleCultureHash);

  // 3. 主页字体动画：用双层 RAF 保证浏览器先 paint 出无 .in 的初始帧，再加 .in 触发完整 transition
  if (snapEl && document.getElementById('home')?.classList.contains('active')) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setActivePanel(0);
        firstSnapInit = false;
      });
    });
  } else {
    firstSnapInit = false;
  }

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

// ============================================================
//  Culture 详情页（lokasasmita 风格）
// ============================================================
function handleCultureHash() {
  const hash = location.hash || '#home';
  const m = hash.match(/^#culture\/(\d+)$/);
  if (m) {
    switchPage('cultureDetail');
    showCultureDetail(Number(m[1]));
    return;
  }
  const name = hash.replace(/^#/, '');
  if (document.getElementById(name)) switchPage(name);
}

async function showCultureDetail(id) {
  const titleEl = $('#detailTitle');
  const metaEl  = $('#detailMeta');
  const introEl = $('#detailIntro');
  const articleEl = $('#detailArticle');
  if (!titleEl) return;

  titleEl.textContent = '加载中…';
  metaEl.innerHTML = '';
  introEl.textContent = '';
  articleEl.innerHTML = '';

  let c = null;
  try {
    const r = await fetch(`/api/culture?id=${id}`);
    const j = await r.json();
    c = j && j.data;
  } catch (e) { console.warn(e); }

  if (!c) {
    titleEl.textContent = '未找到该条目';
    return;
  }

  titleEl.textContent = c.title || '';
  titleEl.dataset.raw = c.title || '';

  const metaParts = [];
  if (c.type)    metaParts.push(`<span>${cultureTypeLabel(c.type)}</span>`);
  if (c.author)   metaParts.push(`<span>by ${esc(c.author)}</span>`);
  if (c.year)     metaParts.push(`<span>${esc(String(c.year))}</span>`);
  metaEl.innerHTML = metaParts.join('');

  // 简介：取 description 第一段作为 ABOUT intro
  const desc = (c.description || '').trim();
  const firstPara = desc.split(/\n\n|\n/)[0] || '';
  introEl.textContent = firstPara;
  introEl.dataset.raw = firstPara;

  // 长文：编辑模式下用 textarea，否则 Markdown 渲染
  if (editMode) {
    // 标题可编辑
    titleEl.contentEditable = 'true';
    titleEl.classList.add('editable');
    introEl.contentEditable = 'true';
    introEl.classList.add('editable');

    // 正文 textarea
    articleEl.innerHTML = '';
    const ta = document.createElement('textarea');
    ta.className = 'detail-md-editor';
    ta.rows = 24;
    ta.value = c.description || '';
    ta.placeholder = '在此输入 Markdown 长文…\n# 标题\n**加粗** *斜体*\n[链接](url)\n![图片](url)\n- 列表项\n> 引用\n---\n分隔线';
    articleEl.appendChild(ta);

    // 保存按钮
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'detail-save-btn';
    saveBtn.textContent = '保存修改';
    saveBtn.addEventListener('click', async () => {
      const title = titleEl.textContent.trim();
      const intro = introEl.textContent.trim();
      const body  = ta.value;
      // 简介拼回正文顶部（若用户改过 intro 且与正文首段不同）
      let desc = body;
      if (intro && (!desc || !desc.startsWith(intro))) {
        desc = intro + '\n\n' + body;
      }
      try {
        await API.put('culture', { id: c.id, title, description: desc });
        // 重新渲染为只读
        const j = await (await fetch(`/api/culture?id=${c.id}`)).json();
        const fresh = j && j.data;
        if (fresh) {
          titleEl.contentEditable = 'false';
          titleEl.classList.remove('editable');
          introEl.contentEditable = 'false';
          introEl.classList.remove('editable');
          titleEl.textContent = fresh.title || '';
          const fDesc = (fresh.description || '').trim();
          introEl.textContent = fDesc.split(/\n\n|\n/)[0] || '';
          articleEl.innerHTML = renderMarkdown(fDesc);
        }
      } catch (e) {
        alert('保存失败：' + e.message);
      }
    });
    articleEl.appendChild(saveBtn);
  } else {
    titleEl.contentEditable = 'false';
    titleEl.classList.remove('editable');
    introEl.contentEditable = 'false';
    introEl.classList.remove('editable');
    articleEl.innerHTML = renderMarkdown(desc);
  }
}

// 返回按钮
document.addEventListener('click', (e) => {
  if (e.target.closest('#cultureBack')) {
    location.hash = '#culture';
  }
});

// 轻量 Markdown 渲染器
function renderMarkdown(text) {
  if (!text) return '';
  let html = esc(text);
  // 图片 ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');
  // 链接 [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // 标题
  html = html.replace(/^###### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##### (.+)$/gm,  '<h3>$1</h3>');
  html = html.replace(/^#### (.+)$/gm,   '<h3>$1</h3>');
  html = html.replace(/^### (.+)$/gm,    '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm,     '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm,      '<h1>$1</h1>');
  // 加粗 / 斜体
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g,     '<em>$1</em>');
  // 水平线
  html = html.replace(/^---+$/gm, '<hr />');
  // 引用块 > 
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  // 无序列表
  html = html.replace(/(^- .+(?:\n- .+)*)/gm, m => '<ul>' + m.replace(/^- (.+)$/gm, '<li>$1</li>') + '</ul>');
  // 有序列表
  html = html.replace(/(^\d+\. .+(?:\n\d+\. .+)*)/gm, m => '<ol>' + m.replace(/^\d+\. (.+)$/gm, '<li>$1</li>') + '</ol>');
  // 段落：连续空行分段
  html = html.split(/\n{2,}/).map(p =>
    /^<(h1|h2|h3|ul|ol|li|img|blockquote|hr)/.test(p.trim()) ? p : `<p>${p.replace(/\n/g, '<br>')}</p>`
  ).join('\n');
  return html;
}