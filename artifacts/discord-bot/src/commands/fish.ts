import { EmbedBuilder, Message } from "discord.js";
import {
  DbUser, checkCooldown, setCooldown, addExp, addInventoryItem,
  getRodLevel, getVirtueLuckBonus, incrementStat, checkAndGrant,
} from "../db.js";
import { fmt, fmtTime, weightedRandom, randInt } from "../utils.js";

const COOLDOWN = 30 * 60 * 1000; // 30 phút

export interface FishType {
  id: string;
  name: string;
  emoji: string;
  chance: number;
  baseWeight: number; // kg — random [baseWeight, 2×baseWeight] khi bán
  basePrice: number;  // giá cơ bản / kg
  minExp: number;
  maxExp: number;
  junk?: boolean;
}

export const FISH_TABLE: FishType[] = [
  { id: "ca_thuong",     name: "Cá thường",      emoji: "🐟", chance: 35,  baseWeight: 0.3,  basePrice: 5_000,     minExp: 15,  maxExp: 30  },
  { id: "ca_vang",       name: "Cá vàng",         emoji: "🐠", chance: 22,  baseWeight: 0.8,  basePrice: 20_000,    minExp: 30,  maxExp: 55  },
  { id: "ca_hoi",        name: "Cá hồi",           emoji: "🍣", chance: 12,  baseWeight: 1.5,  basePrice: 45_000,    minExp: 50,  maxExp: 80  },
  { id: "ca_ngu",        name: "Cá ngừ",           emoji: "🐡", chance: 10,  baseWeight: 2.0,  basePrice: 55_000,    minExp: 55,  maxExp: 90  },
  { id: "ca_kiem",       name: "Cá kiếm",          emoji: "⚔️", chance: 8,   baseWeight: 3.5,  basePrice: 80_000,    minExp: 70,  maxExp: 110 },
  { id: "ca_map",        name: "Cá mập",           emoji: "🦈", chance: 6,   baseWeight: 8.0,  basePrice: 150_000,   minExp: 100, maxExp: 160 },
  { id: "bach_tuoc",     name: "Bạch tuộc",        emoji: "🐙", chance: 3,   baseWeight: 4.0,  basePrice: 200_000,   minExp: 120, maxExp: 200 },
  { id: "ca_rong",       name: "Cá rồng",          emoji: "🐲", chance: 2,   baseWeight: 15.0, basePrice: 500_000,   minExp: 180, maxExp: 300 },
  { id: "ca_chep_vang",  name: "Cá chép vàng",     emoji: "✨", chance: 1,   baseWeight: 1.0,  basePrice: 800_000,   minExp: 200, maxExp: 400 },
  { id: "ca_mat_trang",  name: "Cá mặt trăng",     emoji: "🌕", chance: 0.5, baseWeight: 25.0, basePrice: 1_200_000, minExp: 300, maxExp: 500 },
  { id: "ung_cu",        name: "Ủng cũ",           emoji: "👟", chance: 0.5, baseWeight: 0.5,  basePrice: 100,       minExp: 3,   maxExp: 8,  junk: true },
];
// Tổng: 35+22+12+10+8+6+3+2+1+0.5+0.5 = 100 ✓

/** Áp dụng luck bonus: có luckBonus% cơ hội nhận cá tốt hơn / tệ hơn */
function rollFishWithLuck(luckBonus: number): FishType {
  const fish = weightedRandom(FISH_TABLE);
  if (luckBonus === 0) return fish;

  if (luckBonus > 0 && Math.random() < luckBonus) {
    const alt = weightedRandom(FISH_TABLE);
    return alt.chance < fish.chance ? alt : fish; // chọn cá hiếm hơn
  }
  if (luckBonus < 0 && Math.random() < -luckBonus) {
    const alt = weightedRandom(FISH_TABLE);
    return alt.chance > fish.chance ? alt : fish; // chọn cá thường hơn
  }
  return fish;
}

/** Rod lv weight bonus: lv1=+20%, lv2=+40%, lv3=+60% */
function rodWeightBonus(rodLevel: number): number {
  return rodLevel * 0.2;
}

