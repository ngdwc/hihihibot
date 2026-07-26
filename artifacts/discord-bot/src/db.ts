import pg from 'pg';
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS discord_users (
      id SERIAL PRIMARY KEY,
      discord_id TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      exp INTEGER NOT NULL DEFAULT 0,
      money BIGINT NOT NULL DEFAULT 1000000,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS discord_inventory (
      id SERIAL PRIMARY KEY,
      discord_id TEXT NOT NULL,
      category TEXT NOT NULL,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      UNIQUE(discord_id, category, item_name)
    );

    CREATE TABLE IF NOT EXISTS discord_bank (
      id SERIAL PRIMARY KEY,
      discord_id TEXT NOT NULL UNIQUE,
      balance BIGINT NOT NULL DEFAULT 0,
      last_interest_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS discord_cooldowns (
      id SERIAL PRIMARY KEY,
      discord_id TEXT NOT NULL,
      command TEXT NOT NULL,
      last_used_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(discord_id, command)
    );
  `);
  console.log('[DB] Tables initialized');
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface DbUser {
  id: number;
  discord_id: string;
  username: string;
  level: number;
  exp: number;
  money: number;
  created_at: Date;
  updated_at: Date;
}

export async function getOrCreateUser(discordId: string, username: string): Promise<DbUser> {
  const existing = await pool.query<DbUser>(
    'SELECT * FROM discord_users WHERE discord_id = $1',
    [discordId]
  );
  if (existing.rows.length > 0) {
    await pool.query(
      'UPDATE discord_users SET username = $1, updated_at = NOW() WHERE discord_id = $2',
      [username, discordId]
    );
    return existing.rows[0];
  }
  const inserted = await pool.query<DbUser>(
    'INSERT INTO discord_users (discord_id, username) VALUES ($1, $2) RETURNING *',
    [discordId, username]
  );
  return inserted.rows[0];
}

export async function updateMoney(discordId: string, delta: number) {
  await pool.query(
    'UPDATE discord_users SET money = money + $1, updated_at = NOW() WHERE discord_id = $2',
    [delta, discordId]
  );
}

export async function setMoney(discordId: string, amount: number) {
  await pool.query(
    'UPDATE discord_users SET money = $1, updated_at = NOW() WHERE discord_id = $2',
    [amount, discordId]
  );
}

/** Returns { leveled, newLevel } */
export async function addExp(discordId: string, amount: number): Promise<{ leveled: boolean; newLevel: number }> {
  const res = await pool.query<DbUser>('SELECT level, exp FROM discord_users WHERE discord_id = $1', [discordId]);
  if (res.rows.length === 0) return { leveled: false, newLevel: 1 };

  let { level, exp } = res.rows[0];
  exp += amount;
  let leveled = false;

  while (true) {
    const needed = expToNextLevel(level);
    if (exp >= needed) {
      exp -= needed;
      level++;
      leveled = true;
    } else {
      break;
    }
  }

  await pool.query(
    'UPDATE discord_users SET level = $1, exp = $2, updated_at = NOW() WHERE discord_id = $3',
    [level, exp, discordId]
  );
  return { leveled, newLevel: level };
}

// ─── Level formula ────────────────────────────────────────────────────────────

/** EXP needed to go from `level` to `level+1` */
export function expToNextLevel(level: number): number {
  if (level === 1) return 50;
  return Math.round(50 * (1 + Math.pow(1.1, level)));
}

// ─── Cooldown ────────────────────────────────────────────────────────────────

/** Returns remaining ms if still on cooldown, or null if ready */
export async function checkCooldown(discordId: string, command: string, durationMs: number): Promise<number | null> {
  const res = await pool.query(
    'SELECT last_used_at FROM discord_cooldowns WHERE discord_id = $1 AND command = $2',
    [discordId, command]
  );
  if (res.rows.length === 0) return null;
  const elapsed = Date.now() - new Date(res.rows[0].last_used_at).getTime();
  if (elapsed >= durationMs) return null;
  return durationMs - elapsed;
}

export async function setCooldown(discordId: string, command: string) {
  await pool.query(
    `INSERT INTO discord_cooldowns (discord_id, command, last_used_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (discord_id, command) DO UPDATE SET last_used_at = NOW()`,
    [discordId, command]
  );
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface DbInventoryItem {
  id: number;
  discord_id: string;
  category: string;
  item_name: string;
  quantity: number;
}

export async function addInventoryItem(discordId: string, category: string, itemName: string, qty: number) {
  await pool.query(
    `INSERT INTO discord_inventory (discord_id, category, item_name, quantity)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (discord_id, category, item_name)
     DO UPDATE SET quantity = discord_inventory.quantity + $4`,
    [discordId, category, itemName, qty]
  );
}

/** Returns false if not enough quantity */
export async function removeInventoryItem(discordId: string, category: string, itemName: string, qty: number): Promise<boolean> {
  const res = await pool.query<DbInventoryItem>(
    'SELECT quantity FROM discord_inventory WHERE discord_id = $1 AND category = $2 AND item_name = $3',
    [discordId, category, itemName]
  );
  if (res.rows.length === 0 || res.rows[0].quantity < qty) return false;

  if (res.rows[0].quantity === qty) {
    await pool.query(
      'DELETE FROM discord_inventory WHERE discord_id = $1 AND category = $2 AND item_name = $3',
      [discordId, category, itemName]
    );
  } else {
    await pool.query(
      'UPDATE discord_inventory SET quantity = quantity - $4 WHERE discord_id = $1 AND category = $2 AND item_name = $3',
      [discordId, category, itemName, qty]
    );
  }
  return true;
}

export async function getInventory(discordId: string, category?: string): Promise<DbInventoryItem[]> {
  if (category) {
    const res = await pool.query<DbInventoryItem>(
      'SELECT * FROM discord_inventory WHERE discord_id = $1 AND category = $2 ORDER BY item_name',
      [discordId, category]
    );
    return res.rows;
  }
  const res = await pool.query<DbInventoryItem>(
    'SELECT * FROM discord_inventory WHERE discord_id = $1 ORDER BY category, item_name',
    [discordId]
  );
  return res.rows;
}

export async function hasItem(discordId: string, category: string, itemName: string): Promise<boolean> {
  const res = await pool.query(
    'SELECT quantity FROM discord_inventory WHERE discord_id = $1 AND category = $2 AND item_name = $3',
    [discordId, category, itemName]
  );
  return res.rows.length > 0 && res.rows[0].quantity > 0;
}

// ─── Bank ────────────────────────────────────────────────────────────────────

export interface DbBank {
  id: number;
  discord_id: string;
  balance: number;
  last_interest_at: Date;
}

export async function getOrCreateBank(discordId: string): Promise<DbBank> {
  const res = await pool.query<DbBank>('SELECT * FROM discord_bank WHERE discord_id = $1', [discordId]);
  if (res.rows.length > 0) return res.rows[0];
  const ins = await pool.query<DbBank>(
    'INSERT INTO discord_bank (discord_id) VALUES ($1) RETURNING *',
    [discordId]
  );
  return ins.rows[0];
}

export async function updateBank(discordId: string, delta: number) {
  await pool.query(
    'UPDATE discord_bank SET balance = balance + $1 WHERE discord_id = $2',
    [delta, discordId]
  );
}

/** Apply 0.5%/day interest and return interest earned */
export async function applyBankInterest(discordId: string): Promise<number> {
  const bank = await getOrCreateBank(discordId);
  if (bank.balance <= 0) return 0;

  const daysPassed = (Date.now() - new Date(bank.last_interest_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysPassed < 1) return 0;

  const fullDays = Math.floor(daysPassed);
  const interest = Math.floor(bank.balance * 0.005 * fullDays);
  if (interest <= 0) return 0;

  await pool.query(
    'UPDATE discord_bank SET balance = balance + $1, last_interest_at = NOW() WHERE discord_id = $2',
    [interest, discordId]
  );
  return interest;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export async function getLeaderboard(type: 'level' | 'money') {
  if (type === 'level') {
    const res = await pool.query<DbUser>(
      'SELECT discord_id, username, level, exp, money FROM discord_users ORDER BY level DESC, exp DESC LIMIT 10'
    );
    return res.rows;
  }
  const res = await pool.query<DbUser>(
    'SELECT discord_id, username, level, exp, money FROM discord_users ORDER BY money DESC LIMIT 10'
  );
  return res.rows;
}
