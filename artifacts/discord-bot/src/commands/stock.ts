import { EmbedBuilder, Message } from "discord.js";
import {
  DbUser,
  updateMoney,
  getStockPosition,
  openStockPosition,
  closeStockPosition,
} from "../db.js";
import { fmt } from "../utils.js";

async function getBtcPrice(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { bitcoin: { usd: number } };
  return data.bitcoin.usd;
}

function fmtUsd(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function parseMoney(arg: string, userMoney: number): number | null {
  if (arg.toLowerCase() === "all") return Math.floor(userMoney);
  const n = parseInt(arg.replace(/[.,_]/g, ""), 10);
  if (isNaN(n) || n <= 0) return null;
  return n;
}

function pnlInfo(
  posType: "long" | "short",
  amount: number,
  entryPrice: number,
  currentPrice: number,
): { pnl: number; pct: number } {
  const pct =
    posType === "long"
      ? (currentPrice - entryPrice) / entryPrice
      : (entryPrice - currentPrice) / entryPrice;
  return { pnl: Math.round(amount * pct), pct };
}

export async function handleStock(
  message: Message,
  args: string[],
  user: DbUser,
): Promise<EmbedBuilder> {
  const sub = args[0]?.toLowerCase();

  // ── !ck (no args) — xem giá + vị thế ─────────────────────────────────────
  if (!sub) {
    let btcPrice: number;
    try {
      btcPrice = await getBtcPrice();
    } catch {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Lỗi API")
        .setDescription("Không lấy được giá Bitcoin. Thử lại sau.");
    }

    const pos = await getStockPosition(user.discord_id);
    const embed = new EmbedBuilder()
      .setColor("#F7931A")
      .setTitle("₿ Thị trường Bitcoin")
      .addFields({
        name: "💹 Giá BTC/USD",
        value: fmtUsd(btcPrice),
        inline: true,
      });

    if (pos) {
      const { pnl, pct } = pnlInfo(
        pos.type,
        pos.amount,
        pos.entry_price,
        btcPrice,
      );
      const sign = pnl >= 0 ? "+" : "";
      embed
        .addFields(
          {
            name: "📊 Vị thế",
            value: pos.type === "long" ? "🟢 LONG (Mua)" : "🔴 SHORT (Bán)",
            inline: true,
          },
          { name: "💰 Vốn", value: fmt(pos.amount), inline: true },
          {
            name: "📈 Giá vào",
            value: fmtUsd(pos.entry_price),
            inline: true,
          },
          {
            name: "📉 PnL",
            value: `${sign}${fmt(pnl)} (${sign}${(pct * 100).toFixed(2)}%)`,
            inline: true,
          },
        )
        .setFooter({ text: "!ck close — đóng vị thế" });
    } else {
      embed
        .addFields({
          name: "📋 Vị thế",
          value: "Chưa có vị thế",
          inline: true,
        })
        .setFooter({ text: "!ck mua <tiền|all>  |  !ck ban <tiền|all>" });
    }
    return embed;
  }

  // ── !ck close ─────────────────────────────────────────────────────────────
  if (sub === "close" || sub === "dong") {
    const pos = await getStockPosition(user.discord_id);
    if (!pos) {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Chưa có vị thế")
        .setDescription(
          "Dùng `!ck mua <tiền>` hoặc `!ck ban <tiền>` để mở vị thế.",
        );
    }

    let btcPrice: number;
    try {
      btcPrice = await getBtcPrice();
    } catch {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Lỗi API")
        .setDescription("Không lấy được giá BTC. Vị thế vẫn còn. Thử lại.");
    }

    await closeStockPosition(user.discord_id);

    const { pnl, pct } = pnlInfo(
      pos.type,
      pos.amount,
      pos.entry_price,
      btcPrice,
    );
    const returned = Math.max(0, pos.amount + pnl);
    await updateMoney(user.discord_id, returned);

    const isWin = pnl >= 0;
    const sign = pnl >= 0 ? "+" : "";

    return new EmbedBuilder()
      .setColor(isWin ? "#00FF88" : "#FF4444")
      .setTitle(isWin ? "₿ Đóng vị thế — Thắng! 🎉" : "₿ Đóng vị thế — Thua 📉")
      .addFields(
        {
          name: "📊 Vị thế",
          value: pos.type === "long" ? "🟢 LONG (Mua)" : "🔴 SHORT (Bán)",
          inline: true,
        },
        { name: "💰 Vốn ban đầu", value: fmt(pos.amount), inline: true },
        { name: "📈 Giá vào", value: fmtUsd(pos.entry_price), inline: true },
        { name: "📉 Giá đóng", value: fmtUsd(btcPrice), inline: true },
        {
          name: isWin ? "💰 Lợi nhuận" : "💸 Lỗ",
          value: `${sign}${fmt(pnl)} (${sign}${(pct * 100).toFixed(2)}%)`,
          inline: true,
        },
        { name: "💳 Nhận về", value: fmt(returned), inline: true },
      );
  }

  // ── !ck mua / !ck ban ─────────────────────────────────────────────────────
  if (sub === "mua" || sub === "ban") {
    const existing = await getStockPosition(user.discord_id);
    if (existing) {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Đang có vị thế mở")
        .setDescription("Dùng `!ck close` để đóng vị thế hiện tại trước.");
    }

    const amountArg = args[1];
    if (!amountArg) {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Thiếu số tiền")
        .setDescription("VD: `!ck mua 1000000` hoặc `!ck mua all`");
    }

    const amount = parseMoney(amountArg, Number(user.money));
    if (!amount) {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Số tiền không hợp lệ")
        .setDescription("VD: `!ck mua 500000` hoặc `!ck ban all`");
    }
    if (amount < 1_000) {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Cược tối thiểu 1,000₫");
    }
    if (amount > Number(user.money)) {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Không đủ tiền")
        .setDescription(
          `Bạn chỉ có **${fmt(Number(user.money))}**. Dùng \`all\` để cược tất tay.`,
        );
    }

    let btcPrice: number;
    try {
      btcPrice = await getBtcPrice();
    } catch {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Lỗi API")
        .setDescription("Không lấy được giá BTC. Thử lại sau.");
    }

    const type = sub === "mua" ? "long" : "short";
    await updateMoney(user.discord_id, -amount);
    await openStockPosition(user.discord_id, type, amount, btcPrice);

    return new EmbedBuilder()
      .setColor(type === "long" ? "#00FF88" : "#FF4444")
      .setTitle(
        type === "long"
          ? "₿ Mở vị thế 🟢 LONG!"
          : "₿ Mở vị thế 🔴 SHORT!",
      )
      .addFields(
        { name: "💰 Vốn", value: fmt(amount), inline: true },
        { name: "📈 Giá BTC vào lệnh", value: fmtUsd(btcPrice), inline: true },
        {
          name: "📋 Chiến lược",
          value:
            type === "long"
              ? "Thắng khi BTC **tăng** sau khi đóng"
              : "Thắng khi BTC **giảm** sau khi đóng",
          inline: false,
        },
      )
      .setFooter({ text: "!ck — xem vị thế  |  !ck close — đóng lệnh" });
  }

  // ── Help ──────────────────────────────────────────────────────────────────
  return new EmbedBuilder()
    .setColor("#F7931A")
    .setTitle("₿ Chứng khoán Bitcoin")
    .setDescription(
      "`!ck` — xem giá BTC + vị thế hiện tại\n" +
        "`!ck mua <tiền|all>` — mở LONG (thắng khi BTC tăng)\n" +
        "`!ck ban <tiền|all>` — mở SHORT (thắng khi BTC giảm)\n" +
        "`!ck close` — đóng vị thế và nhận kết quả\n\n" +
        "Lỗ tối đa = vốn bỏ vào (không âm hơn 0).",
    );
}
