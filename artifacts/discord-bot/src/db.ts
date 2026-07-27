import mongoose, { Schema, model, Document, Types } from "mongoose";

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI must be set");
}

export async function initDb() {
  await mongoose.connect(process.env.MONGODB_URI!, {
    tls: true,
    tlsAllowInvalidCertificates: true,
    serverSelectionTimeoutMS: 10000,
  });
  console.log("[DB] Connected to MongoDB");
}

// ─── Public Interfaces ────────────────────────────────────────────────────────

export interface DbUser {
  discord_id: string;
  username: string;
  level: number;
  exp: number;
  money: number;
  virtue: number;
  equipped_achievement: string | null;
  meditating: boolean;
  meditation_started_at: Date | null;
  meditation_last_grant_at: Date | null;
  mine_count: number;
  fish_count: number;
  profanity_count: number;
  crime_success_count: number;
  harvest_count: number;
  meditation_minutes: number;
}

export interface DbInventoryItem {
  discord_id: string;
  category: string;
  item_name: string;
  quantity: number;
}

export interface DbBank {
  discord_id: string;
  balance: number;
  last_interest_at: Date;
}

export interface DbGardenPlot {
  plant_id: string | null;
  planted_at: number | null;
}

export interface DbGarden {
  discord_id: string;
  land: number;
  plots: DbGardenPlot[];
}

export const GARDEN_STARTING_PLOTS = 3;
export const GARDEN_MAX_PLOTS = 64;

export interface DbTaixiuSession {
  created_at: Date;
  dice: number[];
  total: number;
  result: "tai" | "xiu";
  bet_count: number;
  total_wagered: number;
}

export const TAIXIU_DEFAULT_BET = 10_000;

// ─── Mongoose Schemas ─────────────────────────────────────────────────────────

interface IUser extends Document {
  discordId: string;
  username: string;
  level: number;
  exp: number;
  money: number;
  virtue: number;
  equippedAchievement: string | null;
  meditating: boolean;
  meditationStartedAt: Date | null;
  meditationLastGrantAt: Date | null;
  mineCount: number;
  fishCount: number;
  profanityCount: number;
  crimeSuccessCount: number;
  harvestCount: number;
  meditationMinutes: number;
}

