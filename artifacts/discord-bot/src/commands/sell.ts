import { EmbedBuilder, Message } from "discord.js";
import { DbUser, removeInventoryItem, updateMoney, getInventory } from "../db.js";
import { ORES } from "./mine.js";
import { FISH_TABLE, FishType } from "./fish.js";
import { PLANT_TYPES, PlantType } from "./garden.js";
import { fmt } from "../utils.js";

// ─── Ore lookup ───────────────────────────────────────────────────────────────
const ORE_BY_NAME: Record<string, (typeof ORES)[number]> = {};
for (const ore of ORES) {
  ORE_BY_NAME[ore.name.toLowerCase()] = ore;
  ORE_BY_NAME[ore.displayName.toLowerCase()] = ore;
}
ORE_BY_NAME["da"] = ORE_BY_NAME["stone"]!;
ORE_BY_NAME["dong"] = ORE_BY_NAME["copper"]!;
ORE_BY_NAME["sat"] = ORE_BY_NAME["iron"]!;
ORE_BY_NAME["vang"] = ORE_BY_NAME["gold"]!;
ORE_BY_NAME["kim cuong"] = ORE_BY_NAME["diamond"]!;
ORE_BY_NAME["ngoc bich"] = ORE_BY_NAME["emerald"]!;
ORE_BY_NAME["ngocbich"] = ORE_BY_NAME["emerald"]!;
ORE_BY_NAME["kimcuong"] = ORE_BY_NAME["diamond"]!;

// ─── Fish lookup ──────────────────────────────────────────────────────────────
const FISH_BY_ID: Record<string, FishType> = {};
for (const fish of FISH_TABLE) {
  FISH_BY_ID[fish.id.toLowerCase()] = fish;
  FISH_BY_ID[fish.name.toLowerCase()] = fish;
}

// ─── Plant lookup ─────────────────────────────────────────────────────────────
const PLANT_BY_ID: Record<string, PlantType> = {};
for (const plant of PLANT_TYPES) {
  PLANT_BY_ID[plant.id.toLowerCase()] = plant;
  PLANT_BY_ID[plant.name.toLowerCase()] = plant;
}

/** Cân nặng ngẫu nhiên trong khoảng [baseWeight, 2×baseWeight]. */
function randomWeight(baseWeight: number): number {
  return baseWeight + Math.random() * baseWeight;
}

function errorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor("#FF4444")
    .setTitle(title)
    .setDescription(description);
}

/**
 * Usage: $sell <ore|fish|plant> <id|all> [quantity]
 * VD: $sell ore diamond 10 | $sell fish ca_hoi 3 | $sell plant carrot 5
 *     $sell ore all | $sell fish all | $sell plant all
 */
export async function handleSell(
  message: Message,
  args: string[],
  user: DbUser,
): Promise<EmbedBuilder> {
  const category = args[0]?.toLowerCase();
  const itemOrAll = args[1]?.toLowerCase();

  if (!category || !["ore", "fish", "plant"].includes(category)) {
    return errorEmbed(
      "❌ Danh mục không hợp lệ",
      "Dùng: `$sell <ore|fish|plant> <id|all> [số lượng]`\nVD: `$sell ore diamond 10`, `$sell fish all`, `$sell plant carrot 5`",
    );
  }

  // ── Bán tất cả ($sell <cat> all) ────────────────────────────────────────
  if (itemOrAll === "all") {
    if (category === "ore") return sellAllOres(user);
    if (category === "fish") return sellAllFish(user);
    return sellAllPlants(user);
  }

  // ── Bán thông thường ─────────────────────────────────────────────────────
  const itemName = itemOrAll;
  if (!itemName) {
    return errorEmbed(
      "❌ Lỗi",
      "Tên sản phẩm bị thiếu. VD: `$sell fish ca_hoi 3` hoặc `$sell fish all`",
    );
  }
  const qty = parseInt(args[2] ?? "", 10);
  if (isNaN(qty) || qty <= 0) {
    return errorEmbed(
      "❌ Số lượng không hợp lệ",
      "VD: `$sell plant carrot 5` hoặc `$sell plant all`",
    );
  }

  if (category === "ore") return sellOre(user, itemName, qty);
  if (category === "fish") return sellFish(user, itemName, qty);
  return sellPlant(user, itemName, qty);
}

