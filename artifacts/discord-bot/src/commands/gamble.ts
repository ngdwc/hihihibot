import { EmbedBuilder, Message } from 'discord.js';
import { DbUser, updateMoney, hasItem, getVirtueLuckBonus } from '../db.js';
import { fmt } from '../utils.js';

const MIN_BET = 1_000;

export async function handleGamble(message: Message, args: string[], user: DbUser): Promise<EmbedBuilder> {
  const amountStr = args[0]?.replace(/[.,_]/g, '') ?? '';
  const amount = parseInt(amountStr, 10);

  if (isNaN(amount) || amount < MIN_BET) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Lỗi')
      .setDescription(`Đặt cược tối thiểu **${fmt(MIN_BET)}**.\nVD: \`!gamble 50000\``);
  }
  if (Number(user.money) < amount) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Không đủ tiền')
      .setDescription(`Bạn chỉ có **${fmt(Number(user.money))}** trong ví.`);
  }

  const hasLucky = await hasItem(user.discord_id, 'item', 'lucky_charm');
  const virtueLuck = getVirtueLuckBonus(user.virtue ?? 100);
  const winChance = hasLucky ? 0.55 + virtueLuck : 0.50 + virtueLuck;

  // Slot machine symbols
  const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎'];
  const slot1 = symbols[Math.floor(Math.random() * symbols.length)]!;
  const slot2 = symbols[Math.floor(Math.random() * symbols.length)]!;
  const slot3 = symbols[Math.floor(Math.random() * symbols.length)]!;

  const win = Math.random() < winChance;
  // Jackpot: all 3 same = 3x multiplier
  const jackpot = slot1 === slot2 && slot2 === slot3;
  const multiplier = jackpot ? 3 : win ? 1 : -1;

  const profit = Math.floor(amount * Math.abs(multiplier));
  const delta = win ? profit : -amount;

  await updateMoney(user.discord_id, delta);
  const newBalance = Number(user.money) + delta;

  const embed = new EmbedBuilder().setTimestamp();

  if (jackpot && win) {
    embed.setColor('#FFD700')
      .setTitle('🎰 JACKPOT!!!')
      .setDescription(`[ ${slot1} | ${slot2} | ${slot3} ]\n\n🎊 **BA GIỐNG NHAU! Thắng x3!**`)
      .addFields(
        { name: '💰 Thắng được', value: fmt(profit), inline: true },
        { name: '💳 Số dư', value: fmt(newBalance), inline: true },
      );
  } else if (win) {
    embed.setColor('#00FF88')
      .setTitle('🎰 Thắng!')
      .setDescription(`[ ${slot1} | ${slot2} | ${slot3} ]`)
      .addFields(
        { name: '💰 Thắng được', value: fmt(profit), inline: true },
        { name: '💳 Số dư', value: fmt(newBalance), inline: true },
      );
  } else {
    embed.setColor('#FF4444')
      .setTitle('🎰 Thua!')
      .setDescription(`[ ${slot1} | ${slot2} | ${slot3} ]`)
      .addFields(
        { name: '💸 Mất', value: fmt(amount), inline: true },
        { name: '💳 Số dư', value: fmt(newBalance), inline: true },
      );
  }

  if (hasLucky) {
    embed.setFooter({ text: '🍀 Bùa may mắn đang hoạt động (+5% thắng)' });
  } else {
    embed.setFooter({ text: `🍀 Luck công đức: ${virtueLuck >= 0 ? '+' : ''}${(virtueLuck * 100).toFixed(1)}%` });
  }
  return embed;
}

export async function handleCoinflip(message: Message, args: string[], user: DbUser): Promise<EmbedBuilder> {
  const amountStr = args[0]?.replace(/[.,_]/g, '') ?? '';
  const amount = parseInt(amountStr, 10);

  const choiceRaw = args[1]?.toLowerCase() ?? '';
  const choiceMap: Record<string, string> = { heads: 'heads', h: 'heads', tails: 'tails', t: 'tails', mat: 'heads', ngua: 'tails' };
  const choice = choiceMap[choiceRaw];

  if (isNaN(amount) || amount < MIN_BET) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Lỗi')
      .setDescription(`VD: \`!coinflip 50000 heads\` hoặc \`!coinflip 50000 tails\``);
  }
  if (!choice) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Lỗi')
      .setDescription('Chọn **heads** (mặt) hoặc **tails** (ngửa). VD: `!coinflip 50000 heads`');
  }
  if (Number(user.money) < amount) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Không đủ tiền')
      .setDescription(`Bạn chỉ có **${fmt(Number(user.money))}** trong ví.`);
  }

  const virtueLuck = getVirtueLuckBonus(user.virtue ?? 100);
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const luckyWin = Math.random() < Math.max(0, virtueLuck);
  const win = choice === result || luckyWin;
  const delta = win ? amount : -amount;
  await updateMoney(user.discord_id, delta);

  const emoji = result === 'heads' ? '🟡 Mặt' : '⚪ Ngửa';
  const newBalance = Number(user.money) + delta;

  const embed = new EmbedBuilder()
    .setColor(win ? '#00FF88' : '#FF4444')
    .setTitle(`🪙 Tung đồng xu — ${win ? 'THẮNG!' : 'THUA!'}`)
    .addFields(
      { name: '🎯 Kết quả', value: emoji, inline: true },
      { name: '💰 Thay đổi', value: (win ? '+' : '') + fmt(delta), inline: true },
      { name: '💳 Số dư', value: fmt(newBalance), inline: true },
    );

  embed.setFooter({ text: `🍀 Luck công đức: ${virtueLuck >= 0 ? '+' : ''}${(virtueLuck * 100).toFixed(1)}%` });
  return embed;
}
