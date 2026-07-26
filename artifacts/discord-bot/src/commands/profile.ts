import { EmbedBuilder, Message } from 'discord.js';
import { DbUser, expToNextLevel, getOrCreateBank, applyBankInterest } from '../db.js';
import { fmt, progressBar } from '../utils.js';

export async function handleProfile(message: Message, args: string[], user: DbUser): Promise<EmbedBuilder> {
  let target = message.mentions.users.first();
  let targetUser = user;

  if (target && target.id !== message.author.id) {
    const { getOrCreateUser } = await import('../db.js');
    targetUser = await getOrCreateUser(target.id, target.username);
  } else {
    target = message.author;
  }

  const interest = await applyBankInterest(targetUser.discord_id);
  const bank = await getOrCreateBank(targetUser.discord_id);
  const needed = expToNextLevel(targetUser.level);
  const bar = progressBar(targetUser.exp, needed);

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle(`👤 Hồ sơ — ${targetUser.username}`)
    .setThumbnail(target!.displayAvatarURL())
    .addFields(
      { name: '⭐ Cấp độ', value: `**${targetUser.level}**`, inline: true },
      { name: '✨ EXP', value: `${targetUser.exp} / ${needed}\n\`${bar}\``, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '💰 Ví tiền', value: fmt(Number(targetUser.money)), inline: true },
      { name: '🏦 Ngân hàng', value: fmt(Number(bank.balance)), inline: true },
      { name: '💎 Tổng tài sản', value: fmt(Number(targetUser.money) + Number(bank.balance)), inline: true },
    )
    .setFooter({ text: interest > 0 ? `💹 Nhận ${fmt(interest)} lãi suất ngân hàng!` : 'Dùng !daily để nhận thưởng hàng ngày' })
    .setTimestamp();

  return embed;
}
