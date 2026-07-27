import { EmbedBuilder, Message } from "discord.js";
import { DbUser, getUserAchievements, equipAchievement, checkAndGrant } from "../db.js";

export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  description: string;
  badge: string; // hiển thị trong profile
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "mining_king",   name: "Vua Đào Mỏ",           emoji: "⛏️", description: "Đào quặng 50 lần",                    badge: "[⛏️ Vua Đào Mỏ]"        },
  { id: "angel",         name: "Thiên Thần",             emoji: "😇", description: "Công đức đạt 200 điểm",               badge: "[😇 Thiên Thần]"         },
  { id: "demon",         name: "Ác Quỷ",                 emoji: "😈", description: "Công đức về 0",                       badge: "[😈 Ác Quỷ]"             },
  { id: "sea_god",       name: "Thần Biển",              emoji: "🌊", description: "Câu cá 50 lần",                       badge: "[🌊 Thần Biển]"          },
  { id: "foulmouth",     name: "Mỏ Hỗn",                emoji: "🤬", description: "Nói tục 20 lần",                      badge: "[🤬 Mỏ Hỗn]"            },
  { id: "millionaire",   name: "Triệu Phú",              emoji: "💰", description: "Có 10,000,000₫ trong ví",             badge: "[💰 Triệu Phú]"         },
  { id: "crime_lord",    name: "Trùm Tội Phạm",          emoji: "🔫", description: "Crime thành công 20 lần",             badge: "[🔫 Trùm Tội Phạm]"     },
  { id: "farmer",        name: "Nông Dân Chăm Chỉ",      emoji: "🌾", description: "Thu hoạch 100 lần",                   badge: "[🌾 Nông Dân]"           },
  { id: "monk",          name: "Đại Thiền Sư",           emoji: "🧘", description: "Thiền tổng cộng 60 phút",             badge: "[🧘 Thiền Sư]"           },
  { id: "legend",        name: "Huyền Thoại",            emoji: "⭐", description: "Đạt cấp 50",                         badge: "[⭐ Huyền Thoại]"        },
  { id: "fishmaster",    name: "Thống Soái Đại Dương",   emoji: "🐋", description: "Câu được Cá Mặt Trăng 1 lần",        badge: "[🐋 Thống Soái ĐD]"     },
  { id: "banker",        name: "Nhà Tư Bản",             emoji: "🏦", description: "Có 100,000,000₫ trong ngân hàng",     badge: "[🏦 Tư Bản]"            },
];

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

// ── !achi view ───────────────────────────────────────────────────────────────
export async function handleAchi(message: Message, args: string[], user: DbUser): Promise<EmbedBuilder> {
  const sub = args[0]?.toLowerCase();

  if (sub === "equip") {
    const id = args[1]?.toLowerCase();
    if (!id) {
      return new EmbedBuilder()
        .setColor("#FF4444").setTitle("❌ Sai cú pháp")
        .setDescription("Dùng: `!achi equip <id>` hoặc `!achi equip remove`");
    }

    if (id === "remove" || id === "none") {
      await equipAchievement(user.discord_id, null);
      return new EmbedBuilder().setColor("#00FF88").setTitle("✅ Đã gỡ thành tựu khỏi profile.");
    }

    const earned = await getUserAchievements(user.discord_id);
    if (!earned.includes(id)) {
      return new EmbedBuilder().setColor("#FF4444").setTitle("❌ Chưa đạt thành tựu này.")
        .setDescription(`Bạn chưa có \`${id}\`. Dùng \`!achi view\` để xem danh sách.`);
    }
    const achi = getAchievement(id);
    if (!achi) return new EmbedBuilder().setColor("#FF4444").setTitle("❌ ID không hợp lệ.");

    await equipAchievement(user.discord_id, id);
    return new EmbedBuilder()
      .setColor("#00FF88")
      .setTitle(`${achi.emoji} Đã trang bị thành tựu: ${achi.name}`)
      .setDescription(`Hiển thị trong profile của bạn: **${achi.badge}**`);
  }

  // Mặc định: view
  const earned = await getUserAchievements(user.discord_id);

  const lines = ACHIEVEMENTS.map((a) => {
    const have = earned.includes(a.id);
    const equipped = user.equipped_achievement === a.id ? " ← đang trang bị" : "";
    const status = have ? `✅ \`${a.id}\`` : "🔒";
    return `${status} ${a.emoji} **${a.name}**${equipped}\n┗ ${a.description}`;
  });

  return new EmbedBuilder()
    .setColor("#FFD700")
    .setTitle(`🏆 Thành tựu — ${user.username} (${earned.length}/${ACHIEVEMENTS.length})`)
    .setDescription(lines.join("\n\n"))
    .setFooter({ text: "!achi equip <id> để trang bị • !achi equip remove để gỡ" });
}
