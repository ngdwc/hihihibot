import { EmbedBuilder, Message } from "discord.js";
import {
  DbUser,
  checkCooldown,
  setCooldown,
  addInventoryItem,
  addExp,
  getPickaxeLevel,
  getVirtueLuckBonus,
  incrementStat,
  checkAndGrant,
} from "../db.js";
import { fmt, fmtTime, weightedRandom, randInt } from "../utils.js";

const COOLDOWN = 10 * 60 * 1000; // 10 phút

export interface OreType {
  name: string;
  emoji: string;
  displayName: string;
  chance: number;
  price: number; // giá bán cơ bản (trước khi tính cân nặng)
  baseWeight: number; // kg cơ bản — random [baseWeight, 2×baseWeight] khi bán
}

export const ORES: OreType[] = [
  {
    name: "poop",
    emoji: "💩",
    displayName: "drop phụ",
    chance: 70,
    price: 10,
    baseWeight: 1.0,
  },
  {
    name: "stone",
    emoji: "🪨",
    displayName: "Đá",
    chance: 56.5,
    price: 100,
    baseWeight: 1.0,
  },
  {
    name: "copper",
    emoji: "🟤",
    displayName: "Đồng",
    chance: 25,
    price: 3_500,
    baseWeight: 0.8,
  },
  {
    name: "iron",
    emoji: "⚙️",
    displayName: "Sắt",
    chance: 10,
    price: 10_500,
    baseWeight: 1.2,
  },
  {
    name: "gold",
    emoji: "🟡",
    displayName: "Vàng",
    chance: 5,
    price: 800_000,
    baseWeight: 2.5,
  },
  {
    name: "diamond",
    emoji: "💎",
    displayName: "Kim cương",
    chance: 2.5,
    price: 5_000_000,
    baseWeight: 0.3,
  },
  {
    name: "emerald",
    emoji: "💚",
    displayName: "Ngọc bích",
    chance: 1,
    price: 10_200_000,
    baseWeight: 0.4,
  },
];

/** Áp dụng luck bonus cho quặng */
function rollOreWithLuck(luckBonus: number): OreType {
  const ore = weightedRandom(ORES);
  if (luckBonus === 0) return ore;
  if (luckBonus > 0 && Math.random() < luckBonus) {
    const alt = weightedRandom(ORES);
    return alt.chance < ore.chance ? alt : ore;
  }
  if (luckBonus < 0 && Math.random() < -luckBonus) {
    const alt = weightedRandom(ORES);
    return alt.chance > ore.chance ? alt : ore;
  }
  return ore;
}

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

  const pickaxeLv = await getPickaxeLevel(user.discord_id);
  const luckBonus = getVirtueLuckBonus(user.virtue ?? 100);

  // Pickaxe lv bonus: lv1=+1, lv2=+2, lv3=+3
  const baseCount = randInt(1, 4);
  const totalCount = baseCount + pickaxeLv;
  const exp = randInt(30, 60);

  const drops = new Map<string, { ore: OreType; count: number }>();

  for (let i = 0; i < totalCount; i++) {
    const ore = rollOreWithLuck(luckBonus);
    const entry = drops.get(ore.name);
    if (entry) entry.count++;
    else drops.set(ore.name, { ore, count: 1 });
    await addInventoryItem(user.discord_id, "ore", ore.name, 1);

    if (Math.random() < 0.7) {
      const extraPoop = randInt(1, 3);
      const poopOre = ORES.find((o) => o.name === "poop")!;
      const poopEntry = drops.get("poop");
      if (poopEntry) poopEntry.count += extraPoop;
      else drops.set("poop", { ore: poopOre, count: extraPoop });
      await addInventoryItem(user.discord_id, "ore", "poop", extraPoop);
    }
  }

  await addExp(user.discord_id, exp);
  await setCooldown(user.discord_id, "mine");
  const newMineCount = await incrementStat(user.discord_id, "mineCount");

  // Kiểm tra thành tựu
  const earnedMiningKing = await checkAndGrant(
    user.discord_id,
    "mining_king",
    newMineCount >= 50,
  );

  const lines = Array.from(drops.values()).map(({ ore, count }) => {
    const estimatedPrice = ore.price * count;
    return `${ore.emoji} **${ore.displayName}** \`${ore.name}\` ×${count} — ~${fmt(estimatedPrice)} (bán: \`$sell ore ${ore.name} ${count}\`)`;
  });

  const embed = new EmbedBuilder()
    .setColor("#8B4513")
    .setTitle("⛏️ Khai thác hoàn tất!")
    .setDescription(
      `Đào được **${totalCount} quặng** (cân nặng & giá thực tính khi bán):`,
    )
    .addFields(
      { name: "📦 Thu hoạch", value: lines.join("\n"), inline: false },
      { name: "✨ EXP", value: `+${exp}`, inline: true },
    )
    .setFooter({
      text: `Cooldown: 10 phút${pickaxeLv > 0 ? ` | ⛏️ Cuốc LV${pickaxeLv} (+${pickaxeLv} quặng)` : ""}${luckBonus !== 0 ? ` | Luck ${luckBonus > 0 ? "+" : ""}${(luckBonus * 100).toFixed(1)}%` : ""}`,
    });

  if (earnedMiningKing) {
    embed.addFields({
      name: "🏆 Thành tựu mới!",
      value: "⛏️ **Vua Đào Mỏ** — Đào quặng 50 lần!",
      inline: false,
    });
  }

  return embed;
}
