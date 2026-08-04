import { EmbedBuilder, Message } from "discord.js";

interface LoveApiResponse {
  ok: boolean;
  slug: string;
  country: string;
  inputs: {
    name1: string;
    name2: string;
  };
  results: {
    score: number;
    message: string;
  };
}

const API_ENDPOINT = "https://calculator.free/api/v1/love/";

interface ParsedNames {
  display1: string;
  display2: string;
  api1: string;
  api2: string;
}

function parseNames(message: Message, args: string[]): ParsedNames | null {
  // ===== Ưu tiên mention =====
  const users = [...message.mentions.users.values()];

  if (users.length >= 2) {
    const display1 =
      message.guild?.members.cache.get(users[0].id)?.displayName ??
      users[0].username;

    const display2 =
      message.guild?.members.cache.get(users[1].id)?.displayName ??
      users[1].username;

    return {
      display1,
      display2,
      api1: display1.replace(/\s+/g, ""),
      api2: display2.replace(/\s+/g, ""),
    };
  }

  // ===== "Tên 1" "Tên 2" =====
  const input = args.join(" ");
  const quoted = [...input.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

  if (quoted.length >= 2) {
    return {
      display1: quoted[0],
      display2: quoted[1],
      api1: quoted[0].replace(/\s+/g, ""),
      api2: quoted[1].replace(/\s+/g, ""),
    };
  }

  // ===== Tên ngắn =====
  if (args.length >= 2) {
    return {
      display1: args[0],
      display2: args[1],
      api1: args[0].replace(/\s+/g, ""),
      api2: args[1].replace(/\s+/g, ""),
    };
  }

  return null;
}

function describeCompatibility(percent: number): string {
  if (percent >= 90) return "Yêu Mẹ Đi";
  if (percent >= 75) return "Yêu Được";
  if (percent >= 60) return "Tạm";
  if (percent >= 45) return "Bình thường";
  if (percent >= 25) return "Khó hợp";
  return "Cút Đi Đừng Cs Yêu";
}

async function fetchLoveApi(
  name1: string,
  name2: string,
): Promise<{ percentage: number; resultText: string } | null> {
  try {
    const params = new URLSearchParams({
      name1,
      name2,
    });

    const res = await fetch(`${API_ENDPOINT}?${params}`);

    if (!res.ok) return null;

    const json = (await res.json()) as LoveApiResponse;

    if (!json.ok) return null;

    return {
      percentage: json.results.score,
      resultText: json.results.message,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
}

function fallbackLoveCalc(
  name1: string,
  name2: string,
): { percentage: number; result: string } {
  const normalized = `${name1}|${name2}`.toLowerCase();

  let hash = 0;

  for (const c of normalized) {
    hash = (hash * 31 + c.charCodeAt(0)) % 101;
  }

  return {
    percentage: Math.abs(hash),
    result: "Được tính bằng thuật toán nội bộ.",
  };
}

export async function handleLoveCalc(
  message: Message,
  args: string[],
): Promise<EmbedBuilder> {
  const parsed = parseNames(message, args);

  if (!parsed) {
    return new EmbedBuilder()
      .setColor("Red")
      .setTitle("❌ Sai cú pháp")
      .setDescription(
        [
          "**Cách dùng:**",
          "`!lovecalc @user1 @user2`",
          "",
          "hoặc",
          "",
          '`!lovecalc "Tên người 1" "Tên người 2"`',
        ].join("\n"),
      );
  }

  const { display1, display2, api1, api2 } = parsed;

  let percentage: number;
  let resultText: string;

  const api = await fetchLoveApi(api1, api2);

  if (api) {
    percentage = api.percentage;
    resultText = api.resultText;
  } else {
    const fallback = fallbackLoveCalc(api1, api2);
    percentage = fallback.percentage;
    resultText = fallback.result;
  }

  return new EmbedBuilder()
    .setColor("#FF69B4")
    .setTitle("💘 Love Calculator")
    .addFields(
      {
        name: "👤 Người thứ nhất",
        value: display1,
        inline: true,
      },
      {
        name: "👤 Người thứ hai",
        value: display2,
        inline: true,
      },
      {
        name: "❤️ Độ hợp nhau",
        value: `${percentage}%`,
        inline: true,
      },
      {
        name: "💕 Đánh giá",
        value: describeCompatibility(percentage),
        inline: true,
      },
      {
        name: "💬 Nhận xét",
        value: resultText,
      },
    )
    .setFooter({
      text: "❤️",
    })
    .setTimestamp();
}
