/**
 * Danh sách từ tục tĩu — chỉnh sửa thoải mái tại đây.
 * Mỗi lần bot phát hiện từ trong danh sách này trong chat:
 *  • Người chơi -3 công đức
 *  • +1 profanityCount (hướng tới thành tựu "Mỏ Hỗn")
 */
export const BADWORDS: string[] = [
  // Tiếng Việt
  "đụ",
  "địt",
  "đéo",
  "đĩ",
  "cặc",
  "lồn",
  "buồi",
  "cứt",
  "chó má",
  "đcm",
  "đkm",
  "dcm",
  "dkm",
  "clm",
  "vkl",
  "vcl",
  "vcc",
  "vl",
  "cc",
  "dm",
  "đm",
  "mẹ mày",
  "bố mày",
  "tiên sư",
  "mẹ kiếp",
  "óc chó",
  "ngu vl",
  "ngu vcl",
  "ngu",
  // Tiếng Anh phổ biến
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "ass",
  "damn",
];

/**
 * Kiểm tra xem chuỗi có chứa từ tục không.
 * So sánh lowercase và bỏ qua dấu cách dư.
 */
export function containsBadWord(text: string): boolean {
  const lower = text.toLowerCase();
  return BADWORDS.some((w) => lower.includes(w));
}
