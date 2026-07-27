import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Message,
  Partials,
} from "discord.js";
import {
  initDb,
  getOrCreateUser,
  addExp,
  checkCooldown,
  setCooldown,
  updateVirtue,
  incrementStat,
  DbUser,
} from "./db.js";
import { handleProfile } from "./commands/profile.js";
import { handleDaily } from "./commands/daily.js";
import { handleLeaderboard } from "./commands/leaderboard.js";
import { handleTransfer } from "./commands/transfer.js";
import { handleShop, handleBuy } from "./commands/shop.js";
import { handleInventory } from "./commands/inventory.js";
import { handleGamble, handleCoinflip } from "./commands/gamble.js";
import { handleFish } from "./commands/fish.js";
import { handleCrime } from "./commands/crime.js";
import { handleBank } from "./commands/bank.js";
import { handleMine } from "./commands/mine.js";
import { handleSell } from "./commands/sell.js";
import { handleHelp } from "./commands/help.js";
import { handleThien } from "./commands/meditation.js";
import {
  handleAdminLevelSet,
  handleAdminLevelAdd,
  handleAdminSetMoney,
} from "./commands/admin.js";
import {
  handleGarden,
  handlePlantInfo,
  handleTrongCay,
  handleThu,
  handleMuaDat,
} from "./commands/garden.js";
import { handleTaixiu } from "./commands/taixiu.js";
import { handleStock } from "./commands/stock.js";
import { handleVirtueVault } from "./commands/virtue-vault.js";
import { containsBadWord } from "./badwords.js";

if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error("DISCORD_BOT_TOKEN must be set");
}

