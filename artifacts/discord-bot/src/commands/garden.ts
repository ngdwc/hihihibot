import { EmbedBuilder, Message } from "discord.js";
import {
  DbUser, DbGarden, getOrCreateGarden, buyGardenLand, plantSeed, clearPlot,
  removeInventoryItem, addInventoryItem, incrementStat, checkAndGrant, GARDEN_MAX_PLOTS,
} from "../db.js";
import { fmt } from "../utils.js";

export interface PlantType {
  id: string;
  name: string;
  emoji: string;
  seedPrice: number;
  growMs: number;
  sellPrice: number;  // giá bán cơ bản (trước khi tính cân nặng)
  baseWeight: number; // kg — random [baseWeight, 2×baseWeight] khi bán
}

export const PLANT_TYPES: PlantType[] = [
  // ── Cây gốc (10 loại, thời gian chín giảm + giá tăng) ───────────────────
  { id: "carrot",       name: "Cà rốt",        emoji: "🥕", seedPrice: 10_000,      growMs: 3   * 60_000,          sellPrice: 18_000,      baseWeight: 0.3  },
  { id: "strawberry",   name: "Dâu tây",        emoji: "🍓", seedPrice: 25_000,      growMs: 8   * 60_000,          sellPrice: 50_000,      baseWeight: 0.2  },
  { id: "cabbage",      name: "Bắp cải",        emoji: "🥬", seedPrice: 50_000,      growMs: 20  * 60_000,          sellPrice: 100_000,     baseWeight: 1.2  },
  { id: "tomato",       name: "Cà chua",        emoji: "🍅", seedPrice: 100_000,     growMs: 40  * 60_000,          sellPrice: 220_000,     baseWeight: 0.4  },
  { id: "pumpkin",      name: "Bí ngô",         emoji: "🎃", seedPrice: 250_000,     growMs: 90  * 60_000,          sellPrice: 600_000,     baseWeight: 2.0  },
  { id: "watermelon",   name: "Dưa hấu",        emoji: "🍉", seedPrice: 500_000,     growMs: 2   * 60 * 60_000,     sellPrice: 1_300_000,   baseWeight: 5.0  },
  { id: "grape",        name: "Nho",            emoji: "🍇", seedPrice: 1_000_000,   growMs: 3   * 60 * 60_000,     sellPrice: 2_500_000,   baseWeight: 0.8  },
  { id: "pineapple",    name: "Dứa",            emoji: "🍍", seedPrice: 2_500_000,   growMs: 4   * 60 * 60_000,     sellPrice: 6_000_000,   baseWeight: 1.5  },
  { id: "mango",        name: "Xoài",           emoji: "🥭", seedPrice: 3_000_000,   growMs: 8   * 60 * 60_000,     sellPrice: 12_000_000,  baseWeight: 0.4  },
  { id: "diamond_tree", name: "Cây Kim Cương",  emoji: "💎", seedPrice: 10_000_000,  growMs: 24  * 60 * 60_000,     sellPrice: 28_000_000,  baseWeight: 0.05 },
  // ── 5 loại cây mới ──────────────────────────────────────────────────────
  { id: "apple",        name: "Táo",            emoji: "🍎", seedPrice: 200_000,     growMs: 60  * 60_000,          sellPrice: 650_000,     baseWeight: 0.3  },
  { id: "tulip",        name: "Hoa Tulip",      emoji: "🌷", seedPrice: 500_000,     growMs: 90  * 60_000,          sellPrice: 2_000_000,   baseWeight: 0.15 },
  { id: "sunflower",    name: "Hướng dương",    emoji: "🌻", seedPrice: 1_500_000,   growMs: 3   * 60 * 60_000,     sellPrice: 5_000_000,   baseWeight: 0.3  },
  { id: "cherry",       name: "Anh đào",        emoji: "🍒", seedPrice: 5_000_000,   growMs: 6   * 60 * 60_000,     sellPrice: 18_000_000,  baseWeight: 0.1  },
  { id: "dragon_cactus",name: "Cây Rồng",       emoji: "🌵", seedPrice: 20_000_000,  growMs: 48  * 60 * 60_000,     sellPrice: 70_000_000,  baseWeight: 1.0  },
];