export async function handleFish(message: Message, user: DbUser): Promise<EmbedBuilder> {
  const remaining = await checkCooldown(user.discord_id, "fish", COOLDOWN);
  if (remaining !== null) {
    return new EmbedBuilder()
      .setColor("#FF4444").setTitle("⏰ Chưa tới giờ câu!")
      .setDescription(`Cần đợi thêm **${fmtTime(remaining)}** nữa.`);
  }

  const rodLv = await getRodLevel(user.discord_id);
  const luckBonus = getVirtueLuckBonus(user.virtue ?? 100);
  const weightBonus = rodWeightBonus(rodLv);
  const catchCount = rodLv >= 3 ? 2 : 1; // rod lv3 câu được 2 cá

  const catches: FishType[] = [];
  let totalExp = 0;
  const newFishCount = (user.fish_count ?? 0) + catchCount;

  for (let i = 0; i < catchCount; i++) {
    const fish = rollFishWithLuck(luckBonus);
    catches.push(fish);
    const exp = randInt(fish.minExp, fish.maxExp);
    totalExp += exp;
    await addInventoryItem(user.discord_id, "fish", fish.id, 1);
  }

  await addExp(user.discord_id, totalExp);
  await setCooldown(user.discord_id, "fish");
  await incrementStat(user.discord_id, "fishCount", catchCount);

  // Kiểm tra thành tựu
  const earnedSeaGod = await checkAndGrant(user.discord_id, "sea_god", newFishCount >= 50);
  const earnedFishmaster = await checkAndGrant(
    user.discord_id, "fishmaster",
    catches.some((f) => f.id === "ca_mat_trang"),
  );

  // Build embed
  const embed = new EmbedBuilder().setColor("#1E90FF").setTimestamp();

  if (catchCount === 1) {
    const fish = catches[0]!;
    const isJunk = !!fish.junk;
    embed
      .setTitle(isJunk ? "🎣 Câu được... đồ phế liệu?" : `🎣 Câu được ${fish.emoji} ${fish.name}!`)
      .setDescription(
        `**${fish.emoji} ${fish.name}** đã vào túi đồ!\n` +
        `📦 Dùng \`$sell fish ${fish.id} 1\` để bán.`,
      )
      .addFields(
        { name: "✨ EXP", value: `+${totalExp}`, inline: true },
        {
          name: "⚖️ Cân nặng cơ bản",
          value: `${fish.baseWeight} kg (tối đa ${(fish.baseWeight * 2 * (1 + weightBonus)).toFixed(1)} kg với rod)`,
          inline: true,
        },
      );
    if (isJunk) embed.setColor("#888888");
  } else {
    // 2 cá (rod lv3)
    const lines = catches.map(
      (f) =>
        `${f.emoji} **${f.name}** — ⚖️ tối đa ${(f.baseWeight * 2 * (1 + weightBonus)).toFixed(1)} kg | \`$sell fish ${f.id} 1\``,
    );
    embed
      .setTitle("🎣 Câu được 2 con cá! (Cần câu LV3)")
      .setDescription(lines.join("\n"))
      .addFields({ name: "✨ Tổng EXP", value: `+${totalExp}`, inline: true });
  }

  if (rodLv > 0) {
    embed.setFooter({
      text: `Cooldown: 30 phút | 🎣 Cần câu LV${rodLv} (+${(weightBonus * 100).toFixed(0)}% cân nặng${rodLv >= 3 ? ", câu 2 cá" : ""})`,
    });
  } else {
    embed.setFooter({ text: "Cooldown: 30 phút | Mua cần câu ở !shop để tăng cân nặng cá" });
  }

  if (luckBonus !== 0) {
    embed.addFields({
      name: "🍀 Công đức",
      value: `${luckBonus > 0 ? "+" : ""}${(luckBonus * 100).toFixed(1)}% luck`,
      inline: true,
    });
  }

  if (earnedSeaGod) embed.addFields({ name: "🏆 Thành tựu mới!", value: "🌊 **Thần Biển** — Câu cá 50 lần!", inline: false });
  if (earnedFishmaster) embed.addFields({ name: "🏆 Thành tựu mới!", value: "🐋 **Thống Soái Đại Dương** — Câu được Cá Mặt Trăng!", inline: false });

  return embed;
}
