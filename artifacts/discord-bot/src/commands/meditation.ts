import { EmbedBuilder, Message } from "discord.js";
import { DbUser, startMeditation, stopMeditation, checkAndGrant } from "../db.js";
import { fmtTime } from "../utils.js";

export async function handleThien(message: Message, args: string[], user: DbUser): Promise<EmbedBuilder> {
  const sub = args[0]?.toLowerCase();
  const isMeditating = user.meditating ?? false;

  if (sub === "start" || sub === "bat_dau") {
    if (isMeditating) {
      return new EmbedBuilder()
        .setColor("#FF4444").setTitle("🧘 Đang thiền rồi!")
        .setDescription("Bạn đang trong trạng thái thiền. Dùng `!thien stop` để dừng.");
    }

    const ok = await startMeditation(user.discord_id);
    if (!ok) {
      return new EmbedBuilder()
        .setColor("#FF4444").setTitle("🧘 Đang thiền rồi!")
        .setDescription("Dùng `!thien stop` để dừng thiền trước.");
    }

    return new EmbedBuilder()
      .setColor("#9B59B6")
      .setTitle("🧘 Bắt đầu thiền định...")
      .setDescription(
        "Bạn ngồi xuống, nhắm mắt và hít thở sâu...\n\n" +
        "• Mỗi **15 phút** thiền = **+1 công đức**\n" +
        "• Dùng `!thien stop` để dừng và xem kết quả",
      )
      .setFooter({ text: "Không làm được bất cứ lệnh nào khi đang thiền!" });
  }

  if (sub === "stop" || sub === "dung") {
    if (!isMeditating) {
      return new EmbedBuilder()
        .setColor("#FF4444").setTitle("❌ Chưa thiền")
        .setDescription("Bạn chưa bắt đầu thiền. Dùng `!thien start`.");
    }

    const result = await stopMeditation(user.discord_id);

    if (!result) {
      return new EmbedBuilder().setColor("#888888").setTitle("🧘 Đã dừng thiền.");
    }

    const { minutesMeditated, virtueGranted, newVirtue } = result;

    // Kiểm tra thành tựu monk (60 phút tổng cộng)
    const totalMinutes = (user.meditation_minutes ?? 0) + minutesMeditated;
    const earnedMonk = await checkAndGrant(user.discord_id, "monk", totalMinutes >= 60);

    // Kiểm tra thành tựu thiên thần / ác quỷ
    const earnedAngel = await checkAndGrant(user.discord_id, "angel", newVirtue >= 200);
    const earnedDemon = await checkAndGrant(user.discord_id, "demon", newVirtue <= 0);

    const embed = new EmbedBuilder()
      .setColor("#9B59B6")
      .setTitle("🧘 Thiền xong!")
      .addFields(
        { name: "⏱️ Thời gian thiền",  value: `${minutesMeditated} phút`,   inline: true },
        { name: "✨ Công đức nhận được", value: `+${virtueGranted}`,           inline: true },
        { name: "💫 Công đức hiện tại",  value: `${newVirtue}`,            inline: true },
      );

    if (earnedMonk)  embed.addFields({ name: "🏆 Thành tựu mới!", value: "🧘 **Đại Thiền Sư** — Thiền đủ 60 phút!" });
    if (earnedAngel) embed.addFields({ name: "🏆 Thành tựu mới!", value: "😇 **Thiên Thần** — Công đức đạt 200!" });
    if (earnedDemon) embed.addFields({ name: "🏆 Thành tựu mới!", value: "😈 **Ác Quỷ** — Công đức về 0!" });

    return embed;
  }

  return new EmbedBuilder()
    .setColor("#9B59B6")
    .setTitle("🧘 Lệnh thiền")
    .setDescription(
      "`!thien start` — Bắt đầu thiền (+1 công đức/10 phút)\n" +
      "`!thien stop` — Dừng thiền và nhận kết quả",
    );
}
