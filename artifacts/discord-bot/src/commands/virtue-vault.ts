import { EmbedBuilder, Message } from "discord.js";
import {
  DbUser,
  depositToVirtueVault,
  getVirtueVaultBalance,
  updateMoney,
  updateVirtue,
  withdrawFromVirtueVault,
} from "../db.js";
import { fmt } from "../utils.js";

function parseAmount(arg: string | undefined): number | null {
  if (!arg) return null;
  const n = parseInt(arg.replace(/[.,_]/g, ""), 10);
  if (isNaN(n) || n <= 0) return null;
  return n;
}

export function getDepositVirtueGain(amount: number): number {
  return Math.floor(amount / 5_000_000);
}

export function getWithdrawalVirtuePenalty(amount: number): number {
  if (amount < 100_000) return 20;
  if (amount <= 1_000_000) return 50;
  return Number.POSITIVE_INFINITY;
}

export async function handleVirtueVault(
  _message: Message,
  args: string[],
  user: DbUser,
): Promise<EmbedBuilder> {
  const sub = args[0]?.toLowerCase();
  const amountArg = args[1];

  if (!sub) {
    const balance = await getVirtueVaultBalance();
    return new EmbedBuilder()
      .setColor("#8B5CF6")
      .setTitle("🏺 Hòm công đức")
      .setDescription("Tổng số tiền mọi người đã bỏ vào hòm chung.")
      .addFields(
        { name: "💰 Tổng tiền trong hòm", value: fmt(balance), inline: true },
        { name: "✨ Công đức hiện tại", value: `${user.virtue}`, inline: true },
      )
      .setFooter({ text: "!hcd botien <số tiền> | !hcd laytien <số tiền>" });
  }

  if (sub === "botien") {
    const amount = parseAmount(amountArg);
    if (amount === null) {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Thiếu số tiền")
        .setDescription("VD: `!hcd botien 5000000`");
    }
    if (amount > Number(user.money)) {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Không đủ tiền")
        .setDescription(`Bạn chỉ có **${fmt(Number(user.money))}**.`);
    }

    await updateMoney(user.discord_id, -amount);
    await depositToVirtueVault(amount);

    const virtueGain = getDepositVirtueGain(amount);
    let newVirtue = user.virtue;
    if (virtueGain > 0) {
      newVirtue = await updateVirtue(user.discord_id, virtueGain);
    }

    const balance = await getVirtueVaultBalance();
    return new EmbedBuilder()
      .setColor("#22C55E")
      .setTitle("🏺 Đã bỏ tiền vào hòm công đức")
      .addFields(
        { name: "💸 Số tiền bỏ", value: fmt(amount), inline: true },
        { name: "💰 Tổng trong hòm", value: fmt(balance), inline: true },
      )
      .setDescription(
        virtueGain > 0
          ? `Bạn nhận được **+${virtueGain} công đức**.`
          : "Số tiền bỏ chưa đủ để nhận thêm công đức.",
      );
  }

  if (sub === "laytien") {
    const amount = parseAmount(amountArg);
    if (amount === null) {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Thiếu số tiền")
        .setDescription("VD: `!hcd laytien 100000`.");
    }

    const balance = await getVirtueVaultBalance();
    if (amount > balance) {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Hòm không đủ tiền")
        .setDescription(`Hòm hiện có **${fmt(balance)}**.`);
    }

    const withdrew = await withdrawFromVirtueVault(amount);
    if (!withdrew) {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Không thể rút tiền")
        .setDescription("Hòm không đủ tiền để thực hiện giao dịch.");
    }

    await updateMoney(user.discord_id, amount);

    const penalty = getWithdrawalVirtuePenalty(amount);
    let newVirtue = user.virtue;
    if (penalty === Number.POSITIVE_INFINITY) {
      newVirtue = 0;
      await updateVirtue(user.discord_id, -user.virtue);
    } else if (penalty > 0) {
      newVirtue = await updateVirtue(user.discord_id, -penalty);
    }

    const updatedBalance = await getVirtueVaultBalance();
    return new EmbedBuilder()
      .setColor("#F59E0B")
      .setTitle("💸 Đã lấy tiền từ hòm công đức")
      .addFields(
        { name: "💳 Số tiền rút", value: fmt(amount), inline: true },
        { name: "💰 Còn lại trong hòm", value: fmt(updatedBalance), inline: true },
      )
      .setDescription(
        penalty === Number.POSITIVE_INFINITY
          ? "Bạn đã bị trừ hết công đức do số tiền rút quá lớn."
          : `Bạn bị trừ **${penalty} công đức**.`,
      );
  }

  return new EmbedBuilder()
    .setColor("#8B5CF6")
    .setTitle("🏺 Hòm công đức")
    .setDescription(
      "`!hcd` — Xem tổng tiền trong hòm\n" +
        "`!hcd botien <số tiền>` — Bỏ tiền vào hòm\n" +
        "`!hcd laytien <số tiền>` — Rút tiền từ hòm",
    );
}
