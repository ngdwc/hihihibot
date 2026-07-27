---
name: Discord RPG bot features
description: Toàn bộ tính năng của bot kinh tế RPG tiếng Việt (HiHiHi#9062)
---

## Cấu trúc
- **Prefix:** `!` (lệnh chính), `$` (chỉ cho `$sell`)
- **Database:** MongoDB Atlas qua Mongoose (`MONGODB_URI` secret)
- **Entry point:** `artifacts/discord-bot/src/index.ts`
- **Admin:** username `_.wumingwufen` — lệnh `!level set/add`, `!tien`

## Models MongoDB (db.ts)
- `User`: discordId, username, level, exp, money (mặc định 1.000.000₫)
- `Inventory`: discordId, category (`ore`/`item`/`seed`), itemName, quantity
- `Bank`: discordId, balance, lastInterestAt — lãi 2.5%/ngày
- `Cooldown`: discordId, command, lastUsedAt
- `Garden`: discordId, land (số ô, bắt đầu 3, tối đa 64), plots[64]
- `TaixiuBet`: discordId, betAmount (mức cược mặc định)
- `TaixiuSession`: lịch sử phiên tài xỉu

## Level formula
- Lv 1→2: 50 EXP
- Lv n→n+1: `Math.round(50 * (1 + 1.1^n))`
- Auto EXP từ chat: 1–5 EXP, cooldown 1 phút

## Commands đầy đủ
| Command | Alias | Mô tả |
|---------|-------|-------|
| `!profile` | `!p`, `!ho_so` | Xem hồ sơ |
| `!daily` | `!dinh_ky` | Nhận tiền hàng ngày (24h cooldown, 50k–150k + bonus level) |
| `!leaderboard` | `!lb`, `!bxh` | Top 10 level/money |
| `!transfer @user <tiền>` | `!pay`, `!chuyen` | Chuyển tiền |
| `!shop` | `!cua_hang` | Cửa hàng |
| `!buy <số>` | `!mua` | Mua vật phẩm |
| `!inventory` | `!inv`, `!tui` | Xem túi đồ |
| `!gamble <tiền>` | `!bet`, `!co_bac` | Slot machine (50% win, jackpot x3) |
| `!coinflip <tiền> <heads/tails>` | `!cf`, `!tung_xu` | Tung đồng xu |
| `!fish` | `!cau_ca` | Câu cá (30 phút cooldown) |
| `!crime` | `!trom` | Crime (2h cooldown, 40% thành công) |
| `!bank balance/deposit/withdraw` | `!ngan_hang` | Ngân hàng |
| `!mine` | `!dao` | Đào quặng (10 phút cooldown) |
| `!garden` | `!vuon` | Xem vườn (8×8 grid) |
| `!plant <ô>` | `!cay` | Xem thông tin cây trong ô |
| `!trongcay <ô> <cây>` | `!tc` | Trồng cây (tiêu hạt giống) |
| `!thu <ô\|all>` | `!harvest` | Thu hoạch |
| `!muadat` | `!land` | Mua thêm ô đất (50 triệu/ô) |
| `!taixiu new/lsp/cuoc` | `!tx` | Tài xỉu multiplayer (15s/phiên, react 🇹/🇽) |
| `$sell ore <tên> <số>` | — | Bán quặng |
| `!help` | `!h`, `!tro_giup` | Trợ giúp |

## Shop items (4 vật phẩm + 10 hạt giống)
- 🎣 Cần câu nâng cấp (1.2M) — fish +50%
- ⛏️ Cuốc kim cương (2.5M) — mine +1 quặng
- 🍀 Bùa may mắn (1.15M) — gamble +5% win
- 🎭 Mặt nạ (10.1M) — crime -20% bị bắt (thực tế +8%, từ 40%→48%)

## Garden plants (10 loại, seedPrice → sellPrice)
carrot 10k→15k (5p), strawberry 25k→40k (15p), cabbage 50k→85k (30p), tomato 100k→180k (1h), pumpkin 250k→450k (1h), watermelon 500k→900k (1h), grape 1M→1.8M (1h), pineapple 2.5M→4.5M (6h), mango 3M→9M (12h), diamond_tree 10M→20M (36h)

## Ore drop rates (mine.ts)
stone 56.5% (100₫), copper 25% (3.5k), iron 10% (10.5k), gold 5% (800k), diamond 2.5% (5M), emerald 1% (10.2M)
