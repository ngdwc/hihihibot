import { EmbedBuilder, Message } from 'discord.js';
import { UserModel, expToNextLevel } from '../db.js';
import { fmt } from '../utils.js';

const ADMIN_USERNAME = '_.wumingwufen';

function isAdmin(message: Message): boolean {
  return message.author.username === ADMIN_USERNAME;
}

/** !level set <level> @mention */
export async function handleAdminLevelSet(message: Message, args: string[]): Promise<EmbedBuilder> {
  if (!isAdmin(message)) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Không có quyền');
  }

  const level = parseInt(args[0] ?? '', 10);
  const target = message.mentions.users.first();

  if (isNaN(level) || level < 1) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Lỗi')
      .setDescription('Cú pháp: `!level set <số level> @người_dùng`');
  }
  if (!target) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Lỗi')
      .setDescription('Hãy @mention người dùng. VD: `!level set 50 @user`');
  }

  const user = await UserModel.findOneAndUpdate(
    { discordId: target.id },
    { $set: { level, exp: 0 } },
    { new: true }
  );
  if (!user) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Không tìm thấy')
      .setDescription(`<@${target.id}> chưa từng dùng bot.`);
  }

  return new EmbedBuilder()
    .setColor('#00FF88')
    .setTitle('⚙️ [ADMIN] Đặt level thành công')
    .addFields(
      { name: '👤 Người dùng', value: `<@${target.id}>`, inline: true },
      { name: '⭐ Level mới', value: `${level}`, inline: true },
      { name: '✨ EXP cần cho LV tiếp', value: `${expToNextLevel(level)}`, inline: true },
    );
}

/** !level add <level> @mention */
export async function handleAdminLevelAdd(message: Message, args: string[]): Promise<EmbedBuilder> {
  if (!isAdmin(message)) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Không có quyền');
  }

  const amount = parseInt(args[0] ?? '', 10);
  const target = message.mentions.users.first();

  if (isNaN(amount) || amount === 0) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Lỗi')
      .setDescription('Cú pháp: `!level add <số level> @người_dùng`');
  }
  if (!target) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Lỗi')
      .setDescription('Hãy @mention người dùng. VD: `!level add 10 @user`');
  }

  const user = await UserModel.findOne({ discordId: target.id });
  if (!user) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Không tìm thấy')
      .setDescription(`<@${target.id}> chưa từng dùng bot.`);
  }

  const oldLevel = user.level;
  const newLevel = Math.max(1, oldLevel + amount);
  await UserModel.updateOne({ discordId: target.id }, { $set: { level: newLevel, exp: 0 } });

  return new EmbedBuilder()
    .setColor('#00FF88')
    .setTitle('⚙️ [ADMIN] Thêm level thành công')
    .addFields(
      { name: '👤 Người dùng', value: `<@${target.id}>`, inline: true },
      { name: '⭐ Level cũ', value: `${oldLevel}`, inline: true },
      { name: '⭐ Level mới', value: `${newLevel}`, inline: true },
    );
}

/** !tien <so_tien> @mention */
export async function handleAdminSetMoney(message: Message, args: string[]): Promise<EmbedBuilder> {
  if (!isAdmin(message)) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Không có quyền');
  }

  const amountStr = args[0]?.replace(/[.,_]/g, '') ?? '';
  const amount = parseInt(amountStr, 10);
  const target = message.mentions.users.first();

  if (isNaN(amount) || amount < 0) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Lỗi')
      .setDescription('Cú pháp: `!tien <số tiền> @người_dùng`');
  }
  if (!target) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Lỗi')
      .setDescription('Hãy @mention người dùng. VD: `!tien 1000000 @user`');
  }

  const user = await UserModel.findOneAndUpdate(
    { discordId: target.id },
    { $set: { money: amount } },
    { new: false }
  );
  if (!user) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Không tìm thấy')
      .setDescription(`<@${target.id}> chưa từng dùng bot.`);
  }

  return new EmbedBuilder()
    .setColor('#00FF88')
    .setTitle('⚙️ [ADMIN] Đặt tiền thành công')
    .addFields(
      { name: '👤 Người dùng', value: `<@${target.id}>`, inline: true },
      { name: '💰 Tiền cũ', value: fmt(user.money), inline: true },
      { name: '💰 Tiền mới', value: fmt(amount), inline: true },
    );
}
