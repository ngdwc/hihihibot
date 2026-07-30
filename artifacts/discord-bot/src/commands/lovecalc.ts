import { EmbedBuilder, Message } from "discord.js";

interface LoveApiResponse {
  percentage?: number | string;
  score?: number | string;
  result?: string;
  description?: string;
  text?: string;
}

const API_CANDIDATES = [
  "https://calculator.freeapi.io/love",
  "https://api.calculator.freeapi.io/love",
  "https://calculator.freeapi.io/api/v1/love",
  "https://api.calculatorfree.com/love",
  "https://api.calculatorapi.app/v1/love",
];

function parseNames(args: string[]): { name1: string; name2: string } | null {
  const input = args.join(" ").trim();
  const quoted = Array.from(input.matchAll(/"([^"]+)"/g), (m) => m[1]);
  if (quoted.length >= 2) {
    return { name1: quoted[0], name2: quoted[1] };
  }

  if (args.length >= 2) {
    return { name1: args[0], name2: args.slice(1).join(" ") };
  }

  return null;
}

function describeCompatibility(percent: number): string {
  if (percent >= 90) return "Yêu Mẹ Đi 💖";
  if (percent >= 75) return "Yêu Được 💘";
  if (percent >= 60) return "Tạm Tạm 💞";
  if (percent >= 45) return "Bình thường 🤝";
  if (percent >= 25) return "Khỏi yêu nhé 😕";
  return "Rất không hợp 💔";
}

function normalizePercent(value: unknown): number | null {
  if (typeof value === "number") return Math.min(100, Math.max(0, value));
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/[%,]/g, ""));
    if (!Number.isNaN(n)) return Math.min(100, Math.max(0, n));
  }
  return null;
}

function fallbackLoveCalc(name1: string, name2: string): { percentage: number; result: string } {
  const normalized = `${name1.trim().toLowerCase()}|${name2.trim().toLowerCase()}`;
  let hash = 0;
  for (const char of normalized) {
    hash = (hash * 31 + char.charCodeAt(0)) % 101;
  }
  const percentage = Math.abs(hash);
  return {
    percentage,
    result: "Không lấy được API, dùng thuật toán nội bộ để tính tạm.",
  };
}

async function fetchLoveApi(
  name1: string,
  name2: string,
): Promise<{ percentage: number; resultText: string } | null> {
  const params = new URLSearchParams({ name1, name2 });

  for (const base of API_CANDIDATES) {
    try {
      const url = `${base}?${params.toString()}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const json = (await res.json()) as LoveApiResponse;
      const percent =
        normalizePercent(json.percentage) ?? normalizePercent(json.score);
      if (percent === null) continue;

      const resultText =
        json.result || json.description || json.text || "Kết quả hợp nhau.";
      return { percentage: percent, resultText };
    } catch {
      continue;
    }
  }

  return null;
}

export async function handleLoveCalc(
  _message: Message,
  args: string[],
): Promise<EmbedBuilder> {
  const parsed = parseNames(args);
  if (!parsed) {
    return new EmbedBuilder()
      .setColor("#FF4444")
      .setTitle("❌ Sai cú pháp")
      .setDescription(
        "Dùng: `!lovecalc \"tên người thứ nhất\" \"tên người thứ hai\"`\n" +
          "VD: `!lovecalc \"An\" \"Bình\"`",
      );
  }

  const { name1, name2 } = parsed;
  let percentage: number;
  let apiNote = "";
  let resultText = "";

  const apiResponse = await fetchLoveApi(name1, name2);
  if (apiResponse) {
    percentage = apiResponse.percentage;
    resultText = apiResponse.resultText;
  } else {
    const fallback = fallbackLoveCalc(name1, name2);
    percentage = fallback.percentage;
    resultText = fallback.result;
    apiNote = " (Dùng fallback khi API không khả dụng)";
  }

  const compatibility = describeCompatibility(percentage);

  return new EmbedBuilder()
    .setColor("#FF69B4")
    .setTitle("💘 Love Calculator")
    .addFields(
      { name: "👤 Tên 1", value: name1, inline: true },
      { name: "👤 Tên 2", value: name2, inline: true },
      { name: "💯 Hợp nhau", value: `${percentage}%`, inline: true },
      { name: "🔮 Đánh giá", value: compatibility, inline: true },
      { name: "📌 Ghi chú", value: resultText + apiNote, inline: false },
    );
}
