import { EmbedBuilder, Message } from "discord.js";
import {
  DbUser,
  checkCooldown,
  setCooldown,
  addInventoryItem,
  addExp,
  hasItem,
} from "../db.js";
import { fmt, fmtTime, weightedRandom, randInt } from "../utils.js";

const COOLDOWN = 10 * 60 * 1000; // 10 minutes

interface Ore {
  name: string;
  emoji: string;
  displayName: string;
  chance: number;
  price: number;
}

export const ORES: Ore[] = [
  { name: "stone", emoji: "🪨", displayName: "Đá", chance: 56.5, price: 100 },
  {
    name: "copper",
    emoji: "🟤",
    displayName: "Đồng",
    chance: 25,
    price: 3_500,
  },
  { name: "iron", emoji: "⚙️", displayName: "Sắt", chance: 10, price: 10_500 },
  { name: "gold", emoji: "🟡", displayName: "Vàng", chance: 5, price: 800_000 },
  {
    name: "diamond",
    emoji: "💎",
    displayName: "Kim cương",
    chance: 2.5,
    price: 5_000_000,
  },
  {
    name: "emerald",
    emoji: "💚",
    displayName: "Ngọc bích",
    chance: 1,
    price: 10_200_000,
  },
];

export async function handleMine(
  message: Message,
  user: DbUser,
): Promise<EmbedBuilder> {
  const remaining = await checkCooldown(user.discord_id, "mine", COOLDOWN);
  if (remaining !== null) {
    return new EmbedBuilder()
      .setColor("#FF4444")
      .setTitle("⏰ Cuốc chưa sẵn sàng!")
      .setDescription(`Cần nghỉ thêm **${fmtTime(remaining)}** nữa.`);
  }

  const hasPickaxe = await hasItem(user.discord_id, "item", "diamond_pickaxe");
  const baseCount = randInt(1, 4);
  const totalCount = hasPickaxe ? baseCount + 1 : baseCount;

  const drops: Map<string, { ore: Ore; count: number }> = new Map();
  let totalValue = 0;
  const exp = randInt(30, 60);

  for (let i = 0; i < totalCount; i++) {
    const ore = weightedRandom(ORES);
    const entry = drops.get(ore.name);
    if (entry) {
      entry.count++;
    } else {
      drops.set(ore.name, { ore, count: 1 });
    }
    totalValue += ore.price;
    await addInventoryItem(user.discord_id, "ore", ore.name, 1);
  }

  await addExp(user.discord_id, exp);
  await setCooldown(user.discord_id, "mine");

  const lines = Array.from(drops.values()).map(
    ({ ore, count }) =>
      `${ore.emoji} **${ore.displayName}** ×${count} — ~${fmt(ore.price * count)}`,
  );

  const embed = new EmbedBuilder()
    .setColor("#8B4513")
    .setTitle("⛏️ Khai thác hoàn tất!")
    .setDescription(`Đào được **${totalCount} quặng**:`)
    .addFields(
      { name: "📦 Thu hoạch", value: lines.join("\n"), inline: false },
      { name: "💎 Giá trị ước tính", value: fmt(totalValue), inline: true },
      { name: "✨ EXP", value: `+${exp}`, inline: true },
    )
    .setFooter({
      text: `Cooldown: 10 phút${hasPickaxe ? " | ⛏️ Cuốc kim cương +1 quặng" : ""} • Bán: $sell ore <tên> <số lượng>`,
    });

  return embed;
}
