import { EmbedBuilder, Message } from 'discord.js';
import { pool, expToNextLevel } from '../db.js';
import { fmt } from '../utils.js';

const ADMIN_USERNAME = '_.wumingwufen';

function isAdmin(message: Message): boolean {
  return message.author.username === ADMIN_USERNAME;
}

async function findUserByDiscordId(discordId: string) {
  const res = await pool.query(
    'SELECT * FROM discord_users WHERE discord_id = $1',
    [discordId]
  );
  return res.rows[0] ?? null;
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

  const user = await findUserByDiscordId(target.id);
  if (!user) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Không tìm thấy')
      .setDescription(`<@${target.id}> chưa từng dùng bot.`);
  }

  await pool.query(
    'UPDATE discord_users SET level = $1, exp = 0, updated_at = NOW() WHERE discord_id = $2',
    [level, user.discord_id]
  );

  const needed = expToNextLevel(level);
  return new EmbedBuilder()
    .setColor('#00FF88')
    .setTitle('⚙️ [ADMIN] Đặt level thành công')
    .addFields(
      { name: '👤 Người dùng', value: `<@${user.discord_id}>`, inline: true },
      { name: '⭐ Level mới', value: `${level}`, inline: true },
      { name: '✨ EXP cần cho LV tiếp', value: `${needed}`, inline: true },
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

  const user = await findUserByDiscordId(target.id);
  if (!user) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Không tìm thấy')
      .setDescription(`<@${target.id}> chưa từng dùng bot.`);
  }

  const newLevel = Math.max(1, user.level + amount);
  await pool.query(
    'UPDATE discord_users SET level = $1, exp = 0, updated_at = NOW() WHERE discord_id = $2',
    [newLevel, user.discord_id]
  );

  return new EmbedBuilder()
    .setColor('#00FF88')
    .setTitle('⚙️ [ADMIN] Thêm level thành công')
    .addFields(
      { name: '👤 Người dùng', value: `<@${user.discord_id}>`, inline: true },
      { name: '⭐ Level cũ', value: `${user.level}`, inline: true },
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

  const user = await findUserByDiscordId(target.id);
  if (!user) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Không tìm thấy')
      .setDescription(`<@${target.id}> chưa từng dùng bot.`);
  }

  await pool.query(
    'UPDATE discord_users SET money = $1, updated_at = NOW() WHERE discord_id = $2',
    [amount, user.discord_id]
  );

  return new EmbedBuilder()
    .setColor('#00FF88')
    .setTitle('⚙️ [ADMIN] Đặt tiền thành công')
    .addFields(
      { name: '👤 Người dùng', value: `<@${user.discord_id}>`, inline: true },
      { name: '💰 Tiền cũ', value: fmt(Number(user.money)), inline: true },
      { name: '💰 Tiền mới', value: fmt(amount), inline: true },
    );
}