export const LAND_PRICE = 50_000_000;
const GRID_COLS = 8;
const GRID_ROWS = GARDEN_MAX_PLOTS / GRID_COLS;
const EMPTY_UNOWNED = "⬛";
const EMPTY_OWNED = "🟫";

export function findPlant(idOrIndex: string): PlantType | undefined {
  const n = Number(idOrIndex);
  if (!isNaN(n) && n >= 1 && n <= PLANT_TYPES.length) return PLANT_TYPES[n - 1];
  return PLANT_TYPES.find((p) => p.id === idOrIndex.toLowerCase());
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "đã chín 🌟";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
}

function errEmbed(title: string, desc: string): EmbedBuilder {
  return new EmbedBuilder().setColor("#FF4444").setTitle(title).setDescription(desc);
}

function isRipe(plantedAt: number | null, plant: PlantType): boolean {
  if (!plantedAt) return false;
  return Date.now() - plantedAt >= plant.growMs;
}

// ── !garden / !vuon ──────────────────────────────────────────────────────────
export async function handleGarden(message: Message, user: DbUser): Promise<EmbedBuilder> {
  const garden = await getOrCreateGarden(user.discord_id);
  const rows: string[] = [];
  const ripePlots: number[] = [];

  for (let row = 0; row < GRID_ROWS; row++) {
    let rowStr = "";
    for (let col = 0; col < GRID_COLS; col++) {
      const idx = row * GRID_COLS + col;
      const plot = garden.plots[idx];
      if (idx >= garden.land) { rowStr += EMPTY_UNOWNED; continue; }
      if (!plot?.plant_id) { rowStr += EMPTY_OWNED; continue; }
      const plant = PLANT_TYPES.find((p) => p.id === plot.plant_id)!;
      rowStr += plant.emoji;
      if (isRipe(plot.planted_at, plant)) ripePlots.push(idx + 1);
    }
    const s = String(row * GRID_COLS + 1).padStart(2, "0");
    const e = String(row * GRID_COLS + GRID_COLS).padStart(2, "0");
    rows.push(`${s}-${e}  ${rowStr}`);
  }

  const embed = new EmbedBuilder()
    .setColor("#57C84D")
    .setTitle(`🌾 Vườn của ${message.author.username}`)
    .setDescription("```\n" + rows.join("\n") + "\n```")
    .addFields(
      { name: "📏 Đất đã mở", value: `${garden.land} / ${GARDEN_MAX_PLOTS} ô`, inline: true },
      { name: "💰 Giá mở đất", value: garden.land < GARDEN_MAX_PLOTS ? fmt(LAND_PRICE) : "Đã tối đa", inline: true },
    )
    .setFooter({ text: "⬛ chưa mua  🟫 đất trống  |  !trongcay <ô> <id_cây>  !thu <ô|all>  !muadat" });

  if (ripePlots.length > 0) {
    embed.addFields({ name: "✨ Sẵn sàng thu hoạch", value: ripePlots.join(", ") });
  }
  return embed;
}

