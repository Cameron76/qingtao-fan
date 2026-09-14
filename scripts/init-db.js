// ========== 本地初始化数据库 ==========
// 用法（Node ≥ 20.6）：
//   1. 复制 .env.local.example 为 .env.local 并填入真实 token
//   2. npm install
//   3. node --env-file=.env.local scripts/init-db.js
import { ensureSchema, seedIfEmpty } from '../lib/db.js';

await ensureSchema();
await seedIfEmpty();
console.log('✓ 数据库 schema 与种子数据已就绪');