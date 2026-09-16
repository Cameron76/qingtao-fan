// ============================================================
//  卿涛 · Qing Tao  ─  前端主脚本
//  - Tab 切换 / 导航 / 留言板 / CULTURE 渲染
//  - 数据从 Turso API 拉取并渲染（仅展示，无编辑）
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
  if (body) {
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
  list:    (kind) => api('GET', `/api/${kind}`)
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
    (w.author === 'qing' ? right : left).appendChild(card);
  });

  bindWorksFilter();
}

// 左右菜单独立筛选
function bindWorksFilter() {
  const taoMenu  = document.querySelector('.glass-menu[data-author="tao"]');
  const qingMenu = document.querySelector('.glass-menu[data-author="qing"]');
  if (!taoMenu || !qingMenu) return;

  const getActive = (menu) => {
    const a = menu.querySelector('.glass-menu-item.active');
    return a ? a.dataset.cat : null;
  };
  const apply = () => {
    const tCat = getActive(taoMenu);
    const qCat = getActive(qingMenu);
    document.querySelectorAll('#worksColLeft .work-card, #worksColRight .work-card')
      .forEach(card => {
        const author = card.dataset.author;
        const cat    = card.dataset.cat;
        let show = true;
        if (author === 'tao'  && tCat) show = cat === tCat;
        if (author === 'qing' && qCat) show = cat === qCat;
        card.style.display = show ? '' : 'none';
      });
  };
  const toggle = (menu) => (e) => {
    const item = e.target.closest('.glass-menu-item');
    if (!item) return;
    const wasActive = item.classList.contains('active');
    menu.querySelectorAll('.glass-menu-item').forEach(i => i.classList.remove('active'));
    if (!wasActive) item.classList.add('active');
    apply();
  };
  if (!taoMenu._bound) {
    taoMenu.addEventListener('click', toggle(taoMenu));
    taoMenu._bound = true;
  }
  if (!qingMenu._bound) {
    qingMenu.addEventListener('click', toggle(qingMenu));
    qingMenu._bound = true;
  }
}
function catLabel(c) {
  return ({ host: '主持', produce: '制作', judge: '评委', music: '音乐' })[c] || c;
}

// ============================================================
//  渲染：CULTURE 熏陶
// ============================================================
async function renderCulture() {
  const box = document.getElementById('cultureGrid');
  if (!box) return;
  box.innerHTML = '';
  let rows = [];
  try { ({ data: rows } = await API.list('culture')); }
  catch (e) { console.warn('拉取 CULTURE 失败:', e); return; }
  rows.forEach(c => {
    const card = el('article', { class: 'culture-card', data: { id: c.id } });
    const cover = el('div', { class: 'culture-cover' });
    if (c.image_url) cover.style.backgroundImage = `url(${esc(c.image_url)})`;
    else             cover.style.background = placeholderBg(c.id);
    card.append(
      cover,
      el('h3', { class: 'culture-title' }, c.title || ''),
      el('p',  { class: 'culture-meta'  }, [c.author, c.year].filter(Boolean).join(' · ')),
      el('p',  { class: 'culture-desc'  }, c.description || '')
    );
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
    const item = el('div', { class: 't-item' });
    item.append(
      el('div', { class: 't-dot' }),
      el('div', { class: 't-card glass-card' }, [
        el('span', { class: 't-date' }, u.date || ''),
        el('p',  {}, u.content || '')
      ])
    );
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
    if (card) {
      const photo = card.querySelector('[data-profile-photo]');
      if (photo && p.photo_url) {
        photo.style.backgroundImage = `url(${p.photo_url})`;
        photo.style.backgroundSize = 'cover';
        photo.style.backgroundPosition = 'center';
        photo.innerHTML = '';
      }
      if (p.text_content && (p.author_key === 'tao' || p.author_key === 'qing')) {
        const tagEl = card.querySelector('.profile-tag b');
        if (tagEl) tagEl.innerHTML = p.text_content.split('').join('&nbsp;');
      }
    }
    if (p.author_key === 'middle') {
      const mid = document.querySelector('.profile-middle');
      if (mid && p.text_content) mid.textContent = p.text_content;
    }
  });
}

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
    await api('POST', '/api/guestbook', { name, message: msg });
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
    renderCulture(),
    renderUpdates(),
    renderProfile(),
    loadMessages()
  ]);
})();