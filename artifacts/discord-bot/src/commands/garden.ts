import { EmbedBuilder, Message } from "discord.js";
import {
  DbUser,
  DbGarden,
  getOrCreateGarden,
  buyGardenLand,
  plantSeed,
  harvestPlot,
  removeInventoryItem,
  GARDEN_MAX_PLOTS,
} from "../db.js";
import { fmt } from "../utils.js";

// ─────────────────────────────────────────────────────────────────────────
// Cấu hình các loài cây — giá hạt giống càng cao thì thời gian chín càng
// lâu và giá bán càng cao. Hạt giống được mua trong !shop (category 'seed',
// item_name = `seed_<id>`) rồi tiêu hao khi trồng.
// ─────────────────────────────────────────────────────────────────────────
export interface PlantType {
  id: string;
  name: string;
  emoji: string;
  seedPrice: number;
  growMs: number;
  sellPrice: number;
}

export const PLANT_TYPES: PlantType[] = [
  {
    id: "carrot",
    name: "Cà rốt",
    emoji: "🥕",
    seedPrice: 10_000,
    growMs: 5 * 60_000,
    sellPrice: 15_000,
  },
  {
    id: "strawberry",
    name: "Dâu tây",
    emoji: "🍓",
    seedPrice: 25_000,
    growMs: 15 * 60_000,
    sellPrice: 40_000,
  },
  {
    id: "cabbage",
    name: "Bắp cải",
    emoji: "🥬",
    seedPrice: 50_000,
    growMs: 30 * 60_000,
    sellPrice: 85_000,
  },
  {
    id: "tomato",
    name: "Cà chua",
    emoji: "🍅",
    seedPrice: 100_000,
    growMs: 60 * 60_000,
    sellPrice: 180_000,
  },
  {
    id: "pumpkin",
    name: "Bí ngô",
    emoji: "🎃",
    seedPrice: 250_000,
    growMs: 1 * 60 * 60_000,
    sellPrice: 450_000,
  },
  {
    id: "watermelon",
    name: "Dưa hấu",
    emoji: "🍉",
    seedPrice: 500_000,
    growMs: 1 * 60 * 60_000,
    sellPrice: 900_000,
  },
  {
    id: "grape",
    name: "Nho",
    emoji: "🍇",
    seedPrice: 1_000_000,
    growMs: 1 * 60 * 60_000,
    sellPrice: 1_800_000,
  },
  {
    id: "pineapple",
    name: "Dứa",
    emoji: "🍍",
    seedPrice: 2_500_000,
    growMs: 6 * 60 * 60_000,
    sellPrice: 4_500_000,
  },
  {
    id: "mango",
    name: "Xoài",
    emoji: "🥭",
    seedPrice: 3_000_000,
    growMs: 12 * 60 * 60_000,
    sellPrice: 9_000_000,
  },
  {
    id: "diamond_tree",
    name: "Cây Kim Cương",
    emoji: "💎",
    seedPrice: 10_000_000,
    growMs: 36 * 60 * 60_000,
    sellPrice: 20_000_000,
  },
];

export const LAND_PRICE = 50_000_000; // 50 triệu / ô đất

const GRID_COLS = 8;
const GRID_ROWS = GARDEN_MAX_PLOTS / GRID_COLS;

const EMPTY_UNOWNED = "⬛";
const EMPTY_OWNED = "🟫";

