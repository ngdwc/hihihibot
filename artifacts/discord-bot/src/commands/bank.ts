import { EmbedBuilder, Message } from "discord.js";
import {
  DbUser,
  getOrCreateBank,
  updateMoney,
  updateBank,
  applyBankInterest,
} from "../db.js";
import { fmt } from "../utils.js";

const MIN_AMOUNT = 1_000;

export async function handleBank(
  message: Message,
  args: string[],
  user: DbUser,
): Promise<EmbedBuilder> {
  const sub = args[0]?.toLowerCase() ?? "balance";

  // Apply interest on every bank interaction
  const interest = await applyBankInterest(user.discord_id);
  const bank = await getOrCreateBank(user.discord_id);

  if (sub === "balance" || sub === "bal" || sub === "so_du") {
    const embed = new EmbedBuilder()
      .setColor("#1DA1F2")
      .setTitle("🏦 Ngân hàng")
      .addFields(
        { name: "💳 Số dư TK", value: fmt(Number(bank.balance)), inline: true },
        { name: "💰 Ví tiền", value: fmt(Number(user.money)), inline: true },
        {
          name: "💎 Tổng tài sản",
          value: fmt(Number(user.money) + Number(bank.balance)),
          inline: false,
        },
      )
      .setFooter({
        text: "Lãi suất 2.5%/ngày • !bank deposit <số tiền> • !bank withdraw <số tiền>",
      });

    if (interest > 0) {
      embed.setDescription(`💹 Nhận lãi suất: **+${fmt(interest)}**`);
    }
    return embed;
  }

  if (sub === "deposit" || sub === "dep" || sub === "gui") {
    const amountStr = args[1]?.replace(/[.,_]/g, "") ?? "";
    const amount =
      amountStr === "all" ? Number(user.money) : parseInt(amountStr, 10);

    if (isNaN(amount) || amount < MIN_AMOUNT) {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Lỗi")
        .setDescription(
          `Số tiền tối thiểu là **${fmt(MIN_AMOUNT)}**. VD: \`!bank deposit 100000\``,
        );
    }
    if (Number(user.money) < amount) {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Không đủ tiền")
        .setDescription(`Bạn chỉ có **${fmt(Number(user.money))}** trong ví.`);
    }

    await updateMoney(user.discord_id, -amount);
    await updateBank(user.discord_id, amount);

    return new EmbedBuilder()
      .setColor("#00FF88")
      .setTitle("🏦 Gửi tiền thành công!")
      .addFields(
        { name: "📥 Đã gửi", value: fmt(amount), inline: true },
        {
          name: "💳 Số dư TK",
          value: fmt(Number(bank.balance) + amount),
          inline: true,
        },
      );
  }

  if (sub === "withdraw" || sub === "with" || sub === "rut") {
    const amountStr = args[1]?.replace(/[.,_]/g, "") ?? "";
    const amount =
      amountStr === "all" ? Number(bank.balance) : parseInt(amountStr, 10);

    if (isNaN(amount) || amount < MIN_AMOUNT) {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Lỗi")
        .setDescription(
          `Số tiền tối thiểu là **${fmt(MIN_AMOUNT)}**. VD: \`!bank withdraw 100000\``,
        );
    }
    if (Number(bank.balance) < amount) {
      return new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Không đủ tiền")
        .setDescription(
          `Tài khoản ngân hàng chỉ có **${fmt(Number(bank.balance))}**.`,
        );
    }

    await updateBank(user.discord_id, -amount);
    await updateMoney(user.discord_id, amount);

    return new EmbedBuilder()
      .setColor("#00FF88")
      .setTitle("🏦 Rút tiền thành công!")
      .addFields(
        { name: "📤 Đã rút", value: fmt(amount), inline: true },
        {
          name: "💰 Ví tiền",
          value: fmt(Number(user.money) + amount),
          inline: true,
        },
      );
  }

  return new EmbedBuilder()
    .setColor("#FF4444")
    .setTitle("❌ Lệnh không hợp lệ")
    .setDescription(
      "Dùng: `!bank balance` | `!bank deposit <tiền>` | `!bank withdraw <tiền>`",
    );
}
