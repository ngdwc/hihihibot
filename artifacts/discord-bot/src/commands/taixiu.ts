import { EmbedBuilder, Message, ReactionCollector } from "discord.js";
import {
  DbUser,
  getOrCreateUser,
  updateMoney,
  getTaixiuBetAmount,
  setTaixiuBetAmount,
  saveTaixiuSession,
  getRecentTaixiuSessions,
} from "../db.js";
import { fmt } from "../utils.js";

const SESSION_DURATION_MS = 15_000;
const EMOJI_TAI = "🇹";
const EMOJI_XIU = "🇽";
const SLOT_EMPTY = "*️⃣";
const NUMBER_EMOJI = [
  "0️⃣",
  "1️⃣",
  "2️⃣",
  "3️⃣",
  "4️⃣",
  "5️⃣",
  "6️⃣",
  "7️⃣",
  "8️⃣",
  "9️⃣",
];
const REVEAL_DELAY_MS = 700;

type Side = "tai" | "xiu";
interface ActiveBet {
  side: Side;
  amount: number;
}

// Chỉ 1 phiên được chạy tại 1 thời điểm (toàn bộ bot).
let activeSession: {
  message: Message;
  bets: Map<string, ActiveBet>;
  collector: ReactionCollector;
} | null = null;

function errorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor("#FF4444")
    .setTitle(title)
    .setDescription(description);
}

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slotRow(revealed: (number | null)[]): string {
  return revealed
    .map((d) => (d === null ? SLOT_EMPTY : NUMBER_EMOJI[d]))
    .join("  ");
}

function buildLiveEmbed(
  secondsLeft: number,
  playerCount: number,
  revealed: (number | null)[],
): EmbedBuilder {
  const barFilled = Math.round(
    (secondsLeft / (SESSION_DURATION_MS / 1000)) * 10,
  );
  const bar =
    "▰".repeat(Math.max(0, barFilled)) +
    "▱".repeat(Math.max(0, 10 - barFilled));

  return new EmbedBuilder()
    .setColor("#FFD700")
    .setTitle("🎲 Tài Xỉu — Đang mở cược!")
    .setDescription(
      `Bấm ${EMOJI_TAI} để cược **Tài** (11-17)  •  Bấm ${EMOJI_XIU} để cược **Xỉu** (4-10)\n\n` +
        `${slotRow(revealed)}`,
    )
    .addFields(
      {
        name: "⏳ Thời gian",
        value: `\`${bar}\` **${secondsLeft}s**`,
        inline: false,
      },
      { name: "👥 Người chơi", value: `${playerCount}`, inline: true },
    )
    .setFooter({
      text: "Dùng !taixiu cuoc <số tiền> để đổi mức cược mặc định",
    });
}

function buildRevealEmbed(
  revealed: (number | null)[],
  playerCount: number,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🎲 Tài Xỉu — Đang mở kết quả...")
    .setDescription(`${slotRow(revealed)}`)
    .addFields({
      name: "👥 Người chơi",
      value: `${playerCount}`,
      inline: true,
    });
}

// ─────────────────────────────────────────────────────────────────────────
// !taixiu new — tạo phiên mới (15s), react 🇹/🇽 để cược
// ─────────────────────────────────────────────────────────────────────────
async function handleTaixiuNew(message: Message): Promise<EmbedBuilder | null> {
  if (activeSession) {
    return errorEmbed(
      "❌ Đang có phiên chạy",
      "Đợi phiên hiện tại kết thúc rồi tạo phiên mới nhé.",
    );
  }

  const bets = new Map<string, ActiveBet>();
  const revealed: (number | null)[] = [null, null, null];
  const startedAt = Date.now();

  const gameMessage = await message.channel.send({
    embeds: [
      buildLiveEmbed(Math.ceil(SESSION_DURATION_MS / 1000), 0, revealed),
    ],
  });
  await gameMessage.react(EMOJI_TAI);
  await gameMessage.react(EMOJI_XIU);

  const countdownInterval = setInterval(async () => {
    const secondsLeft = Math.max(
      0,
      Math.ceil((SESSION_DURATION_MS - (Date.now() - startedAt)) / 1000),
    );
    try {
      await gameMessage.edit({
        embeds: [buildLiveEmbed(secondsLeft, bets.size, revealed)],
      });
    } catch (err) {
      console.error("[taixiu:countdown]", err);
    }
  }, 1000);

  const collector = gameMessage.createReactionCollector({
    filter: (reaction) =>
      reaction.emoji.name === EMOJI_TAI || reaction.emoji.name === EMOJI_XIU,
    time: SESSION_DURATION_MS,
    dispose: true,
  });

  activeSession = { message: gameMessage, bets, collector };

  collector.on("collect", async (reaction, reactUser) => {
    try {
      if (reactUser.bot) return;
      const side: Side = reaction.emoji.name === EMOJI_TAI ? "tai" : "xiu";

      // Đã cược bên kia rồi → gỡ reaction thừa, không cho cược 2 bên cùng lúc.
      if (bets.has(reactUser.id)) {
        await reaction.users.remove(reactUser.id).catch(() => {});
        return;
      }

      const dbUser = await getOrCreateUser(reactUser.id, reactUser.username);
      const amount = await getTaixiuBetAmount(reactUser.id);

      if (dbUser.money < amount) {
        await reaction.users.remove(reactUser.id).catch(() => {});
        return;
      }

      await updateMoney(reactUser.id, -amount);
      bets.set(reactUser.id, { side, amount });
    } catch (err) {
      console.error("[taixiu:collect]", err);
    }
  });

  collector.on("remove", async (reaction, reactUser) => {
    try {
      if (reactUser.bot) return;
      const bet = bets.get(reactUser.id);
      if (!bet) return;
      const side: Side = reaction.emoji.name === EMOJI_TAI ? "tai" : "xiu";
      if (bet.side !== side) return;

      await updateMoney(reactUser.id, bet.amount);
      bets.delete(reactUser.id);
    } catch (err) {
      console.error("[taixiu:remove]", err);
    }
  });

  collector.on("end", async () => {
    clearInterval(countdownInterval);
    try {
      await resolveSession(gameMessage, bets);
    } catch (err) {
      console.error("[taixiu:end]", err);
    } finally {
      activeSession = null;
    }
  });

  return null; // gameMessage đã được gửi thủ công, không cần index.ts reply lại
}

