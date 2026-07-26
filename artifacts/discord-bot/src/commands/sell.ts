import { EmbedBuilder, Message } from 'discord.js';
import { DbUser, removeInventoryItem, updateMoney } from '../db.js';
import { ORES } from './mine.js';
import { fmt } from '../utils.js';

// Build lookup maps for ore names (English and Vietnamese)
const ORE_BY_NAME: Record<string, typeof ORES[number]> = {};
for (const ore of ORES) {
  ORE_BY_NAME[ore.name.toLowerCase()] = ore;
  ORE_BY_NAME[ore.displayName.toLowerCase()] = ore;
}
// Extra aliases
ORE_BY_NAME['da'] = ORE_BY_NAME['stone']!;
ORE_BY_NAME['dong'] = ORE_BY_NAME['copper']!;
ORE_BY_NAME['sat'] = ORE_BY_NAME['iron']!;
ORE_BY_NAME['vang'] = ORE_BY_NAME['gold']!;
ORE_BY_NAME['kim cuong'] = ORE_BY_NAME['diamond']!;
ORE_BY_NAME['ngoc bich'] = ORE_BY_NAME['emerald']!;
ORE_BY_NAME['ngocbich'] = ORE_BY_NAME['emerald']!;
ORE_BY_NAME['kimcuong'] = ORE_BY_NAME['diamond']!;

/**
 * Usage: $sell ore <item_name> <quantity>
 * Example: $sell ore diamond 10
 */
export async function handleSell(message: Message, args: string[], user: DbUser): Promise<EmbedBuilder> {
  // args: [category, item_name, quantity]
  const category = args[0]?.toLowerCase();

  if (category !== 'ore') {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Danh mục không hợp lệ')
      .setDescription('Hiện tại chỉ hỗ trợ bán quặng.\nVD: `$sell ore diamond 10`');
  }

  const itemName = args[1]?.toLowerCase();
  const qtyStr = args[2];
  const qty = parseInt(qtyStr ?? '', 10);

  if (!itemName) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Lỗi')
      .setDescription('Tên sản phẩm bị thiếu.\nVD: `$sell ore diamond 10`');
  }

  const ore = ORE_BY_NAME[itemName];
  if (!ore) {
    const oreList = ORES.map(o => `\`${o.name}\``).join(', ');
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Quặng không hợp lệ')
      .setDescription(`Quặng không tồn tại. Các loại: ${oreList}`);
  }

  if (isNaN(qty) || qty <= 0) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Số lượng không hợp lệ')
      .setDescription('VD: `$sell ore diamond 10`');
  }

  const success = await removeInventoryItem(user.discord_id, 'ore', ore.name, qty);
  if (!success) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Không đủ số lượng')
      .setDescription(`Bạn không có đủ **${ore.emoji} ${ore.displayName}** ×${qty} để bán.\nKiểm tra túi đồ: \`!inventory\``);
  }

  const total = ore.price * qty;
  await updateMoney(user.discord_id, total);

  return new EmbedBuilder()
    .setColor('#00FF88')
    .setTitle(`💰 Bán thành công!`)
    .addFields(
      { name: '📦 Đã bán', value: `${ore.emoji} ${ore.displayName} ×${qty}`, inline: true },
      { name: '💵 Giá/cái', value: fmt(ore.price), inline: true },
      { name: '💰 Thu được', value: fmt(total), inline: true },
      { name: '💳 Số dư ví', value: fmt(Number(user.money) + total), inline: false },
    );
}