// ─── Bán tất cả theo danh mục ────────────────────────────────────────────────

async function sellAllOres(user: DbUser): Promise<EmbedBuilder> {
  const items = await getInventory(user.discord_id, "ore");
  if (items.length === 0) {
    return errorEmbed("❌ Túi trống", "Bạn không có quặng nào để bán.");
  }

  let total = 0;
  const lines: string[] = [];
  for (const item of items) {
    const ore = ORE_BY_NAME[item.item_name];
    if (!ore) continue;
    const earned = ore.price * item.quantity;
    total += earned;
    await removeInventoryItem(user.discord_id, "ore", item.item_name, item.quantity);
    lines.push(`${ore.emoji} ${ore.displayName} ×${item.quantity} — ${fmt(earned)}`);
  }

  if (total === 0) return errorEmbed("❌ Túi trống", "Không có quặng hợp lệ để bán.");
  await updateMoney(user.discord_id, total);

  return new EmbedBuilder()
    .setColor("#00FF88")
    .setTitle("💰 Bán tất cả quặng!")
    .setDescription(lines.join("\n"))
    .addFields(
      { name: "💰 Tổng thu", value: fmt(total), inline: true },
      { name: "💳 Số dư ví", value: fmt(Number(user.money) + total), inline: true },
    );
}

async function sellAllFish(user: DbUser): Promise<EmbedBuilder> {
  const items = await getInventory(user.discord_id, "fish");
  if (items.length === 0) {
    return errorEmbed("❌ Túi trống", "Bạn không có cá nào để bán.");
  }

  let total = 0;
  const lines: string[] = [];
  for (const item of items) {
    const fish = FISH_BY_ID[item.item_name];
    if (!fish) continue;
    let earned = 0;
    for (let i = 0; i < item.quantity; i++) earned += fish.basePrice * randomWeight(fish.baseWeight);
    earned = Math.round(earned);
    total += earned;
    await removeInventoryItem(user.discord_id, "fish", item.item_name, item.quantity);
    lines.push(`${fish.emoji} ${fish.name} ×${item.quantity} — ${fmt(earned)}`);
  }

  if (total === 0) return errorEmbed("❌ Túi trống", "Không có cá hợp lệ để bán.");
  await updateMoney(user.discord_id, total);

  return new EmbedBuilder()
    .setColor("#1E90FF")
    .setTitle("💰 Bán tất cả cá!")
    .setDescription(lines.join("\n"))
    .addFields(
      { name: "💰 Tổng thu", value: fmt(total), inline: true },
      { name: "💳 Số dư ví", value: fmt(Number(user.money) + total), inline: true },
    );
}

async function sellAllPlants(user: DbUser): Promise<EmbedBuilder> {
  const items = await getInventory(user.discord_id, "plant");
  if (items.length === 0) {
    return errorEmbed("❌ Túi trống", "Bạn không có nông sản nào để bán.");
  }

  let total = 0;
  const lines: string[] = [];
  for (const item of items) {
    const plant = PLANT_BY_ID[item.item_name];
    if (!plant) continue;
    const pricePerKg = plant.sellPrice / plant.baseWeight;
    let earned = 0;
    for (let i = 0; i < item.quantity; i++) earned += pricePerKg * randomWeight(plant.baseWeight);
    earned = Math.round(earned);
    total += earned;
    await removeInventoryItem(user.discord_id, "plant", item.item_name, item.quantity);
    lines.push(`${plant.emoji} ${plant.name} ×${item.quantity} — ${fmt(earned)}`);
  }

  if (total === 0) return errorEmbed("❌ Túi trống", "Không có nông sản hợp lệ để bán.");
  await updateMoney(user.discord_id, total);

  return new EmbedBuilder()
    .setColor("#57C84D")
    .setTitle("💰 Bán tất cả nông sản!")
    .setDescription(lines.join("\n"))
    .addFields(
      { name: "💰 Tổng thu", value: fmt(total), inline: true },
      { name: "💳 Số dư ví", value: fmt(Number(user.money) + total), inline: true },
    );
}

