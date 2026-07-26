import { EmbedBuilder, Message } from 'discord.js';

export async function handleHelp(_message: Message): Promise<EmbedBuilder> {
  return new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('📖 Danh sách lệnh')
    .setDescription('Prefix: **`!`** (hầu hết lệnh) và **`$`** (lệnh bán)')
    .addFields(
      {
        name: '👤 Hồ sơ & Kinh tế',
        value: [
          '`!profile [@user]` — Xem hồ sơ',
          '`!daily` — Nhận thưởng hàng ngày (24h)',
          '`!leaderboard [money]` — Bảng xếp hạng',
          '`!transfer @user <tiền>` — Chuyển tiền',
        ].join('\n'),
      },
      {
        name: '🏦 Ngân hàng',
        value: [
          '`!bank balance` — Xem số dư (lãi 0.5%/ngày)',
          '`!bank deposit <tiền>` — Gửi tiền',
          '`!bank withdraw <tiền>` — Rút tiền',
        ].join('\n'),
      },
      {
        name: '⛏️ Khai thác & Bán hàng',
        value: [
          '`!mine` — Đào quặng (45 phút cooldown)',
          '`!inventory` — Xem túi đồ',
          '`$sell ore <tên> <số lượng>` — Bán quặng',
          '`$sell ore diamond 10` — VD: bán 10 kim cương',
        ].join('\n'),
      },
      {
        name: '🎣 Câu cá',
        value: '`!fish` — Câu cá (30 phút cooldown)',
      },
      {
        name: '🔫 Bất hợp pháp',
        value: '`!crime` — Làm bậy (2 giờ cooldown, rủi ro cao)',
      },
      {
        name: '🎲 Cờ bạc',
        value: [
          '`!gamble <tiền>` — Máy đánh bạc (50% thắng)',
          '`!coinflip <tiền> heads/tails` — Tung đồng xu',
        ].join('\n'),
      },
      {
        name: '🛒 Cửa hàng',
        value: [
          '`!shop` — Xem danh sách vật phẩm',
          '`!buy <số thứ tự>` — Mua vật phẩm',
        ].join('\n'),
      },
      {
        name: '💬 Tự động',
        value: 'Nhận **1–5 EXP** mỗi khi chat (1 phút cooldown)',
      },
      {
        name: '📊 Hệ thống Level',
        value: 'Lv1→2: 50 EXP | Lv n→n+1: `round(50 × (1 + 1.1ⁿ))` EXP\nBắt đầu với **1,000,000 ₫**',
      },
    )
    .setFooter({ text: 'Dùng !help để xem lại lệnh này' });
}