// ── !plant <ô> ───────────────────────────────────────────────────────────────
export async function handlePlantInfo(message: Message, args: string[], user: DbUser): Promise<EmbedBuilder> {
  const plotNum = Number(args[0]);
  if (!plotNum || plotNum < 1 || plotNum > GARDEN_MAX_PLOTS) {
    return errEmbed("❌ Sai cú pháp", `Dùng: \`!plant <ô 1-${GARDEN_MAX_PLOTS}>\``);
  }
  const garden = await getOrCreateGarden(user.discord_id);
  const idx = plotNum - 1;
  if (idx >= garden.land) return errEmbed("❌ Chưa mở khóa", `Ô **${plotNum}** chưa được mua. Dùng \`!muadat\`.`);
  const plot = garden.plots[idx];
  if (!plot?.plant_id || !plot.planted_at) return errEmbed("❌ Ô trống", `Ô **${plotNum}** chưa trồng cây.`);

  const plant = PLANT_TYPES.find((p) => p.id === plot.plant_id)!;
  const remaining = plant.growMs - (Date.now() - plot.planted_at);
  const ripe = remaining <= 0;

  return new EmbedBuilder()
    .setColor(ripe ? "#FFD700" : "#57C84D")
    .setTitle(`${plant.emoji} Ô ${plotNum} — ${plant.name} \`${plant.id}\``)
    .addFields(
      { name: "⏳ Trạng thái", value: ripe ? "Đã chín ✨ — dùng `!thu " + plotNum + "`" : `Còn ${formatDuration(remaining)}`, inline: false },
      { name: "💵 Giá bán cơ bản", value: fmt(plant.sellPrice), inline: true },
      { name: "⚖️ Cân nặng cơ bản", value: `${plant.baseWeight} kg`, inline: true },
    );
}

// ── !trongcay <ô> <cây> ──────────────────────────────────────────────────────
export async function handleTrongCay(message: Message, args: string[], user: DbUser): Promise<EmbedBuilder> {
  const plotNum = Number(args[0]);
  const plantQuery = args[1];

  if (!plotNum || plotNum < 1 || plotNum > GARDEN_MAX_PLOTS || !plantQuery) {
    return errEmbed("❌ Sai cú pháp", "Dùng: `!trongcay <ô> <id_cây>`\nVD: `!trongcay 1 carrot`\nDùng `!shop` trang 2/3 để xem hạt giống.");
  }

  const plant = findPlant(plantQuery);
  if (!plant) return errEmbed("❌ Không tìm thấy", `Không có cây nào khớp với \`${plantQuery}\`.`);

  const garden = await getOrCreateGarden(user.discord_id);
  const idx = plotNum - 1;
  if (idx >= garden.land) return errEmbed("❌ Chưa mở khóa", `Ô **${plotNum}** chưa mua. Dùng \`!muadat\`.`);
  if (garden.plots[idx]?.plant_id) return errEmbed("❌ Ô đã có cây", `Ô **${plotNum}** đã trồng rồi. Thu hoạch trước: \`!thu ${plotNum}\`.`);

  const hasSeed = await removeInventoryItem(user.discord_id, "seed", `seed_${plant.id}`, 1);
  if (!hasSeed) return errEmbed("❌ Thiếu hạt giống", `Bạn không có hạt **${plant.name}**. Mua tại \`!shop\`.`);

  await plantSeed(user.discord_id, idx, plant.id);

  return new EmbedBuilder()
    .setColor("#57C84D")
    .setTitle(`${plant.emoji} Đã trồng ${plant.name}!`)
    .setDescription(`Ô **${plotNum}** sẽ chín sau **${formatDuration(plant.growMs)}**.`);
}

