// ========== Turso (LibSQL) 连接模块 ==========
// 单例缓存，避免每次请求都新建 client。
import { createClient } from '@libsql/client';

let cached = null;

export function getDB() {
  if (cached) return cached;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    throw new Error('环境变量 TURSO_DATABASE_URL 未设置');
  }
  cached = createClient({ url, authToken });
  return cached;
}

// ========== 表结构 ==========
// 幂等：每次启动都执行一次，已存在则自动跳过。
export async function ensureSchema() {
  const db = getDB();
  const stmts = [
    // 作品
    `CREATE TABLE IF NOT EXISTS works (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      author      TEXT NOT NULL,                          -- tao / qing
      cat         TEXT NOT NULL,                          -- host / produce / judge / music
      year        INTEGER NOT NULL,
      title       TEXT NOT NULL,
      cover_url   TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    )`,
    // 考古 / STORY
    `CREATE TABLE IF NOT EXISTS stories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url   TEXT NOT NULL,
      title       TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    )`,
    // 视频
    `CREATE TABLE IF NOT EXISTS videos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      duration    TEXT,
      year        INTEGER,
      thumb_url   TEXT,
      video_url   TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    )`,
    // CULTURE 熏陶
    `CREATE TABLE IF NOT EXISTS culture (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      author      TEXT,
      year        INTEGER,
      image_url   TEXT,
      description TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    )`,
    // NEWS 动态
    `CREATE TABLE IF NOT EXISTS updates (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT NOT NULL,
      title       TEXT NOT NULL,
      content     TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    )`,
    // 留言
    `CREATE TABLE IF NOT EXISTS guestbook (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      message     TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    )`,
    // 个人简介
    `CREATE TABLE IF NOT EXISTS profile (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      author_key    TEXT NOT NULL UNIQUE,                 -- tao / qing
      photo_url     TEXT,
      text_content  TEXT
    )`,
    // 文件上传（base64 存储，供 works.cover_url / stories.image_url / videos.thumb_url 引用）
    `CREATE TABLE IF NOT EXISTS uploads (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      filename    TEXT NOT NULL,
      mime        TEXT NOT NULL,
      data        TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    )`
  ];
  for (const sql of stmts) {
    await db.execute(sql);
  }

  // 为已有 works 表补充 link_url 列（幂等：列已存在时忽略错误）
  try { await db.execute(`ALTER TABLE works ADD COLUMN link_url TEXT`); } catch (_) {}

  // 为已有 culture 表补充 type / link_url 列（幂等）
  try { await db.execute(`ALTER TABLE culture ADD COLUMN type TEXT`); } catch (_) {}
  try { await db.execute(`ALTER TABLE culture ADD COLUMN link_url TEXT`); } catch (_) {}
}

// ========== 种子数据 ==========
// 各表无记录时插入演示数据，方便前端首次访问就有内容。
export async function seedIfEmpty() {
  const db = getDB();

  const seeds = [
    {
      table: 'works',
      rows: [
        { author: 'tao',  cat: 'music',   year: 2025, title: '《碧落》',         cover_url: null },
        { author: 'tao',  cat: 'produce', year: 2025, title: '《韶华》巡演纪录片', cover_url: null },
        { author: 'qing', cat: 'host',    year: 2025, title: '《朗读者》第三季',   cover_url: null },
        { author: 'qing', cat: 'judge',   year: 2024, title: '《中国诗词大会》',   cover_url: null }
      ]
    },
    {
      table: 'stories',
      rows: [
        { image_url: '', title: '2008 · 初见' },
        { image_url: '', title: '2012 · 同台' },
        { image_url: '', title: '2016 · 山海' },
        { image_url: '', title: '2020 · 碧落' },
        { image_url: '', title: '2025 · 长歌' }
      ]
    },
    {
      table: 'videos',
      rows: [
        { title: '《碧落》官方 MV',  duration: '04:32', year: 2025 },
        { title: '《韶华》演唱会幕后', duration: '12:08', year: 2025 },
        { title: '采访 · 关于创作',    duration: '08:45', year: 2024 }
      ]
    },
    {
      table: 'updates',
      rows: [
        { date: '2025 · 09 · 01', title: '新单曲《碧落》正式上线',
          content: '历时一年精心打磨的全新单曲，于今日全平台同步发行，献给每一个与光同行的人。' },
        { date: '2025 · 08 · 15', title: '《韶华》巡演首站圆满落幕',
          content: '近两万人的场馆内，灯光与歌声交织，共同见证了一个难忘的夜晚。' },
        { date: '2025 · 07 · 20', title: '《山海之间》入围年度剧集',
          content: '凭借细腻入微的表演，卿涛首次获得主流剧集奖项的提名认可。' }
      ]
    },
    {
      table: 'guestbook',
      rows: [
        { name: '青柠', message: '新单曲循环了一整天，声音太治愈了！' },
        { name: '山海', message: '期待下一部作品，永远支持卿涛～' }
      ]
    },
    {
      table: 'profile',
      rows: [
        { author_key: 'tao',  photo_url: null, text_content: '周涛 · 主持人 / 制作人' },
        { author_key: 'qing', photo_url: null, text_content: '董卿 · 主持人 / 制作人' }
      ]
    }
  ];

  for (const s of seeds) {
    const c = await db.execute(`SELECT COUNT(*) AS n FROM ${s.table}`);
    if (Number(c.rows[0].n) > 0) continue;
    for (const r of s.rows) {
      const cols = Object.keys(r);
      const placeholders = cols.map(() => '?').join(', ');
      await db.execute({
        sql: `INSERT INTO ${s.table} (${cols.join(', ')}) VALUES (${placeholders})`,
        args: cols.map(k => r[k])
      });
    }
  }
}