const PREFIX = "!";
const SELL_PREFIX = "$";
const CHAT_EXP_COOLDOWN = 60 * 1000; // 1 minute

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once("clientReady", () => {
  console.log(`✅ Bot online: ${client.user!.tag}`);
  client.user!.setActivity("!help | RPG Economy", { type: 0 });
});

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const authorId = message.author.id;
  const username = message.author.username;
  const content = message.content.trim();

  const user = await getOrCreateUser(authorId, username);
  const commandName = content.startsWith(PREFIX)
    ? content.slice(PREFIX.length).trim().split(/\s+/)[0]?.toLowerCase()
    : null;
  const isThienCommand = commandName === "thien";

  if (user.meditating && !isThienCommand) {
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#FF4444")
          .setTitle("🧘 Đang thiền")
          .setDescription(
            "Bạn đang thiền và không thể dùng lệnh khác.\n" +
              "Dùng `!thien stop` để dừng thiền.",
          ),
      ],
    });
    return;
  }

  if (containsBadWord(content)) {
    const newVirtue = await updateVirtue(authorId, -1);
    await incrementStat(authorId, "profanityCount", 1);
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#FF4444")
          .setTitle("❌ Không dùng lời tục")
          .setDescription(
            `Bạn vừa mất **1 công đức**.\nCông đức hiện tại: **${newVirtue}**`,
          ),
      ],
    });
    return;
  }

  // ── Auto EXP from chat ───────────────────────────────────────────────────
  if (!content.startsWith(PREFIX) && !content.startsWith(SELL_PREFIX)) {
    const remaining = await checkCooldown(
      authorId,
      "chat_exp",
      CHAT_EXP_COOLDOWN,
    );
    if (remaining === null) {
      const exp = Math.floor(Math.random() * 5) + 1;
      const { leveled, newLevel } = await addExp(authorId, exp);
      await setCooldown(authorId, "chat_exp");
      if (leveled) {
        if (!message.channel || !("send" in message.channel)) return;
        await message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor("#FFD700")
              .setTitle("🎉 Lên cấp!")
              .setDescription(
                `<@${authorId}> đã lên **Cấp ${newLevel}**! 🎊 Chúc mừng!`,
              ),
          ],
        });
      }
    }
    return;
  }

  // ── $sell command ────────────────────────────────────────────────────────
  if (content.startsWith(SELL_PREFIX)) {
    const parts = content.slice(SELL_PREFIX.length).trim().split(/\s+/);
    if (parts[0]?.toLowerCase() !== "sell") return;

    const user = await getOrCreateUser(authorId, username);
    let embed: EmbedBuilder;
    try {
      embed = await handleSell(message, parts.slice(1), user);
    } catch (err) {
      console.error("[sell]", err);
      embed = new EmbedBuilder()
        .setColor("#FF4444")
        .setTitle("❌ Lỗi nội bộ")
        .setDescription("Có lỗi xảy ra. Thử lại sau.");
    }
    await message.reply({ embeds: [embed] });
    return;
  }

  // ── ! prefix commands ─────────────────────────────────────────────────────
  if (!content.startsWith(PREFIX)) return;

  const parts = content.slice(PREFIX.length).trim().split(/\s+/);
  const command = parts[0]?.toLowerCase() ?? "";
  const args = parts.slice(1);

  // Commands that don't need user record first
  if (!command) return;

  let embed: EmbedBuilder | null = null;

  try {
    switch (command) {
      case "profile":
      case "p":
      case "ho_so":
        embed = await handleProfile(message, args, user);
        break;

      case "daily":
      case "dinh_ky":
        embed = await handleDaily(message, user);
        break;

      case "leaderboard":
      case "lb":
      case "bxh":
        embed = await handleLeaderboard(message, args);
        break;

      case "transfer":
      case "pay":
      case "chuyen":
        embed = await handleTransfer(message, args, user);
        break;

      case "shop":
      case "cua_hang":
        embed = await handleShop(message);
        break;

      case "buy":
      case "mua":
        embed = await handleBuy(message, args, user);
        break;

      case "inventory":
      case "inv":
      case "tui":
        embed = await handleInventory(message, user);
        break;

      case "gamble":
      case "bet":
      case "co_bac":
        embed = await handleGamble(message, args, user);
        break;

      case "coinflip":
      case "cf":
      case "tung_xu":
        embed = await handleCoinflip(message, args, user);
        break;

      case "fish":
      case "cau_ca":
        embed = await handleFish(message, user);
        break;

      case "crime":
      case "trom":
        embed = await handleCrime(message, user);
        break;

      case "bank":
      case "ngan_hang":
        embed = await handleBank(message, args, user);
        break;

      case "mine":
      case "dao":
        embed = await handleMine(message, user);
        break;

      // ── Vườn cây ─────────────────────────────────────────────────────────
      case "garden":
      case "vuon":
        embed = await handleGarden(message, user);
        break;

      case "plant":
      case "cay":
        embed = await handlePlantInfo(message, args, user);
        break;

      case "trongcay":
      case "tc":
        embed = await handleTrongCay(message, args, user);
        break;

      case "thu":
      case "harvest":
        embed = await handleThu(message, args, user);
        break;

      case "muadat":
      case "land":
        embed = await handleMuaDat(message, user);
        break;

      // ── Tài Xỉu ──────────────────────────────────────────────────────────
      case "taixiu":
      case "tx":
        embed = await handleTaixiu(message, args, user);
        break;

      case "thien":
        embed = await handleThien(message, args, user);
        break;

      case "ck":
        embed = await handleStock(message, args, user);
        break;

      case "hcd":
        embed = await handleVirtueVault(message, args, user);
        break;

      case "help":
      case "h":
      case "tro_giup":
        embed = await handleHelp(message);
        break;

      // ── Admin commands ────────────────────────────────────────────────────
      case "level":
        if (args[0]?.toLowerCase() === "set") {
          embed = await handleAdminLevelSet(message, args.slice(1));
        } else if (args[0]?.toLowerCase() === "add") {
          embed = await handleAdminLevelAdd(message, args.slice(1));
        }
        break;

      case "tien":
        embed = await handleAdminSetMoney(message, args);
        break;

      default:
        return; // Unknown command — silently ignore
    }
  } catch (err) {
    console.error(`[${command}]`, err);
    embed = new EmbedBuilder()
      .setColor("#FF4444")
      .setTitle("❌ Lỗi nội bộ")
      .setDescription("Có lỗi xảy ra. Vui lòng thử lại sau.");
  }

  if (embed) {
    await message.reply({ embeds: [embed] });
  }
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  client.destroy();
  process.exit(0);
});

// Initialize DB then login
await initDb();
console.log("Logging in to Discord...");
await client.login(process.env.DISCORD_BOT_TOKEN);
