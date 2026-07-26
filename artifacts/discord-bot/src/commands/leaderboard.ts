import { EmbedBuilder, Message } from 'discord.js';
import { getLeaderboard, DbUser } from '../db.js';
import { fmt } from '../utils.js';

const MEDALS = ['🥇', '🥈', '🥉'];

export async function handleLeaderboard(message: Message, args: string[]): Promise<EmbedBuilder> {
  const type = args[0]?.toLowerCase() === 'money' || args[0]?.toLowerCase() === 'tien' ? 'money' : 'level';
  const rows = await getLeaderboard(type);

  const lines = rows.map((u: DbUser, i: number) => {
    const medal = MEDALS[i] ?? `**${i + 1}.**`;
    if (type === 'level') {
      return `${medal} **${u.username}** — Lv.${u.level} (${u.exp} EXP) | ${fmt(Number(u.money))}`;
    }
    return `${medal} **${u.username}** — ${fmt(Number(u.money))} | Lv.${u.level}`;
  });

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle(type === 'level' ? '🏆 Bảng xếp hạng — Cấp độ' : '🏆 Bảng xếp hạng — Tiền bạc')
    .setDescription(lines.length > 0 ? lines.join('\n') : 'Chưa có dữ liệu.')
    .setFooter({ text: type === 'level' ? 'Dùng !lb money để xem BXH tiền' : 'Dùng !lb để xem BXH cấp độ' })
    .setTimestamp();

  return embed;
}
