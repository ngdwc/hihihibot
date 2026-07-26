import { Client, GatewayIntentBits, EmbedBuilder, Message } from 'discord.js';
import { initDb, getOrCreateUser, addExp, checkCooldown, setCooldown, DbUser } from './db.js';
import { handleProfile } from './commands/profile.js';
import { handleDaily } from './commands/daily.js';
import { handleLeaderboard } from './commands/leaderboard.js';
import { handleTransfer } from './commands/transfer.js';
import { handleShop, handleBuy } from './commands/shop.js';
import { handleInventory } from './commands/inventory.js';
import { handleGamble, handleCoinflip } from './commands/gamble.js';
import { handleFish } from './commands/fish.js';
import { handleCrime } from './commands/crime.js';
import { handleBank } from './commands/bank.js';
import { handleMine } from './commands/mine.js';
import { handleSell } from './commands/sell.js';
import { handleHelp } from './commands/help.js';

if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error('DISCORD_BOT_TOKEN must be set');
}

const PREFIX = '!';
const SELL_PREFIX = '$';
const CHAT_EXP_COOLDOWN = 60 * 1000; // 1 minute

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`✅ Bot online: ${client.user!.tag}`);
  client.user!.setActivity('!help | RPG Economy', { type: 0 });
});

client.on('messageCreate', async (message: Message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const authorId = message.author.id;
  const username = message.author.username;
  const content = message.content.trim();

  // ── Auto EXP from chat ───────────────────────────────────────────────────
  if (!content.startsWith(PREFIX) && !content.startsWith(SELL_PREFIX)) {
    const remaining = await checkCooldown(authorId, 'chat_exp', CHAT_EXP_COOLDOWN);
    if (remaining === null) {
      await getOrCreateUser(authorId, username);
      const exp = Math.floor(Math.random() * 5) + 1;
      const { leveled, newLevel } = await addExp(authorId, exp);
      await setCooldown(authorId, 'chat_exp');
      if (leveled) {
        await message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFD700')
              .setTitle('🎉 Lên cấp!')
              .setDescription(`<@${authorId}> đã lên **Cấp ${newLevel}**! 🎊 Chúc mừng!`),
          ],
        });
      }
    }
    return;
  }

  // ── $sell command ────────────────────────────────────────────────────────
  if (content.startsWith(SELL_PREFIX)) {
    const parts = content.slice(SELL_PREFIX.length).trim().split(/\s+/);
    if (parts[0]?.toLowerCase() !== 'sell') return;

    const user = await getOrCreateUser(authorId, username);
    let embed: EmbedBuilder;
    try {
      embed = await handleSell(message, parts.slice(1), user);
    } catch (err) {
      console.error('[sell]', err);
      embed = new EmbedBuilder().setColor('#FF4444').setTitle('❌ Lỗi nội bộ').setDescription('Có lỗi xảy ra. Thử lại sau.');
    }
    await message.reply({ embeds: [embed] });
    return;
  }

  // ── ! prefix commands ─────────────────────────────────────────────────────
  if (!content.startsWith(PREFIX)) return;

  const parts = content.slice(PREFIX.length).trim().split(/\s+/);
  const command = parts[0]?.toLowerCase() ?? '';
  const args = parts.slice(1);

  // Commands that don't need user record first
  if (!command) return;

  let embed: EmbedBuilder | null = null;

  try {
    // Fetch/create user for commands that need it
    const user: DbUser = await getOrCreateUser(authorId, username);

    switch (command) {
      case 'profile':
      case 'p':
      case 'ho_so':
        embed = await handleProfile(message, args, user);
        break;

      case 'daily':
      case 'dinh_ky':
        embed = await handleDaily(message, user);
        break;

      case 'leaderboard':
      case 'lb':
      case 'bxh':
        embed = await handleLeaderboard(message, args);
        break;

      case 'transfer':
      case 'pay':
      case 'chuyen':
        embed = await handleTransfer(message, args, user);
        break;

      case 'shop':
      case 'cua_hang':
        embed = await handleShop(message);
        break;

      case 'buy':
      case 'mua':
        embed = await handleBuy(message, args, user);
        break;

      case 'inventory':
      case 'inv':
      case 'tui':
        embed = await handleInventory(message, user);
        break;

      case 'gamble':
      case 'bet':
      case 'co_bac':
        embed = await handleGamble(message, args, user);
        break;

      case 'coinflip':
      case 'cf':
      case 'tung_xu':
        embed = await handleCoinflip(message, args, user);
        break;

      case 'fish':
      case 'cau_ca':
        embed = await handleFish(message, user);
        break;

      case 'crime':
      case 'trom':
        embed = await handleCrime(message, user);
        break;

      case 'bank':
      case 'ngan_hang':
        embed = await handleBank(message, args, user);
        break;

      case 'mine':
      case 'dao':
        embed = await handleMine(message, user);
        break;

      case 'help':
      case 'h':
      case 'tro_giup':
        embed = await handleHelp(message);
        break;

      default:
        return; // Unknown command — silently ignore
    }
  } catch (err) {
    console.error(`[${command}]`, err);
    embed = new EmbedBuilder()
      .setColor('#FF4444')
      .setTitle('❌ Lỗi nội bộ')
      .setDescription('Có lỗi xảy ra. Vui lòng thử lại sau.');
  }

  if (embed) {
    await message.reply({ embeds: [embed] });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  client.destroy();
  process.exit(0);
});

// Initialize DB then login
await initDb();
console.log('Logging in to Discord...');
await client.login(process.env.DISCORD_BOT_TOKEN);