async function resolveSession(
  gameMessage: Message,
  bets: Map<string, ActiveBet>,
): Promise<void> {
  const dice = [rollDie(), rollDie(), rollDie()];
  const revealed: (number | null)[] = [null, null, null];

  // Mở lần lượt từng ô *️⃣ → số, tạo hiệu ứng quay số.
  for (let i = 0; i < dice.length; i++) {
    await sleep(REVEAL_DELAY_MS);
    revealed[i] = dice[i];
    await gameMessage
      .edit({ embeds: [buildRevealEmbed(revealed, bets.size)] })
      .catch(() => {});
  }

  const total = dice[0] + dice[1] + dice[2];
  const result: Side = total >= 11 ? "tai" : "xiu";

  const winnerLines: string[] = [];
  let totalWagered = 0;

  for (const [discordId, bet] of bets) {
    totalWagered += bet.amount;
    if (bet.side === result) {
      const payout = bet.amount * 2;
      await updateMoney(discordId, payout);
      winnerLines.push(`<@${discordId}> +${fmt(payout)}`);
    }
  }

  await saveTaixiuSession(dice, total, result, bets.size, totalWagered);

  await sleep(400);

  const resultText = result === "tai" ? "TÀI" : "XỈU";
  const embed = new EmbedBuilder()
    .setColor(result === "tai" ? "#00FF88" : "#FF4444")
    .setTitle(`🎲 ${slotRow(dice)}  →  Tổng ${total}  →  ${resultText}`)
    .setDescription(
      winnerLines.length > 0
        ? `**🏆 Người thắng**\n${winnerLines.join("\n")}`
        : "_Không có ai thắng phiên này._",
    )
    .addFields(
      { name: "👥 Người chơi", value: `${bets.size}`, inline: true },
      { name: "💰 Tổng cược", value: fmt(totalWagered), inline: true },
    )
    .setFooter({ text: "Dùng !taixiu new để chơi tiếp" });

  await gameMessage.edit({ embeds: [embed] }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────
// !taixiu lsp — xem 5 phiên gần nhất
// ─────────────────────────────────────────────────────────────────────────
async function handleTaixiuLsp(): Promise<EmbedBuilder> {
  const sessions = await getRecentTaixiuSessions(5);
  if (sessions.length === 0) {
    return errorEmbed(
      "📜 Chưa có phiên nào",
      "Dùng `!taixiu new` để tạo phiên đầu tiên.",
    );
  }

  const lines = sessions.map((s) => {
    const time = s.created_at.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
    const resultText = s.result === "tai" ? "TÀI" : "XỈU";
    return `\`${time}\` ${slotRow(s.dice)} = **${s.total}** → **${resultText}** (${s.bet_count} cược, ${fmt(s.total_wagered)})`;
  });

  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("📜 5 phiên Tài Xỉu gần nhất")
    .setDescription(lines.join("\n"));
}

// ─────────────────────────────────────────────────────────────────────────
// !taixiu cuoc <sotien> — đặt mức cược mặc định
// ─────────────────────────────────────────────────────────────────────────
async function handleTaixiuCuoc(
  args: string[],
  user: DbUser,
): Promise<EmbedBuilder> {
  const amount = Number(args[0]);
  if (!amount || amount <= 0 || !Number.isInteger(amount)) {
    return errorEmbed(
      "❌ Sai cú pháp",
      "Dùng: `!taixiu cuoc <số tiền>`\nVD: `!taixiu cuoc 50000`",
    );
  }

  await setTaixiuBetAmount(user.discord_id, amount);

  return new EmbedBuilder()
    .setColor("#00FF88")
    .setTitle("✅ Đã đặt mức cược mặc định")
    .setDescription(
      `Từ giờ khi bấm ${EMOJI_TAI}/${EMOJI_XIU} bạn sẽ tự động cược **${fmt(amount)}** mỗi phiên, cho tới khi bạn đổi lại bằng lệnh này.`,
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Router chính cho !taixiu
// ─────────────────────────────────────────────────────────────────────────
export async function handleTaixiu(
  message: Message,
  args: string[],
  user: DbUser,
): Promise<EmbedBuilder | null> {
  const sub = args[0]?.toLowerCase();

  switch (sub) {
    case "new":
      return handleTaixiuNew(message);
    case "lsp":
      return handleTaixiuLsp();
    case "cuoc":
      return handleTaixiuCuoc(args.slice(1), user);
    default:
      return errorEmbed(
        "❌ Sai cú pháp",
        [
          "`!taixiu new` — tạo phiên mới (15 giây)",
          "`!taixiu lsp` — xem 5 phiên gần nhất",
          "`!taixiu cuoc <số tiền>` — đặt mức cược mặc định",
        ].join("\n"),
      );
  }
}