function findPlant(idOrIndex: string): PlantType | undefined {
  const asNumber = Number(idOrIndex);
  if (
    !Number.isNaN(asNumber) &&
    asNumber >= 1 &&
    asNumber <= PLANT_TYPES.length
  ) {
    return PLANT_TYPES[asNumber - 1];
  }
  return PLANT_TYPES.find((p) => p.id === idOrIndex.toLowerCase());
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "đã chín 🌟";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h} giờ ${m} phút`;
  return `${m} phút`;
}

function errorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor("#FF4444")
    .setTitle(title)
    .setDescription(description);
}

function isRipe(plantedAt: number | null, plant: PlantType): boolean {
  if (!plantedAt) return false;
  return Date.now() - plantedAt >= plant.growMs;
}

// ─────────────────────────────────────────────────────────────────────────
// !garden / !vuon — xem toàn bộ khu vườn
// ─────────────────────────────────────────────────────────────────────────
export async function handleGarden(
  message: Message,
  user: DbUser,
): Promise<EmbedBuilder> {
  const garden = await getOrCreateGarden(user.discord_id);

  const rows: string[] = [];
  const ripePlots: number[] = [];

  for (let row = 0; row < GRID_ROWS; row++) {
    let rowStr = "";
    for (let col = 0; col < GRID_COLS; col++) {
      const idx = row * GRID_COLS + col;
      const plot = garden.plots[idx];

      if (idx >= garden.land) {
        rowStr += EMPTY_UNOWNED;
        continue;
      }
      if (!plot?.plant_id) {
        rowStr += EMPTY_OWNED;
        continue;
      }
      const plant = PLANT_TYPES.find((p) => p.id === plot.plant_id)!;
      rowStr += plant.emoji;
      if (isRipe(plot.planted_at, plant)) ripePlots.push(idx + 1);
    }
    const start = String(row * GRID_COLS + 1).padStart(2, "0");
    const end = String(row * GRID_COLS + GRID_COLS).padStart(2, "0");
    rows.push(`${start}-${end}  ${rowStr}`);
  }

  const embed = new EmbedBuilder()
    .setColor("#57C84D")
    .setTitle(`🌾 Vườn của ${message.author.username}`)
    .setDescription("```\n" + rows.join("\n") + "\n```")
    .addFields(
      {
        name: "📏 Đất đã mở",
        value: `${garden.land} / ${GARDEN_MAX_PLOTS} ô`,
        inline: true,
      },
      {
        name: "💰 Giá mở đất",
        value: garden.land < GARDEN_MAX_PLOTS ? fmt(LAND_PRICE) : "Đã tối đa",
        inline: true,
      },
    )
    .setFooter({
      text: "⬛ chưa mua  🟫 đất trống  |  !plant <ô>  !trongcay <ô> <cây>  !thu <ô|all>  !muadat",
    });

  if (ripePlots.length > 0) {
    embed.addFields({
      name: "✨ Sẵn sàng thu hoạch",
      value: ripePlots.join(", "),
    });
  }

  return embed;
}

// ─────────────────────────────────────────────────────────────────────────
// !plant <ô> — xem thời gian chín và giá bán của 1 ô
// ─────────────────────────────────────────────────────────────────────────
export async function handlePlantInfo(
  message: Message,
  args: string[],
  user: DbUser,
): Promise<EmbedBuilder> {
  const plotNum = Number(args[0]);
  if (!plotNum || plotNum < 1 || plotNum > GARDEN_MAX_PLOTS) {
    return errorEmbed(
      "❌ Sai cú pháp",
      `Dùng: \`!plant <ô 1-${GARDEN_MAX_PLOTS}>\``,
    );
  }

  const garden = await getOrCreateGarden(user.discord_id);
  const idx = plotNum - 1;

  if (idx >= garden.land) {
    return errorEmbed(
      "❌ Chưa mở khóa",
      `Ô đất **${plotNum}** chưa được mua. Dùng \`!muadat\` để mở thêm đất.`,
    );
  }

  const plot = garden.plots[idx];
  if (!plot?.plant_id || !plot.planted_at) {
    return errorEmbed(
      "❌ Ô trống",
      `Ô đất **${plotNum}** chưa trồng cây gì cả.`,
    );
  }

  const plant = PLANT_TYPES.find((p) => p.id === plot.plant_id)!;
  const remaining = plant.growMs - (Date.now() - plot.planted_at);
  const ripe = remaining <= 0;

  return new EmbedBuilder()
    .setColor(ripe ? "#FFD700" : "#57C84D")
    .setTitle(`${plant.emoji} Ô ${plotNum} — ${plant.name}`)
    .addFields(
      {
        name: "⏳ Trạng thái",
        value: ripe
          ? "Đã chín, có thể thu hoạch! ✨"
          : `Còn ${formatDuration(remaining)}`,
        inline: false,
      },
      {
        name: "💵 Giá bán khi thu hoạch",
        value: fmt(plant.sellPrice),
        inline: true,
      },
    );
}

// ─────────────────────────────────────────────────────────────────────────
// !trongcay <ô> <tên/số cây> — trồng cây (tiêu hao 1 hạt giống trong túi đồ)
// ─────────────────────────────────────────────────────────────────────────
export async function handleTrongCay(
  message: Message,
  args: string[],
  user: DbUser,
): Promise<EmbedBuilder> {
  const plotNum = Number(args[0]);
  const plantQuery = args[1];

  if (!plotNum || plotNum < 1 || plotNum > GARDEN_MAX_PLOTS || !plantQuery) {
    return errorEmbed(
      "❌ Sai cú pháp",
      `Dùng: \`!trongcay <ô> <tên cây>\`\nVD: \`!trongcay 1 carrot\`\nDùng \`!shop\` để xem danh sách hạt giống.`,
    );
  }

  const plant = findPlant(plantQuery);
  if (!plant) {
    return errorEmbed(
      "❌ Không tìm thấy cây",
      `Không có loài cây nào khớp với \`${plantQuery}\`.`,
    );
  }

  const garden = await getOrCreateGarden(user.discord_id);
  const idx = plotNum - 1;

  if (idx >= garden.land) {
    return errorEmbed(
      "❌ Chưa mở khóa",
      `Ô đất **${plotNum}** chưa được mua. Dùng \`!muadat\` để mở thêm đất.`,
    );
  }
  if (garden.plots[idx]?.plant_id) {
    return errorEmbed(
      "❌ Ô đã có cây",
      `Ô đất **${plotNum}** đã trồng cây rồi. Dùng \`!thu ${plotNum}\` để thu hoạch trước.`,
    );
  }

  const hasSeed = await removeInventoryItem(
    user.discord_id,
    "seed",
    `seed_${plant.id}`,
    1,
  );
  if (!hasSeed) {
    return errorEmbed(
      "❌ Thiếu hạt giống",
      `Bạn không có hạt giống **${plant.name}**. Hãy mua trong \`!shop\`.`,
    );
  }

  await plantSeed(user.discord_id, idx, plant.id);

  return new EmbedBuilder()
    .setColor("#57C84D")
    .setTitle(`${plant.emoji} Đã trồng ${plant.name}!`)
    .setDescription(
      `Ô **${plotNum}** sẽ chín sau **${formatDuration(plant.growMs)}**.`,
    );
}

