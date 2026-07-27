import { EmbedBuilder, Message } from "discord.js";
export async function handleHelp(_message: Message): Promise<EmbedBuilder> {
  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("📖 Danh sách lệnh")
    .setDescription("Prefix: **`!`** (hầu hết lệnh) và **`$`** (lệnh bán)")
    .addFields(
      {
        name: "👤 Hồ sơ & Kinh tế",
        value: [
          "`!profile [@user]` — Xem hồ sơ",
          "`!daily` — Nhận thưởng hàng ngày (24h)",
          "`!leaderboard [money]` — Bảng xếp hạng",
          "`!transfer @user <tiền>` — Chuyển tiền",
        ].join("\n"),
      },
      {
        name: "🏦 Ngân hàng",
        value: [
          "`!bank balance` — Xem số dư (lãi 2.5%/ngày)",
          "`!bank deposit <tiền>` — Gửi tiền",
          "`!bank withdraw <tiền>` — Rút tiền",
        ].join("\n"),
      },
      {
        name: "⛏️ Khai thác & Bán hàng",
        value: [
          "`!mine` — Đào quặng (10 phút cooldown)",
          "`!inventory` — Xem túi đồ",
          "`$sell ore <tên> <số lượng>` — Bán quặng",
          "`$sell fish <id> <số lượng>` — Bán cá (VD: `$sell fish ca_hoi 3`)",
          "`$sell plant <id> <số lượng>` — Bán nông sản (VD: `$sell plant carrot 5`)",
        ].join("\n"),
      },
      {
        name: "🌾 Vườn cây",
        value: [
          "`!garden` — Xem khu vườn (⬛ chưa mua · 🟫 đất trống · 🌱 đã trồng)",
          "`!plant <ô>` — Xem thời gian chín & giá bán của 1 ô",
          "`!trongcay <ô> <tên cây>` — Trồng hạt giống (mua ở `!shop`)",
          "`!thu <ô|all>` — Thu hoạch 1 ô hoặc tất cả ô đã chín",
          "`!muadat` — Mua thêm 1 ô đất",
        ].join("\n"),
      },
      {
        name: "🎲 Tài Xỉu",
        value: [
          "`!taixiu new` — Tạo phiên mới (15 giây), bấm 🇹 (Tài) hoặc 🇽 (Xỉu) để cược",
          "`!taixiu cuoc <số tiền>` — Đặt mức cược mặc định (dùng khi bấm cược)",
          "`!taixiu lsp` — Xem 5 phiên gần nhất",
        ].join("\n"),
      },
      {
        name: "🎣 Câu cá",
        value: "`!fish` — Câu cá (30 phút cooldown)",
      },
      {
        name: "🔫 Bất hợp pháp",
        value: "`!crime` — Làm bậy (2 giờ cooldown, rủi ro cao)",
      },
      {
        name: "🎲 Cờ bạc",
        value: [
          "`!gamble <tiền>` — Máy đánh bạc (50% thắng)",
          "`!coinflip <tiền> heads/tails` — Tung đồng xu",
        ].join("\n"),
      },
      {
        name: "🛒 Cửa hàng",
        value: [
          "`!shop` — Xem danh sách vật phẩm",
          "`!buy <số thứ tự>` — Mua vật phẩm",
        ].join("\n"),
      },
      {
        name: "💬 Tự động",
        value: "Nhận **1–5 EXP** mỗi khi chat (1 phút cooldown)",
      },
      {
        name: "📊 Hệ thống Level",
        value:
          "Lv1→2: 50 EXP | Lv n→n+1: `round(50 × (1 + 1.1ⁿ))` EXP\nBắt đầu với **1,000,000 ₫**",
      },
    )
    .setFooter({ text: "Dùng !help để xem lại lệnh này" });
}
