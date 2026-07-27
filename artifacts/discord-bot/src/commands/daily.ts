import { EmbedBuilder, Message } from "discord.js";
import {
  DbUser, checkCooldown, setCooldown, updateMoney, addExp,
  updateVirtue, checkAndGrant,
} from "../db.js";
import { fmt, fmtTime, randInt } from "../utils.js";

const COOLDOWN = 24 * 60 * 60 * 1000;

export async function handleDaily(message: Message, user: DbUser): Promise<EmbedBuilder> {
  const remaining = await checkCooldown(user.discord_id, "daily", COOLDOWN);
  if (remaining !== null) {
    return new EmbedBuilder()
      .setColor("#FF4444").setTitle("⏰ Chưa đến giờ!")
      .setDescription(`Còn **${fmtTime(remaining)}** nữa.`);
  }

  const levelBonus = Math.floor(user.level * 0.1 * 10_000);
  const base = randInt(50_000, 150_000);
  const money = base + levelBonus;
  const exp = randInt(50, 100);

  await updateMoney(user.discord_id, money);
  const { leveled, newLevel } = await addExp(user.discord_id, exp);
  await setCooldown(user.discord_id, "daily");

  // +1 công đức mỗi ngày
  const newVirtue = await updateVirtue(user.discord_id, 1);

  // Check thành tựu
  const earnedAngel = await checkAndGrant(user.discord_id, "angel", newVirtue >= 200);
  const earnedMillion = await checkAndGrant(user.discord_id, "millionaire", Number(user.money) + money >= 10_000_000);
  const earnedLegend = await checkAndGrant(user.discord_id, "legend", leveled && newLevel >= 50);

  const embed = new EmbedBuilder()
    .setColor("#00FF88")
    .setTitle("🎁 Thưởng hàng ngày!")
    .addFields(
      { name: "💰 Tiền nhận được", value: fmt(money), inline: true },
      { name: "✨ EXP", value: `+${exp}`, inline: true },
      { name: "💫 Công đức", value: `+1 → ${newVirtue}/200`, inline: true },
    )
    .setFooter({ text: "Quay lại sau 24 giờ!" });

  if (levelBonus > 0) {
    embed.setDescription(`🎖️ Bonus cấp độ Lv.${user.level}: **+${fmt(levelBonus)}**`);
  }
  if (leveled) embed.addFields({ name: "🎉 LÊN CẤP!", value: `Bạn đã lên **Cấp ${newLevel}**! 🎊`, inline: false });
  if (earnedAngel) embed.addFields({ name: "🏆 Thành tựu mới!", value: "😇 **Thiên Thần** — Công đức đạt 200!" });
  if (earnedMillion) embed.addFields({ name: "🏆 Thành tựu mới!", value: "💰 **Triệu Phú** — Có 10 triệu trong ví!" });
  if (earnedLegend) embed.addFields({ name: "🏆 Thành tựu mới!", value: "⭐ **Huyền Thoại** — Đạt cấp 50!" });

  return embed;
}
