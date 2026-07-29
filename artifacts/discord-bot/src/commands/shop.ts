import { EmbedBuilder, Message } from "discord.js";
import { DbUser, updateMoney, addInventoryItem, hasItem } from "../db.js";
import { fmt } from "../utils.js";
import { PLANT_TYPES } from "./garden.js";

export interface ShopItem {
  id: string;
  emoji: string;
  name: string;
  description: string;
  price: number;
  unique: boolean;
  category: "item" | "seed";
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "fishing_rod",
    emoji: "🎣",
    name: "Cần câu nâng cấp",
    description: "Tăng 50% tiền khi câu cá",
    price: 1_200_000,
    unique: true,
    category: "item",
  },
  {
    id: "diamond_pickaxe",
    emoji: "⛏️",
    name: "Cuốc kim cương",
    description: "Đào được thêm 1 quặng mỗi lần",
    price: 2_500_000,
    unique: true,
    category: "item",
  },
  {
    id: "lucky_charm",
    emoji: "🍀",
    name: "Bùa may mắn",
    description: "Tăng 5% tỉ lệ thắng cờ bạc",
    price: 1_150_000,
    unique: true,
    category: "item",
  },
  {
    id: "crime_mask",
    emoji: "🎭",
    name: "Mặt nạ",
    description: "Giảm 20% tỉ lệ bị bắt khi crime",
    price: 10_100_000,
    unique: true,
    category: "item",
  },
  ...PLANT_TYPES.map(
    (plant): ShopItem => ({
      id: `seed_${plant.id}`,
      emoji: plant.emoji,
      name: `Hạt giống ${plant.name}`,
      description: `Trồng bằng !trongcay — chín sau ${formatGrowTime(
        plant.growMs,
      )}, bán được ${fmt(plant.sellPrice)}`,
      price: plant.seedPrice,
      unique: false,
      category: "seed",
    }),
  ),
];

function formatGrowTime(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  if (h > 0 && m > 0) return `${h}h${m}p`;
  if (h > 0) return `${h}h`;
  return `${m}p`;
}

const ITEMS_PER_PAGE = 5;

function buildShopPages(): EmbedBuilder[] {
  const items = SHOP_ITEMS.filter((i) => i.category === "item");
  const seeds = SHOP_ITEMS.filter((i) => i.category === "seed");
  const seedPageCount = Math.ceil(seeds.length / ITEMS_PER_PAGE);
  const totalPages = 1 + seedPageCount;

  const pages: EmbedBuilder[] = [];

  // Page 1: Vật phẩm
  const itemLines = items.map(
    (item, i) =>
      `**${i + 1}.** ${item.emoji} **${item.name}** — ${fmt(item.price)}\n┗ ${item.description}`,
  );
  pages.push(
    new EmbedBuilder()
      .setColor("#FF9500")
      .setTitle("🛒 Cửa hàng")
      .addFields({ name: "🎒 Vật phẩm", value: itemLines.join("\n\n") })
      .setFooter({
        text: `Trang 1/${totalPages} | ⬅️➡️ chuyển trang | !buy <số> để mua`,
      }),
  );

  // Seed pages (5 per page)
  for (let p = 0; p < seedPageCount; p++) {
    const slice = seeds.slice(p * ITEMS_PER_PAGE, (p + 1) * ITEMS_PER_PAGE);
    const seedLines = slice.map((item) => {
      const idx = SHOP_ITEMS.indexOf(item) + 1;
      return `**${idx}.** ${item.emoji} **${item.name}** — ${fmt(item.price)}\n┗ ${item.description}`;
    });
    pages.push(
      new EmbedBuilder()
        .setColor("#FF9500")
        .setTitle("🛒 Cửa hàng")
        .addFields({
          name: `🌱 Hạt giống (${p + 1}/${seedPageCount})`,
          value: seedLines.join("\n\n"),
        })
        .setFooter({
          text: `Trang ${p + 2}/${totalPages} | ⬅️➡️ chuyển trang | !buy <số> để mua | !trongcay <ô> <id>`,
        }),
    );
  }

  return pages;
}

export async function handleShop(message: Message): Promise<EmbedBuilder | null> {
  const pages = buildShopPages();

  const sent = await message.reply({ embeds: [pages[0]!] });

  if (pages.length <= 1) return null;

  await sent.react("⬅️");
  await sent.react("➡️");

  let currentPage = 0;

  const collector = sent.createReactionCollector({
    filter: (reaction, user) =>
      ["⬅️", "➡️"].includes(reaction.emoji.name ?? "") &&
      user.id === message.author.id,
    time: 60_000,
  });

  collector.on("collect", async (reaction, user) => {
    if (reaction.emoji.name === "➡️") {
      currentPage = Math.min(currentPage + 1, pages.length - 1);
    } else {
      currentPage = Math.max(currentPage - 1, 0);
    }
    await sent.edit({ embeds: [pages[currentPage]!] });
    await reaction.users.remove(user.id).catch(() => {});
  });

  collector.on("end", async () => {
    await sent.reactions.removeAll().catch(() => {});
  });

  return null;
}

export async function handleBuy(
  message: Message,
  args: string[],
  user: DbUser,
): Promise<EmbedBuilder> {
  const idx = parseInt(args[0] ?? "", 10) - 1;
  const item = SHOP_ITEMS[idx];

  if (!item) {
    return new EmbedBuilder()
      .setColor("#FF4444")
      .setTitle("❌ Lỗi")
      .setDescription(
        `Mặt hàng không hợp lệ. Dùng \`!shop\` để xem danh sách.`,
      );
  }

  if (Number(user.money) < item.price) {
    return new EmbedBuilder()
      .setColor("#FF4444")
      .setTitle("❌ Không đủ tiền")
      .setDescription(
        `Bạn cần **${fmt(item.price)}** nhưng chỉ có **${fmt(
          Number(user.money),
        )}**.`,
      );
  }

  if (item.unique && (await hasItem(user.discord_id, item.category, item.id))) {
    return new EmbedBuilder()
      .setColor("#FF4444")
      .setTitle("❌ Đã sở hữu")
      .setDescription(`Bạn đã có **${item.emoji} ${item.name}** rồi!`);
  }

  await updateMoney(user.discord_id, -item.price);
  await addInventoryItem(user.discord_id, item.category, item.id, 1);

  return new EmbedBuilder()
    .setColor("#00FF88")
    .setTitle("🛒 Mua thành công!")
    .setDescription(`Bạn đã mua **${item.emoji} ${item.name}**!`)
    .addFields(
      {
        name: "💰 Đã trả",
        value: fmt(item.price),
        inline: true,
      },
      {
        name: "✨ Hiệu ứng",
        value: item.description,
        inline: true,
      },
    );
}