// ── !thu <ô|all> ─────────────────────────────────────────────────────────────
export async function handleThu(message: Message, args: string[], user: DbUser): Promise<EmbedBuilder> {
  const garden = await getOrCreateGarden(user.discord_id);

  if (args[0]?.toLowerCase() === "all") {
    let count = 0;
    const collected: Map<string, { plant: PlantType; qty: number }> = new Map();

    for (let idx = 0; idx < garden.land; idx++) {
      const plot = garden.plots[idx];
      if (!plot?.plant_id || !plot.planted_at) continue;
      const plant = PLANT_TYPES.find((p) => p.id === plot.plant_id)!;
      if (!isRipe(plot.planted_at, plant)) continue;

      await clearPlot(user.discord_id, idx);
      await addInventoryItem(user.discord_id, "plant", plant.id, 1);
      count++;

      const entry = collected.get(plant.id);
      if (entry) entry.qty++;
      else collected.set(plant.id, { plant, qty: 1 });
    }

    if (count === 0) return errEmbed("❌ Chưa có gì để thu", "Không có ô nào đã chín cả.");

    await incrementStat(user.discord_id, "harvestCount", count);
    const newHarvestCount = (user.harvest_count ?? 0) + count;
    const earnedFarmer = await checkAndGrant(user.discord_id, "farmer", newHarvestCount >= 100);

    const lines = Array.from(collected.values()).map(
      ({ plant, qty }) => `${plant.emoji} **${plant.name}** \`${plant.id}\` ×${qty}`,
    );

    const embed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("🌾 Thu hoạch hàng loạt!")
      .setDescription(`Thu **${count}** ô vào túi đồ!\n${lines.join("\n")}\n\nDùng \`$sell plant <id> <số>\` để bán.`);

    if (earnedFarmer) embed.addFields({ name: "🏆 Thành tựu mới!", value: "🌾 **Nông Dân Chăm Chỉ** — Thu hoạch 100 lần!" });
    return embed;
  }

  const plotNum = Number(args[0]);
  if (!plotNum || plotNum < 1 || plotNum > GARDEN_MAX_PLOTS) {
    return errEmbed("❌ Sai cú pháp", `Dùng: \`!thu <ô 1-${GARDEN_MAX_PLOTS}>\` hoặc \`!thu all\``);
  }

  const idx = plotNum - 1;
  if (idx >= garden.land) return errEmbed("❌ Chưa mở khóa", `Ô **${plotNum}** chưa mua.`);

  const plot = garden.plots[idx];
  if (!plot?.plant_id || !plot.planted_at) return errEmbed("❌ Ô trống", `Ô **${plotNum}** chưa trồng cây.`);

  const plant = PLANT_TYPES.find((p) => p.id === plot.plant_id)!;
  if (!isRipe(plot.planted_at, plant)) {
    return errEmbed("⏳ Chưa chín", `Ô **${plotNum}** cần thêm **${formatDuration(plant.growMs - (Date.now() - plot.planted_at))}** nữa.`);
  }

  await clearPlot(user.discord_id, idx);
  await addInventoryItem(user.discord_id, "plant", plant.id, 1);
  await incrementStat(user.discord_id, "harvestCount");
  const newHarvestCount = (user.harvest_count ?? 0) + 1;
  const earnedFarmer = await checkAndGrant(user.discord_id, "farmer", newHarvestCount >= 100);

  const embed = new EmbedBuilder()
    .setColor("#FFD700")
    .setTitle(`${plant.emoji} Thu hoạch thành công!`)
    .setDescription(`**${plant.name}** \`${plant.id}\` đã vào túi đồ!\nDùng \`$sell plant ${plant.id} 1\` để bán.`);

  if (earnedFarmer) embed.addFields({ name: "🏆 Thành tựu mới!", value: "🌾 **Nông Dân Chăm Chỉ** — Thu hoạch 100 lần!" });
  return embed;
}

// ── !muadat ──────────────────────────────────────────────────────────────────
export async function handleMuaDat(message: Message, user: DbUser): Promise<EmbedBuilder> {
  const garden = await getOrCreateGarden(user.discord_id);
  if (garden.land >= GARDEN_MAX_PLOTS) {
    return errEmbed("❌ Đã tối đa", `Bạn đã sở hữu tối đa **${GARDEN_MAX_PLOTS}** ô.`);
  }
  if (Number(user.money) < LAND_PRICE) {
    return errEmbed("❌ Không đủ tiền", `Cần **${fmt(LAND_PRICE)}**. Hiện có **${fmt(Number(user.money))}**.`);
  }
  const newLand = await buyGardenLand(user.discord_id, LAND_PRICE);
  return new EmbedBuilder()
    .setColor("#57C84D")
    .setTitle("🟫 Mua đất thành công!")
    .setDescription(`Bạn hiện sở hữu **${newLand} / ${GARDEN_MAX_PLOTS}** ô đất.`);
}
