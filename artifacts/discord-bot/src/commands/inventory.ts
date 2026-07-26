import { EmbedBuilder, Message } from 'discord.js';
import { DbUser, getInventory, DbInventoryItem } from '../db.js';
import { SHOP_ITEMS } from './shop.js';
import { fmt } from '../utils.js';

const ORE_DISPLAY: Record<string, { emoji: string; name: string; price: number }> = {
  stone:   { emoji: '🪨', name: 'Đá',        price: 100 },
  copper:  { emoji: '🟤', name: 'Đồng',      price: 500 },
  iron:    { emoji: '⚙️',  name: 'Sắt',       price: 1_500 },
  gold:    { emoji: '🟡', name: 'Vàng',      price: 8_000 },
  diamond: { emoji: '💎', name: 'Kim cương', price: 50_000 },
  emerald: { emoji: '💚', name: 'Ngọc bích', price: 200_000 },
};

export async function handleInventory(message: Message, user: DbUser): Promise<EmbedBuilder> {
  const items = await getInventory(user.discord_id);

  const ores = items.filter((i: DbInventoryItem) => i.category === 'ore');
  const shopItems = items.filter((i: DbInventoryItem) => i.category === 'item');

  const embed = new EmbedBuilder()
    .setColor('#8B4513')
    .setTitle(`🎒 Túi đồ — ${user.username}`)
    .setTimestamp();

  if (ores.length === 0 && shopItems.length === 0) {
    embed.setDescription('Túi đồ trống. Hãy đi `!mine` hoặc `!shop` nào!');
    return embed;
  }

  if (ores.length > 0) {
    const oreLines = ores.map((o: DbInventoryItem) => {
      const info = ORE_DISPLAY[o.item_name] ?? { emoji: '❓', name: o.item_name, price: 0 };
      const total = info.price * o.quantity;
      return `${info.emoji} **${info.name}** ×${o.quantity} — Giá: ${fmt(info.price)}/cái (tổng ~${fmt(total)})`;
    });
    embed.addFields({ name: '⛏️ Quặng', value: oreLines.join('\n'), inline: false });
  }

  if (shopItems.length > 0) {
    const itemLines = shopItems.map((s: DbInventoryItem) => {
      const info = SHOP_ITEMS.find(si => si.id === s.item_name);
      return info ? `${info.emoji} **${info.name}** ×${s.quantity}` : `❓ ${s.item_name} ×${s.quantity}`;
    });
    embed.addFields({ name: '🛍️ Vật phẩm', value: itemLines.join('\n'), inline: false });
  }

  embed.setFooter({ text: 'Dùng $sell ore <tên> <số lượng> để bán quặng' });
  return embed;
}