// ─── Bán từng loại (giữ nguyên logic cũ) ────────────────────────────────────

async function sellOre(user: DbUser, itemName: string, qty: number): Promise<EmbedBuilder> {
  const ore = ORE_BY_NAME[itemName];
  if (!ore) {
    const list = ORES.map((o) => `\`${o.name}\``).join(", ");
    return errorEmbed("❌ Quặng không hợp lệ", `Quặng không tồn tại. Các loại: ${list}`);
  }

  const success = await removeInventoryItem(user.discord_id, "ore", ore.name, qty);
  if (!success) {
    return errorEmbed(
      "❌ Không đủ số lượng",
      `Bạn không có đủ **${ore.emoji} ${ore.displayName}** ×${qty}.\nKiểm tra túi đồ: \`!inventory\``,
    );
  }

  const total = ore.price * qty;
  await updateMoney(user.discord_id, total);

  return new EmbedBuilder()
    .setColor("#00FF88")
    .setTitle("💰 Bán thành công!")
    .addFields(
      { name: "📦 Đã bán", value: `${ore.emoji} ${ore.displayName} ×${qty}`, inline: true },
      { name: "💵 Giá/cái", value: fmt(ore.price), inline: true },
      { name: "💰 Thu được", value: fmt(total), inline: true },
      { name: "💳 Số dư ví", value: fmt(Number(user.money) + total), inline: false },
    );
}

async function sellFish(user: DbUser, itemName: string, qty: number): Promise<EmbedBuilder> {
  const fish = FISH_BY_ID[itemName];
  if (!fish) {
    const list = FISH_TABLE.map((f) => `\`${f.id}\``).join(", ");
    return errorEmbed("❌ Cá không hợp lệ", `Cá không tồn tại. Các loại: ${list}`);
  }

  const success = await removeInventoryItem(user.discord_id, "fish", fish.id, qty);
  if (!success) {
    return errorEmbed(
      "❌ Không đủ số lượng",
      `Bạn không có đủ **${fish.emoji} ${fish.name}** ×${qty}.\nKiểm tra túi đồ: \`!inventory\``,
    );
  }

  let total = 0;
  for (let i = 0; i < qty; i++) total += fish.basePrice * randomWeight(fish.baseWeight);
  total = Math.round(total);
  await updateMoney(user.discord_id, total);

  return new EmbedBuilder()
    .setColor("#1E90FF")
    .setTitle("💰 Bán cá thành công!")
    .addFields(
      { name: "📦 Đã bán", value: `${fish.emoji} ${fish.name} ×${qty}`, inline: true },
      { name: "💰 Thu được", value: fmt(total), inline: true },
      { name: "💳 Số dư ví", value: fmt(Number(user.money) + total), inline: false },
    );
}

async function sellPlant(user: DbUser, itemName: string, qty: number): Promise<EmbedBuilder> {
  const plant = PLANT_BY_ID[itemName];
  if (!plant) {
    const list = PLANT_TYPES.map((p) => `\`${p.id}\``).join(", ");
    return errorEmbed("❌ Nông sản không hợp lệ", `Không tồn tại. Các loại: ${list}`);
  }

  const success = await removeInventoryItem(user.discord_id, "plant", plant.id, qty);
  if (!success) {
    return errorEmbed(
      "❌ Không đủ số lượng",
      `Bạn không có đủ **${plant.emoji} ${plant.name}** ×${qty}.\nKiểm tra túi đồ: \`!inventory\``,
    );
  }

  const pricePerKg = plant.sellPrice / plant.baseWeight;
  let total = 0;
  for (let i = 0; i < qty; i++) total += pricePerKg * randomWeight(plant.baseWeight);
  total = Math.round(total);
  await updateMoney(user.discord_id, total);

  return new EmbedBuilder()
    .setColor("#57C84D")
    .setTitle("💰 Bán nông sản thành công!")
    .addFields(
      { name: "📦 Đã bán", value: `${plant.emoji} ${plant.name} ×${qty}`, inline: true },
      { name: "💰 Thu được", value: fmt(total), inline: true },
      { name: "💳 Số dư ví", value: fmt(Number(user.money) + total), inline: false },
    );
}