// ─────────────────────────────────────────────────────────────────────────
// !thu <ô|all> — thu hoạch cây đã chín
// ─────────────────────────────────────────────────────────────────────────
export async function handleThu(
  message: Message,
  args: string[],
  user: DbUser,
): Promise<EmbedBuilder> {
  const garden = await getOrCreateGarden(user.discord_id);

  if (args[0]?.toLowerCase() === "all") {
    let total = 0;
    let count = 0;
    for (let idx = 0; idx < garden.land; idx++) {
      const plot = garden.plots[idx];
      if (!plot?.plant_id || !plot.planted_at) continue;
      const plant = PLANT_TYPES.find((p) => p.id === plot.plant_id)!;
      if (!isRipe(plot.planted_at, plant)) continue;
      total += plant.sellPrice;
      count++;
      await harvestPlot(user.discord_id, idx, plant.sellPrice);
    }
    if (count === 0) {
      return errorEmbed("❌ Chưa có gì để thu", "Không có ô nào đã chín cả.");
    }
    return new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("🌾 Thu hoạch hàng loạt!")
      .setDescription(
        `Đã thu hoạch **${count}** ô, nhận được **${fmt(total)}**.`,
      );
  }

  const plotNum = Number(args[0]);
  if (!plotNum || plotNum < 1 || plotNum > GARDEN_MAX_PLOTS) {
    return errorEmbed(
      "❌ Sai cú pháp",
      `Dùng: \`!thu <ô 1-${GARDEN_MAX_PLOTS}>\` hoặc \`!thu all\``,
    );
  }

  const idx = plotNum - 1;
  if (idx >= garden.land) {
    return errorEmbed("❌ Chưa mở khóa", `Ô đất **${plotNum}** chưa được mua.`);
  }

  const plot = garden.plots[idx];
  if (!plot?.plant_id || !plot.planted_at) {
    return errorEmbed(
      "❌ Ô trống",
      `Ô đất **${plotNum}** chưa trồng cây gì cả.`,
    );
  }

  const plant = PLANT_TYPES.find((p) => p.id === plot.plant_id)!;
  if (!isRipe(plot.planted_at, plant)) {
    const remaining = plant.growMs - (Date.now() - plot.planted_at);
    return errorEmbed(
      "⏳ Chưa chín",
      `Ô **${plotNum}** cần thêm **${formatDuration(remaining)}** nữa mới thu hoạch được.`,
    );
  }

  await harvestPlot(user.discord_id, idx, plant.sellPrice);

  return new EmbedBuilder()
    .setColor("#FFD700")
    .setTitle(`${plant.emoji} Thu hoạch thành công!`)
    .setDescription(
      `Bạn nhận được **${fmt(plant.sellPrice)}** từ ô **${plotNum}**.`,
    );
}

// ─────────────────────────────────────────────────────────────────────────
// !muadat — mua thêm 1 ô đất (100 triệu / ô, tối đa 64 ô)
// ─────────────────────────────────────────────────────────────────────────
export async function handleMuaDat(
  message: Message,
  user: DbUser,
): Promise<EmbedBuilder> {
  const garden = await getOrCreateGarden(user.discord_id);

  if (garden.land >= GARDEN_MAX_PLOTS) {
    return errorEmbed(
      "❌ Đã tối đa",
      `Bạn đã sở hữu tối đa **${GARDEN_MAX_PLOTS}** ô đất rồi.`,
    );
  }
  if (Number(user.money) < LAND_PRICE) {
    return errorEmbed(
      "❌ Không đủ tiền",
      `Cần **${fmt(LAND_PRICE)}** để mua thêm đất. Bạn hiện có **${fmt(Number(user.money))}**.`,
    );
  }

  const newLand = await buyGardenLand(user.discord_id, LAND_PRICE);

  return new EmbedBuilder()
    .setColor("#57C84D")
    .setTitle("🟫 Mua đất thành công!")
    .setDescription(
      `Bạn hiện sở hữu **${newLand} / ${GARDEN_MAX_PLOTS}** ô đất.`,
    );
}
