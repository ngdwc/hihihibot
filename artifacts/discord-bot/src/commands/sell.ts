import { EmbedBuilder, Message } from "discord.js";
import { DbUser, removeInventoryItem, updateMoney } from "../db.js";
import { ORES } from "./mine.js";
import { FISH_TABLE, FishType } from "./fish.js";
import { PLANT_TYPES, PlantType } from "./garden.js";
import { fmt } from "../utils.js";

// ─── Ore lookup (giữ nguyên hành vi cũ — giá cố định theo đơn vị) ───────────
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

// ─── Fish lookup ──────────────────────────────────────────────────────────
const FISH_BY_ID: Record<string, FishType> = {};
for (const fish of FISH_TABLE) {
  FISH_BY_ID[fish.id.toLowerCase()] = fish;
  FISH_BY_ID[fish.name.toLowerCase()] = fish;
}

// ─── Plant lookup ─────────────────────────────────────────────────────────
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
 * Usage: $sell <ore|fish|plant> <id> <quantity>
 * VD: $sell ore diamond 10 | $sell fish ca_hoi 3 | $sell plant carrot 5
 */
export async function handleSell(
  message: Message,
  args: string[],
  user: DbUser,
): Promise<EmbedBuilder> {
  const category = args[0]?.toLowerCase();
  const itemName = args[1]?.toLowerCase();
  const qty = parseInt(args[2] ?? "", 10);

  if (!category || !["ore", "fish", "plant"].includes(category)) {
    return errorEmbed(
      "❌ Danh mục không hợp lệ",
      "Dùng: `$sell <ore|fish|plant> <id> <số lượng>`\nVD: `$sell ore diamond 10`, `$sell fish ca_hoi 3`, `$sell plant carrot 5`",
    );
  }
  if (!itemName) {
    return errorEmbed(
      "❌ Lỗi",
      "Tên sản phẩm bị thiếu.\nVD: `$sell fish ca_hoi 3`",
    );
  }
  if (isNaN(qty) || qty <= 0) {
    return errorEmbed("❌ Số lượng không hợp lệ", "VD: `$sell plant carrot 5`");
  }

  if (category === "ore") return sellOre(user, itemName, qty);
  if (category === "fish") return sellFish(user, itemName, qty);
  return sellPlant(user, itemName, qty);
}

// ─────────────────────────────────────────────────────────────────────────
async function sellOre(
  user: DbUser,
  itemName: string,
  qty: number,
): Promise<EmbedBuilder> {
  const ore = ORE_BY_NAME[itemName];
  if (!ore) {
    const list = ORES.map((o) => `\`${o.name}\``).join(", ");
    return errorEmbed(
      "❌ Quặng không hợp lệ",
      `Quặng không tồn tại. Các loại: ${list}`,
    );
  }

  const success = await removeInventoryItem(
    user.discord_id,
    "ore",
    ore.name,
    qty,
  );
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
      {
        name: "📦 Đã bán",
        value: `${ore.emoji} ${ore.displayName} ×${qty}`,
        inline: true,
      },
      { name: "💵 Giá/cái", value: fmt(ore.price), inline: true },
      { name: "💰 Thu được", value: fmt(total), inline: true },
      {
        name: "💳 Số dư ví",
        value: fmt(Number(user.money) + total),
        inline: false,
      },
    );
}

// ─────────────────────────────────────────────────────────────────────────
async function sellFish(
  user: DbUser,
  itemName: string,
  qty: number,
): Promise<EmbedBuilder> {
  const fish = FISH_BY_ID[itemName];
  if (!fish) {
    const list = FISH_TABLE.map((f) => `\`${f.id}\``).join(", ");
    return errorEmbed(
      "❌ Cá không hợp lệ",
      `Cá không tồn tại. Các loại: ${list}`,
    );
  }

  const success = await removeInventoryItem(
    user.discord_id,
    "fish",
    fish.id,
    qty,
  );
  if (!success) {
    return errorEmbed(
      "❌ Không đủ số lượng",
      `Bạn không có đủ **${fish.emoji} ${fish.name}** ×${qty}.\nKiểm tra túi đồ: \`!inventory\``,
    );
  }

  let totalWeight = 0;
  let total = 0;
  for (let i = 0; i < qty; i++) {
    const w = randomWeight(fish.baseWeight);
    totalWeight += w;
    total += fish.basePrice * w;
  }
  total = Math.round(total);

  await updateMoney(user.discord_id, total);

  return new EmbedBuilder()
    .setColor("#1E90FF")
    .setTitle("💰 Bán cá thành công!")
    .addFields(
      {
        name: "📦 Đã bán",
        value: `${fish.emoji} ${fish.name} ×${qty}`,
        inline: true,
      },
      {
        name: "⚖️ Tổng cân nặng",
        value: `${totalWeight.toFixed(2)} kg`,
        inline: true,
      },
      { name: "💰 Thu được", value: fmt(total), inline: true },
      {
        name: "💳 Số dư ví",
        value: fmt(Number(user.money) + total),
        inline: false,
      },
    );
}

// ─────────────────────────────────────────────────────────────────────────
async function sellPlant(
  user: DbUser,
  itemName: string,
  qty: number,
): Promise<EmbedBuilder> {
  const plant = PLANT_BY_ID[itemName];
  if (!plant) {
    const list = PLANT_TYPES.map((p) => `\`${p.id}\``).join(", ");
    return errorEmbed(
      "❌ Nông sản không hợp lệ",
      `Không tồn tại. Các loại: ${list}`,
    );
  }

  const success = await removeInventoryItem(
    user.discord_id,
    "plant",
    plant.id,
    qty,
  );
  if (!success) {
    return errorEmbed(
      "❌ Không đủ số lượng",
      `Bạn không có đủ **${plant.emoji} ${plant.name}** ×${qty}.\nKiểm tra túi đồ: \`!inventory\``,
    );
  }

  const pricePerKg = plant.sellPrice / plant.baseWeight;
  let totalWeight = 0;
  let total = 0;
  for (let i = 0; i < qty; i++) {
    const w = randomWeight(plant.baseWeight);
    totalWeight += w;
    total += pricePerKg * w;
  }
  total = Math.round(total);

  await updateMoney(user.discord_id, total);

  return new EmbedBuilder()
    .setColor("#57C84D")
    .setTitle("💰 Bán nông sản thành công!")
    .addFields(
      {
        name: "📦 Đã bán",
        value: `${plant.emoji} ${plant.name} ×${qty}`,
        inline: true,
      },
      {
        name: "⚖️ Tổng cân nặng",
        value: `${totalWeight.toFixed(2)} kg`,
        inline: true,
      },
      { name: "💰 Thu được", value: fmt(total), inline: true },
      {
        name: "💳 Số dư ví",
        value: fmt(Number(user.money) + total),
        inline: false,
      },
    );
}
