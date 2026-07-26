import { EmbedBuilder, Message } from 'discord.js';
import { DbUser, checkCooldown, setCooldown, updateMoney, addExp } from '../db.js';
import { fmt, fmtTime, randInt } from '../utils.js';

const COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

export async function handleDaily(message: Message, user: DbUser): Promise<EmbedBuilder> {
  const remaining = await checkCooldown(user.discord_id, 'daily', COOLDOWN);

  if (remaining !== null) {
    return new EmbedBuilder()
      .setColor('#FF4444')
      .setTitle('⏰ Chưa đến giờ!')
      .setDescription(`Bạn đã nhận thưởng hôm nay rồi.\nCòn **${fmtTime(remaining)}** nữa.`);
  }

  // Bonus based on level
  const levelBonus = Math.floor(user.level * 0.1 * 10000);
  const base = randInt(50_000, 150_000);
  const money = base + levelBonus;
  const exp = randInt(50, 100);

  await updateMoney(user.discord_id, money);
  const { leveled, newLevel } = await addExp(user.discord_id, exp);
  await setCooldown(user.discord_id, 'daily');

  const embed = new EmbedBuilder()
    .setColor('#00FF88')
    .setTitle('🎁 Thưởng hàng ngày!')
    .addFields(
      { name: '💰 Tiền nhận được', value: fmt(money), inline: true },
      { name: '✨ EXP nhận được', value: `+${exp} EXP`, inline: true },
    )
    .setFooter({ text: 'Quay lại sau 24 giờ!' });

  if (levelBonus > 0) {
    embed.setDescription(`🎖️ Bonus cấp độ Lv.${user.level}: **+${fmt(levelBonus)}**`);
  }

  if (leveled) {
    embed.addFields({ name: '🎉 LÊN CẤP!', value: `Bạn đã lên **Cấp ${newLevel}**! 🎊`, inline: false });
  }

  return embed;
}
