import { EmbedBuilder, Message } from 'discord.js';
import { DbUser, updateMoney, addInventoryItem, hasItem } from '../db.js';
import { fmt } from '../utils.js';

export interface ShopItem {
  id: string;
  emoji: string;
  name: string;
  description: string;
  price: number;
  unique: boolean; // only 1 per user
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'fishing_rod',
    emoji: '🎣',
    name: 'Cần câu nâng cấp',
    description: 'Tăng 50% tiền khi câu cá',
    price: 200_000,
    unique: true,
  },
  {
    id: 'diamond_pickaxe',
    emoji: '⛏️',
    name: 'Cuốc kim cương',
    description: 'Đào được thêm 1 quặng mỗi lần',
    price: 500_000,
    unique: true,
  },
  {
    id: 'lucky_charm',
    emoji: '🍀',
    name: 'Bùa may mắn',
    description: 'Tăng 5% tỉ lệ thắng cờ bạc',
    price: 150_000,
    unique: true,
  },
  {
    id: 'crime_mask',
    emoji: '🎭',
    name: 'Mặt nạ',
    description: 'Giảm 20% tỉ lệ bị bắt khi crime',
    price: 100_000,
    unique: true,
  },
];

export async function handleShop(_message: Message): Promise<EmbedBuilder> {
  const lines = SHOP_ITEMS.map((item, i) =>
    `**${i + 1}.** ${item.emoji} **${item.name}** — ${fmt(item.price)}\n┗ ${item.description}`
  );

  return new EmbedBuilder()
    .setColor('#FF9500')
    .setTitle('🛒 Cửa hàng')
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: 'Dùng !buy <số thứ tự> để mua. VD: !buy 1' });
}

export async function handleBuy(message: Message, args: string[], user: DbUser): Promise<EmbedBuilder> {
  const idx = parseInt(args[0] ?? '', 10) - 1;
  const item = SHOP_ITEMS[idx];

  if (!item) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Lỗi')
      .setDescription(`Mặt hàng không hợp lệ. Dùng \`!shop\` để xem danh sách.`);
  }
  if (Number(user.money) < item.price) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Không đủ tiền')
      .setDescription(`Bạn cần **${fmt(item.price)}** nhưng chỉ có **${fmt(Number(user.money))}**.`);
  }
  if (item.unique && await hasItem(user.discord_id, 'item', item.id)) {
    return new EmbedBuilder().setColor('#FF4444').setTitle('❌ Đã sở hữu')
      .setDescription(`Bạn đã có **${item.emoji} ${item.name}** rồi!`);
  }

  await updateMoney(user.discord_id, -item.price);
  await addInventoryItem(user.discord_id, 'item', item.id, 1);

  return new EmbedBuilder()
    .setColor('#00FF88')
    .setTitle(`🛒 Mua thành công!`)
    .setDescription(`Bạn đã mua **${item.emoji} ${item.name}**!`)
    .addFields(
      { name: '💰 Đã trả', value: fmt(item.price), inline: true },
      { name: '✨ Hiệu ứng', value: item.description, inline: true },
    );
}
