import { EmbedBuilder, Message } from 'discord.js';
import { DbUser, getOrCreateUser, updateMoney } from '../db.js';
import { fmt } from '../utils.js';

const MIN_TRANSFER = 1_000;

export async function handleTransfer(message: Message, args: string[], user: DbUser): Promise<EmbedBuilder> {
  const target = message.mentions.users.first();
  if (!target) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Lỗi')
      .setDescription('Hãy tag người nhận. VD: `!transfer @user 50000`');
  }
  if (target.id === message.author.id) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Lỗi')
      .setDescription('Không thể chuyển tiền cho chính mình.');
  }
  if (target.bot) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Lỗi')
      .setDescription('Không thể chuyển tiền cho bot.');
  }

  const amountStr = args[1]?.replace(/[.,_]/g, '') ?? '';
  const amount = parseInt(amountStr, 10);

  if (isNaN(amount) || amount < MIN_TRANSFER) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Lỗi')
      .setDescription(`Số tiền tối thiểu là **${fmt(MIN_TRANSFER)}**.`);
  }
  if (Number(user.money) < amount) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Không đủ tiền')
      .setDescription(`Bạn chỉ có **${fmt(Number(user.money))}** trong ví.`);
  }

  const recipient = await getOrCreateUser(target.id, target.username);
  await updateMoney(user.discord_id, -amount);
  await updateMoney(recipient.discord_id, amount);

  return new EmbedBuilder()
    .setColor('#00FF88')
    .setTitle('💸 Chuyển tiền thành công!')
    .addFields(
      { name: '👤 Người gửi', value: user.username, inline: true },
      { name: '👤 Người nhận', value: recipient.username, inline: true },
      { name: '💰 Số tiền', value: fmt(amount), inline: false },
    )
    .setTimestamp();
}
