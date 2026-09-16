// ============================================================
//  卿涛 · Qing Tao
//  - Home：snap-scroll 标题菜单（每个 panel 点击 → 切换到对应 page）
//  - 其他页面：page-switch，各自独立可滚动
//  - 字符从下至上浮现（chars）
//  - WORKS / CULTURE / NEWS / GUESTBOOK 由 Turso 拉取
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
  }
};

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

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

  // home 内重置 snap 滚动位置
  if (name === 'home' && snapEl) snapEl.scrollTop = 0;

  history.replaceState(null, '', '#' + name);

  // 当前页面字符入场
  const page = document.getElementById(name);
  if (page) {
    page.querySelectorAll('.chars').forEach(el => {
      el.classList.remove('in');
      requestAnimationFrame(() => el.classList.add('in'));
    });
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
//  Home 内 snap-scroll 字符动画（panel 进入视口时触发）
//  主页：所有字一起浮出（stagger=false），不区分字符顺序
// ============================================================
function triggerChars(el) {
  if (!el) return;
  el.classList.remove('in');
  requestAnimationFrame(() => el.classList.add('in'));
}

const panelIO = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      const chars = en.target.querySelector('.chars');
      triggerChars(chars);
    }
  });
}, { threshold: 0.5 });

$$('.page-home .panel').forEach(p => panelIO.observe(p));

// ============================================================
//  渲染：作品
// ============================================================
async function renderWorks() {
  const left  = $('#worksColLeft');
  const right = $('#worksColRight');
  if (!left || !right) return;
  left.innerHTML = ''; right.innerHTML = '';
  let rows = [];
  try { rows = await API.list('works'); } catch (e) { console.warn(e); return; }
  rows.forEach(w => {
    const card = document.createElement('article');
    card.className = 'work-card';
    card.dataset.author = w.author;
    card.dataset.cat = w.cat;
    const cover = document.createElement('div');
    cover.className = 'work-cover';
    if (w.cover_url) cover.style.backgroundImage = `url(${esc(w.cover_url)})`;
    const meta = document.createElement('div');
    meta.className = 'work-meta';
    meta.innerHTML = `<span>${esc(catLabel(w.cat))}</span><span>${esc(String(w.year || ''))}</span>`;
    const title = document.createElement('h4');
    title.className = 'work-title';
    title.textContent = w.title || '';
    card.append(cover, meta, title);
    (w.author === 'qing' ? right : left).appendChild(card);
  });
  bindWorksFilter();
}

function bindWorksFilter() {
  const taoTool  = $('.works-tool[data-author="tao"]');
  const qingTool = $('.works-tool[data-author="qing"]');
  if (!taoTool || !qingTool) return;
  const getActive = (tool) => {
    const a = tool.querySelector('li.active');
    return a ? a.dataset.cat : null;
  };
  const apply = () => {
    const tCat = getActive(taoTool);
    const qCat = getActive(qingTool);
    $$('#worksColLeft .work-card, #worksColRight .work-card').forEach(c => {
      const side = c.parentElement === $('#worksColRight') ? 'qing' : 'tao';
      let show = true;
      if (side === 'tao'  && tCat) show = c.dataset.cat === tCat;
      if (side === 'qing' && qCat) show = c.dataset.cat === qCat;
      c.style.display = show ? '' : 'none';
    });
  };
  const toggle = (tool) => (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const wasActive = li.classList.contains('active');
    tool.querySelectorAll('li').forEach(i => i.classList.remove('active'));
    if (!wasActive) li.classList.add('active');
    apply();
  };
  taoTool.addEventListener('click', toggle(taoTool));
  qingTool.addEventListener('click', toggle(qingTool));
}

function catLabel(c) {
  return ({ host: '主持', produce: '制作', judge: '评委', music: '音乐' })[c] || c;
}

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ============================================================
//  渲染：CULTURE / NEWS / PROFILE / GUESTBOOK
// ============================================================
async function renderCulture() {
  const box = $('#cultureGrid');
  if (!box) return;
  box.innerHTML = '';
  let rows = [];
  try { rows = await API.list('culture'); } catch (e) { console.warn(e); return; }
  rows.forEach(c => {
    const card = document.createElement('article');
    card.className = 'culture-card';
    const cover = document.createElement('div');
    cover.className = 'culture-cover';
    if (c.image_url) cover.style.backgroundImage = `url(${esc(c.image_url)})`;
    const h3 = document.createElement('h3'); h3.className = 'culture-title'; h3.textContent = c.title || '';
    const m  = document.createElement('p');  m.className  = 'culture-meta';
    m.textContent = [c.author, c.year].filter(Boolean).join(' · ');
    const d  = document.createElement('p');  d.className  = 'culture-desc';
    d.textContent = c.description || '';
    card.append(cover, h3, m, d);
    box.appendChild(card);
  });
}

async function renderUpdates() {
  const box = $('#updatesList');
  if (!box) return;
  box.innerHTML = '';
  let rows = [];
  try { rows = await API.list('updates'); } catch (e) { console.warn(e); return; }
  rows.forEach(u => {
    const item = document.createElement('article');
    item.className = 't-item';
    item.innerHTML = `
      <div class="t-date">${esc(u.date || '')}</div>
      <p class="t-content">${esc(u.content || '')}</p>`;
    box.appendChild(item);
  });
}

async function renderProfile() {
  let rows = [];
  try { rows = await API.list('profile'); } catch (e) { console.warn(e); return; }
  rows.forEach(p => {
    const card = document.querySelector(`.profile-card[data-profile="${p.author_key}"]`);
    if (!card) return;
    if (p.photo_url) {
      const ph = card.querySelector('.profile-photo');
      if (ph) ph.style.backgroundImage = `url(${p.photo_url})`;
    }
    if (p.author_key === 'middle' && p.text_content) {
      const mid = document.querySelector('.profile-middle');
      if (mid) mid.innerHTML = p.text_content.split('\n').map(esc).join('<br>');
    }
  });
}

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

  // 2. 让首屏 home panel 立即入场（兜底，等 IO 异步触发）
  $$('.page-home .panel').forEach(p => {
    const chars = p.querySelector('.chars');
    triggerChars(chars);
  });

  // 3. URL hash → 切到对应页
  const init = (location.hash || '#home').replace('#', '');
  if (init && document.getElementById(init)) switchPage(init);

  // 4. 拉数据
  Promise.all([
    renderWorks(),
    renderCulture(),
    renderUpdates(),
    renderProfile(),
    loadMessages()
  ]);
});