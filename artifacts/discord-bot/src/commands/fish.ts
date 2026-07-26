import { EmbedBuilder, Message } from 'discord.js';
import { DbUser, checkCooldown, setCooldown, updateMoney, addExp, hasItem } from '../db.js';
import { fmt, fmtTime, weightedRandom, randInt } from '../utils.js';

const COOLDOWN = 30 * 60 * 1000; // 30 minutes

interface Fish {
  name: string;
  emoji: string;
  chance: number;
  minMoney: number;
  maxMoney: number;
  minExp: number;
  maxExp: number;
}

const FISH_TABLE: Fish[] = [
  { name: 'Cá thường',  emoji: '🐟', chance: 50,  minMoney: 3_000,   maxMoney: 8_000,   minExp: 20, maxExp: 40 },
  { name: 'Cá vàng',   emoji: '🐠', chance: 25,  minMoney: 15_000,  maxMoney: 30_000,  minExp: 40, maxExp: 70 },
  { name: 'Cá ngừ',    emoji: '🐡', chance: 14,  minMoney: 40_000,  maxMoney: 80_000,  minExp: 70, maxExp: 110 },
  { name: 'Cá mập',    emoji: '🦈', chance: 8,   minMoney: 100_000, maxMoney: 200_000, minExp: 110, maxExp: 160 },
  { name: 'Cá rồng',   emoji: '🐲', chance: 2,   minMoney: 350_000, maxMoney: 600_000, minExp: 200, maxExp: 300 },
  { name: 'Ủng cũ',    emoji: '👟', chance: 1,   minMoney: 0,       maxMoney: 100,     minExp: 5,  maxExp: 10 },
];

export async function handleFish(message: Message, user: DbUser): Promise<EmbedBuilder> {
  const remaining = await checkCooldown(user.discord_id, 'fish', COOLDOWN);
  if (remaining !== null) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('⏰ Chưa tới giờ câu!')
      .setDescription(`Cần đợi thêm **${fmtTime(remaining)}** nữa.`);
  }

  const catch_ = weightedRandom(FISH_TABLE);
  const hasBetterRod = await hasItem(user.discord_id, 'item', 'fishing_rod');
  const rawMoney = randInt(catch_.minMoney, catch_.maxMoney);
  const money = hasBetterRod ? Math.floor(rawMoney * 1.5) : rawMoney;
  const exp = randInt(catch_.minExp, catch_.maxExp);

  await updateMoney(user.discord_id, money);
  const { leveled, newLevel } = await addExp(user.discord_id, exp);
  await setCooldown(user.discord_id, 'fish');

  const isJunk = catch_.name === 'Ủng cũ';

  const embed = new EmbedBuilder()
    .setColor(isJunk ? '#888888' : '#1E90FF')
    .setTitle(isJunk ? '🎣 Câu được... đồ phế liệu?' : `🎣 Câu được ${catch_.emoji} ${catch_.name}!`)
    .addFields(
      { name: '💰 Bán được', value: fmt(money), inline: true },
      { name: '✨ EXP', value: `+${exp}`, inline: true },
    )
    .setFooter({ text: `Cooldown: 30 phút${hasBetterRod ? ' | 🎣 Cần câu nâng cấp +50%' : ''}` });

  if (leveled) {
    embed.addFields({ name: '🎉 LÊN CẤP!', value: `Bạn đã lên **Cấp ${newLevel}**! 🎊`, inline: false });
  }

  return embed;
}