const UserSchema = new Schema<IUser>(
  {
    discordId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    level: { type: Number, default: 1 },
    exp: { type: Number, default: 0 },
    money: { type: Number, default: 1_000_000 },
    virtue: { type: Number, default: 100 },
    equippedAchievement: { type: String, default: null },
    meditating: { type: Boolean, default: false },
    meditationStartedAt: { type: Date, default: null },
    meditationLastGrantAt: { type: Date, default: null },
    mineCount: { type: Number, default: 0 },
    fishCount: { type: Number, default: 0 },
    profanityCount: { type: Number, default: 0 },
    crimeSuccessCount: { type: Number, default: 0 },
    harvestCount: { type: Number, default: 0 },
    meditationMinutes: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export const UserModel = model<IUser>("User", UserSchema);

interface IInventory extends Document {
  discordId: string;
  category: string;
  itemName: string;
  quantity: number;
}
const InventorySchema = new Schema<IInventory>({
  discordId: { type: String, required: true },
  category: { type: String, required: true },
  itemName: { type: String, required: true },
  quantity: { type: Number, default: 0 },
});
InventorySchema.index({ discordId: 1, category: 1, itemName: 1 }, { unique: true });
export const InventoryModel = model<IInventory>("Inventory", InventorySchema);

interface IBank extends Document {
  discordId: string;
  balance: number;
  lastInterestAt: Date;
}
const BankSchema = new Schema<IBank>({
  discordId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  lastInterestAt: { type: Date, default: Date.now },
});
export const BankModel = model<IBank>("Bank", BankSchema);

interface ICooldown extends Document {
  discordId: string;
  command: string;
  lastUsedAt: Date;
}
const CooldownSchema = new Schema<ICooldown>({
  discordId: { type: String, required: true },
  command: { type: String, required: true },
  lastUsedAt: { type: Date, default: Date.now },
});
CooldownSchema.index({ discordId: 1, command: 1 }, { unique: true });
export const CooldownModel = model<ICooldown>("Cooldown", CooldownSchema);

interface IGardenPlot {
  plantId: string | null;
  plantedAt: Date | null;
}
const GardenPlotSchema = new Schema<IGardenPlot>(
  { plantId: { type: String, default: null }, plantedAt: { type: Date, default: null } },
  { _id: false },
);
interface IGarden extends Document {
  discordId: string;
  land: number;
  plots: Types.DocumentArray<IGardenPlot>;
}
function emptyPlots() {
  return Array.from({ length: GARDEN_MAX_PLOTS }, () => ({ plantId: null, plantedAt: null }));
}
const GardenSchema = new Schema<IGarden>({
  discordId: { type: String, required: true, unique: true },
  land: { type: Number, default: GARDEN_STARTING_PLOTS },
  plots: { type: [GardenPlotSchema], default: emptyPlots },
});
export const GardenModel = model<IGarden>("Garden", GardenSchema);

interface ITaixiuBet extends Document { discordId: string; betAmount: number; }
const TaixiuBetSchema = new Schema<ITaixiuBet>({
  discordId: { type: String, required: true, unique: true },
  betAmount: { type: Number, default: TAIXIU_DEFAULT_BET },
});
export const TaixiuBetModel = model<ITaixiuBet>("TaixiuBet", TaixiuBetSchema);

interface ITaixiuSession extends Document {
  createdAt: Date; dice: number[]; total: number;
  result: string; betCount: number; totalWagered: number;
}
const TaixiuSessionSchema = new Schema<ITaixiuSession>({
  createdAt: { type: Date, default: Date.now },
  dice: { type: [Number], required: true },
  total: { type: Number, required: true },
  result: { type: String, required: true },
  betCount: { type: Number, default: 0 },
  totalWagered: { type: Number, default: 0 },
});
export const TaixiuSessionModel = model<ITaixiuSession>("TaixiuSession", TaixiuSessionSchema);

interface IAchievement extends Document {
  discordId: string;
  achievementId: string;
  earnedAt: Date;
}
const AchievementSchema = new Schema<IAchievement>({
  discordId: { type: String, required: true },
  achievementId: { type: String, required: true },
  earnedAt: { type: Date, default: Date.now },
});
AchievementSchema.index({ discordId: 1, achievementId: 1 }, { unique: true });
export const AchievementModel = model<IAchievement>("Achievement", AchievementSchema);

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toDbUser(doc: IUser): DbUser {
  return {
    discord_id: doc.discordId,
    username: doc.username,
    level: doc.level ?? 1,
    exp: doc.exp ?? 0,
    money: doc.money ?? 1_000_000,
    virtue: doc.virtue ?? 100,
    equipped_achievement: doc.equippedAchievement ?? null,
    meditating: doc.meditating ?? false,
    meditation_started_at: doc.meditationStartedAt ?? null,
    meditation_last_grant_at: doc.meditationLastGrantAt ?? null,
    mine_count: doc.mineCount ?? 0,
    fish_count: doc.fishCount ?? 0,
    profanity_count: doc.profanityCount ?? 0,
    crime_success_count: doc.crimeSuccessCount ?? 0,
    harvest_count: doc.harvestCount ?? 0,
    meditation_minutes: doc.meditationMinutes ?? 0,
  };
}
function toDbBank(doc: IBank): DbBank {
  return { discord_id: doc.discordId, balance: doc.balance, last_interest_at: doc.lastInterestAt };
}
function toDbInv(doc: IInventory): DbInventoryItem {
  return { discord_id: doc.discordId, category: doc.category, item_name: doc.itemName, quantity: doc.quantity };
}
function toDbTaixiuSession(doc: ITaixiuSession): DbTaixiuSession {
  return {
    created_at: doc.createdAt, dice: doc.dice, total: doc.total,
    result: doc.result as "tai" | "xiu", bet_count: doc.betCount, total_wagered: doc.totalWagered,
  };
}
function toDbGarden(doc: IGarden): DbGarden {
  return {
    discord_id: doc.discordId,
    land: doc.land,
    plots: doc.plots.map((p) => ({
      plant_id: p.plantId ?? null,
      planted_at: p.plantedAt ? p.plantedAt.getTime() : null,
    })),
  };
}

// ─── User helpers ─────────────────────────────────────────────────────────────

export async function getOrCreateUser(discordId: string, username: string): Promise<DbUser> {
  const doc = await UserModel.findOneAndUpdate(
    { discordId },
    { $set: { username }, $setOnInsert: { discordId, level: 1, exp: 0, money: 1_000_000, virtue: 100 } },
    { upsert: true, new: true },
  );
  return toDbUser(doc!);
}

export async function updateMoney(discordId: string, delta: number) {
  await UserModel.updateOne({ discordId }, { $inc: { money: delta } });
}

export async function setMoney(discordId: string, amount: number) {
  await UserModel.updateOne({ discordId }, { $set: { money: amount } });
}

export async function addExp(discordId: string, amount: number): Promise<{ leveled: boolean; newLevel: number }> {
  const doc = await UserModel.findOne({ discordId });
  if (!doc) return { leveled: false, newLevel: 1 };
  let { level, exp } = doc;
  exp += amount;
  let leveled = false;
  while (true) {
    const needed = expToNextLevel(level);
    if (exp >= needed) { exp -= needed; level++; leveled = true; } else break;
  }
  await UserModel.updateOne({ discordId }, { $set: { level, exp } });
  return { leveled, newLevel: level };
}

export function expToNextLevel(level: number): number {
  if (level === 1) return 50;
  return Math.round(50 * (1 + Math.pow(1.1, level)));
}

// ─── Virtue helpers ───────────────────────────────────────────────────────────

/** Delta ±, no upper limit. Returns new virtue value. */
export async function updateVirtue(discordId: string, delta: number): Promise<number> {
  const doc = await UserModel.findOne({ discordId });
  if (!doc) return 100;
  const current = doc.virtue ?? 100;
  const newV = current + delta;
  await UserModel.updateOne({ discordId }, { $set: { virtue: newV } });
  return newV;
}

/** Returns luck bonus: e.g. +0.05 for virtue=150, -0.1 for virtue=0 */
export function getVirtueLuckBonus(virtue: number): number {
  return (virtue - 100) * 0.001; // ±0.001 per point from 100
}

// ─── Stat counters ────────────────────────────────────────────────────────────

export type UserStat = "mineCount" | "fishCount" | "profanityCount" | "crimeSuccessCount" | "harvestCount" | "meditationMinutes";

export async function incrementStat(discordId: string, stat: UserStat, amount = 1): Promise<number> {
  const doc = await UserModel.findOneAndUpdate(
    { discordId },
    { $inc: { [stat]: amount } },
    { new: true },
  );
  return (doc as any)?.[stat] ?? 0;
}

// ─── Achievement helpers ──────────────────────────────────────────────────────

/**
 * Grant achievement if condition is true and not already earned.
 * Returns true if newly earned.
 */
export async function checkAndGrant(
  discordId: string,
  achievementId: string,
  condition: boolean,
): Promise<boolean> {
  if (!condition) return false;
  try {
    await AchievementModel.create({ discordId, achievementId });
    return true;
  } catch (err: any) {
    if (err?.code === 11000) return false; // already earned
    throw err;
  }
}

export async function getUserAchievements(discordId: string): Promise<string[]> {
  const docs = await AchievementModel.find({ discordId });
  return docs.map((d) => d.achievementId);
}

export async function equipAchievement(discordId: string, achievementId: string | null): Promise<void> {
  await UserModel.updateOne({ discordId }, { $set: { equippedAchievement: achievementId } });
}

// ─── Meditation helpers ───────────────────────────────────────────────────────

export async function startMeditation(discordId: string): Promise<boolean> {
  const doc = await UserModel.findOne({ discordId });
  if (!doc || (doc.meditating ?? false)) return false;
  const now = new Date();
  await UserModel.updateOne(
    { discordId },
    { $set: { meditating: true, meditationStartedAt: now, meditationLastGrantAt: now } },
  );
  return true;
}

/** Stop meditation, returns stats and grants pending virtue. */
export async function stopMeditation(
  discordId: string,
): Promise<{ minutesMeditated: number; virtueGranted: number; newVirtue: number } | null> {
  const doc = await UserModel.findOne({ discordId });
  if (!doc || !(doc.meditating ?? false)) return null;
  const now = Date.now();
  const startedAt = doc.meditationStartedAt?.getTime() ?? now;
  const lastGrantAt = doc.meditationLastGrantAt?.getTime() ?? startedAt;
  const minutesMeditated = Math.floor((now - startedAt) / 60_000);
  const pendingGrants = Math.floor((now - lastGrantAt) / (15 * 60_000));
  const newVirtue = (doc.virtue ?? 100) + pendingGrants;
  await UserModel.updateOne(
    { discordId },
    {
      $set: { meditating: false, meditationStartedAt: null, meditationLastGrantAt: null, virtue: newVirtue },
      $inc: { meditationMinutes: minutesMeditated },
    },
  );
  return { minutesMeditated, virtueGranted: pendingGrants, newVirtue };
}

/** Returns all meditating users (for background timer). */
export async function getMeditatingUsers(): Promise<
  Array<{ discordId: string; meditationLastGrantAt: Date; virtue: number }>
> {
  const docs = await UserModel.find(
    { meditating: true },
    { discordId: 1, meditationLastGrantAt: 1, virtue: 1 },
  );
  return docs.map((d) => ({
    discordId: d.discordId,
    meditationLastGrantAt: d.meditationLastGrantAt ?? new Date(),
    virtue: d.virtue ?? 100,
  }));
}

/** Grant meditation virtue grants without stopping meditation. */
export async function grantMeditationVirtue(discordId: string, grants: number): Promise<number> {
  const doc = await UserModel.findOne({ discordId });
  if (!doc) return 0;
  const newVirtue = (doc.virtue ?? 100) + grants;
  await UserModel.updateOne(
    { discordId },
    { $set: { virtue: newVirtue, meditationLastGrantAt: new Date() } },
  );
  return newVirtue;
}

// ─── Cooldown helpers ─────────────────────────────────────────────────────────

export async function checkCooldown(discordId: string, command: string, durationMs: number): Promise<number | null> {
  const doc = await CooldownModel.findOne({ discordId, command });
  if (!doc) return null;
  const elapsed = Date.now() - doc.lastUsedAt.getTime();
  if (elapsed >= durationMs) return null;
  return durationMs - elapsed;
}

export async function setCooldown(discordId: string, command: string) {
  await CooldownModel.findOneAndUpdate(
    { discordId, command },
    { $set: { lastUsedAt: new Date() } },
    { upsert: true },
  );
}

// ─── Inventory helpers ────────────────────────────────────────────────────────

export async function addInventoryItem(discordId: string, category: string, itemName: string, qty: number) {
  await InventoryModel.findOneAndUpdate(
    { discordId, category, itemName },
    { $inc: { quantity: qty } },
    { upsert: true },
  );
}

export async function removeInventoryItem(
  discordId: string, category: string, itemName: string, qty: number,
): Promise<boolean> {
  const doc = await InventoryModel.findOne({ discordId, category, itemName });
  if (!doc || doc.quantity < qty) return false;
  if (doc.quantity === qty) {
    await InventoryModel.deleteOne({ discordId, category, itemName });
  } else {
    await InventoryModel.updateOne({ discordId, category, itemName }, { $inc: { quantity: -qty } });
  }
  return true;
}

export async function getInventory(discordId: string, category?: string): Promise<DbInventoryItem[]> {
  const filter: Record<string, string> = { discordId };
  if (category) filter["category"] = category;
  const docs = await InventoryModel.find(filter).sort({ category: 1, itemName: 1 });
  return docs.map(toDbInv);
}

export async function hasItem(discordId: string, category: string, itemName: string): Promise<boolean> {
  const doc = await InventoryModel.findOne({ discordId, category, itemName });
  return !!doc && doc.quantity > 0;
}

export async function getItemQuantity(discordId: string, category: string, itemName: string): Promise<number> {
  const doc = await InventoryModel.findOne({ discordId, category, itemName });
  return doc?.quantity ?? 0;
}

// ─── Rod / Pickaxe level helpers ──────────────────────────────────────────────

export async function getRodLevel(discordId: string): Promise<0 | 1 | 2 | 3> {
  if (await hasItem(discordId, "item", "fishing_rod_lv3")) return 3;
  if (await hasItem(discordId, "item", "fishing_rod_lv2")) return 2;
  if (await hasItem(discordId, "item", "fishing_rod_lv1") || await hasItem(discordId, "item", "fishing_rod")) return 1;
  return 0;
}

export async function getPickaxeLevel(discordId: string): Promise<0 | 1 | 2 | 3> {
  if (await hasItem(discordId, "item", "diamond_pickaxe_lv3")) return 3;
  if (await hasItem(discordId, "item", "diamond_pickaxe_lv2")) return 2;
  if (await hasItem(discordId, "item", "diamond_pickaxe_lv1") || await hasItem(discordId, "item", "diamond_pickaxe")) return 1;
  return 0;
}

// ─── Bank helpers ─────────────────────────────────────────────────────────────

export async function getOrCreateBank(discordId: string): Promise<DbBank> {
  const doc = await BankModel.findOneAndUpdate(
    { discordId },
    { $setOnInsert: { discordId, balance: 0, lastInterestAt: new Date() } },
    { upsert: true, new: true },
  );
  return toDbBank(doc!);
}

export async function updateBank(discordId: string, delta: number) {
  await BankModel.updateOne({ discordId }, { $inc: { balance: delta } });
}

export async function applyBankInterest(discordId: string): Promise<number> {
  const doc = await BankModel.findOne({ discordId });
  if (!doc || doc.balance <= 0) return 0;
  const daysPassed = (Date.now() - doc.lastInterestAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysPassed < 1) return 0;
  const fullDays = Math.floor(daysPassed);
  const interest = Math.floor(doc.balance * 0.025 * fullDays);
  if (interest <= 0) return 0;
  await BankModel.updateOne(
    { discordId },
    { $inc: { balance: interest }, $set: { lastInterestAt: new Date() } },
  );
  return interest;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard(type: "level" | "money"): Promise<DbUser[]> {
  const sort = type === "level" ? { level: -1, exp: -1 } : { money: -1 };
  const docs = await UserModel.find().sort(sort as any).limit(10);
  return docs.map(toDbUser);
}

// ─── Garden helpers ───────────────────────────────────────────────────────────

export async function getOrCreateGarden(discordId: string): Promise<DbGarden> {
  const doc = await GardenModel.findOneAndUpdate(
    { discordId },
    { $setOnInsert: { discordId, land: GARDEN_STARTING_PLOTS, plots: emptyPlots() } },
    { upsert: true, new: true },
  );
  return toDbGarden(doc!);
}

export async function buyGardenLand(discordId: string, cost: number): Promise<number> {
  await updateMoney(discordId, -cost);
  const doc = await GardenModel.findOneAndUpdate(
    { discordId },
    { $inc: { land: 1 }, $setOnInsert: { plots: emptyPlots() } },
    { upsert: true, new: true },
  );
  return doc!.land;
}

export async function plantSeed(discordId: string, plotIndex: number, plantId: string): Promise<void> {
  await GardenModel.updateOne(
    { discordId },
    { $set: { [`plots.${plotIndex}.plantId`]: plantId, [`plots.${plotIndex}.plantedAt`]: new Date() } },
  );
}

/** Thu hoạch: cộng tiền vào ví (không còn — bây giờ thêm vào inventory trong garden.ts) */
export async function clearPlot(discordId: string, plotIndex: number): Promise<void> {
  await GardenModel.updateOne(
    { discordId },
    { $set: { [`plots.${plotIndex}.plantId`]: null, [`plots.${plotIndex}.plantedAt`]: null } },
  );
}

// ─── Tài Xỉu helpers ──────────────────────────────────────────────────────────

export async function getTaixiuBetAmount(discordId: string): Promise<number> {
  const doc = await TaixiuBetModel.findOne({ discordId });
  return doc?.betAmount ?? TAIXIU_DEFAULT_BET;
}

export async function setTaixiuBetAmount(discordId: string, amount: number): Promise<void> {
  await TaixiuBetModel.findOneAndUpdate({ discordId }, { $set: { betAmount: amount } }, { upsert: true });
}

export async function saveTaixiuSession(
  dice: number[], total: number, result: "tai" | "xiu", betCount: number, totalWagered: number,
): Promise<void> {
  await TaixiuSessionModel.create({ dice, total, result, betCount, totalWagered });
}

export async function getRecentTaixiuSessions(limit = 5): Promise<DbTaixiuSession[]> {
  const docs = await TaixiuSessionModel.find().sort({ createdAt: -1 }).limit(limit);
  return docs.map(toDbTaixiuSession);
}
