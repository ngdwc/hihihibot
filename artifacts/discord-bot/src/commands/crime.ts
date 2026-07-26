import { EmbedBuilder, Message } from 'discord.js';
import { DbUser, checkCooldown, setCooldown, updateMoney, addExp, hasItem } from '../db.js';
import { fmt, fmtTime, randInt } from '../utils.js';

const COOLDOWN = 2 * 60 * 60 * 1000; // 2 hours

const CRIME_SCENARIOS = [
  { success: '🏧 Bạn hack thành công ATM và rút tiền mà không bị phát hiện!', fail: '🚔 Cảnh sát bắt gặp bạn đang cạy ATM.' },
  { success: '🎩 Bạn lừa đảo thành công một vụ thương mại!', fail: '🕵️ Thám tử điều tra và bắt được bạn.' },
  { success: '💼 Bạn trộm một chiếc cặp đầy tiền từ doanh nhân!', fail: '🚨 Bảo vệ phát hiện và bắt bạn giao cho cảnh sát.' },
  { success: '🃏 Bạn làm giả thẻ tín dụng thành công!', fail: '💻 Hệ thống phát hiện gian lận và đóng băng tài khoản bạn.' },
  { success: '🚗 Bạn lấy trộm xe hơi sang trọng và bán chợ đen!', fail: '📡 GPS theo dõi và cảnh sát tìm ra bạn nhanh chóng.' },
];

export async function handleCrime(message: Message, user: DbUser): Promise<EmbedBuilder> {
  const remaining = await checkCooldown(user.discord_id, 'crime', COOLDOWN);
  if (remaining !== null) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('⏰ Cần nghỉ ngơi!')
      .setDescription(`Bạn cần ẩn náu thêm **${fmtTime(remaining)}** nữa.`);
  }

  const hasMask = await hasItem(user.discord_id, 'item', 'crime_mask');
  // Base 40% success; mask gives +20% => 48%
  const successChance = hasMask ? 0.48 : 0.40;

  const scenario = CRIME_SCENARIOS[Math.floor(Math.random() * CRIME_SCENARIOS.length)]!;
  const success = Math.random() < successChance;

  await setCooldown(user.discord_id, 'crime');

  if (success) {
    const money = randInt(200_000, 800_000);
    const exp = randInt(50, 100);
    await updateMoney(user.discord_id, money);
    const { leveled, newLevel } = await addExp(user.discord_id, exp);

    const embed = new EmbedBuilder()
      .setColor('#00FF88')
      .setTitle('🔫 Thành công!')
      .setDescription(scenario.success)
      .addFields(
        { name: '💰 Thu được', value: fmt(money), inline: true },
        { name: '✨ EXP', value: `+${exp}`, inline: true },
      )
      .setFooter({ text: `Cooldown: 2 giờ${hasMask ? ' | 🎭 Mặt nạ đang hoạt động' : ''}` });

    if (leveled) {
      embed.addFields({ name: '🎉 LÊN CẤP!', value: `Bạn đã lên **Cấp ${newLevel}**! 🎊` });
    }
    return embed;
  } else {
    const fine = randInt(80_000, 250_000);
    const actualFine = Math.min(fine, Number(user.money));
    await updateMoney(user.discord_id, -actualFine);

    return new EmbedBuilder()
      .setColor('#FF4444')
      .setTitle('🚔 Bị bắt!')
      .setDescription(scenario.fail)
      .addFields(
        { name: '💸 Tiền phạt', value: fmt(actualFine), inline: true },
        { name: '💳 Còn lại', value: fmt(Number(user.money) - actualFine), inline: true },
      )
      .setFooter({ text: `Cooldown: 2 giờ${hasMask ? ' | 🎭 Mặt nạ đang hoạt động' : ''}` });
  }
}
