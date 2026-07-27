---
name: MongoDB Atlas SSL fix on Replit
description: Mongoose trên Replit bị lỗi ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR khi kết nối Atlas — cần options đặc biệt
---

## Rule
Khi connect MongoDB Atlas trên Replit, luôn dùng:
```ts
await mongoose.connect(process.env.MONGODB_URI!, {
  tls: true,
  tlsAllowInvalidCertificates: true,
  serverSelectionTimeoutMS: 10000,
});
```

**Why:** Replit container dùng OpenSSL version không tương thích hoàn toàn với TLS handshake của MongoDB Atlas, gây ra `SSL alert number 80` / `ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR`. `tlsAllowInvalidCertificates: true` bỏ qua validation cert phía client.

**How to apply:** Áp dụng cho mọi project dùng Mongoose + MongoDB Atlas trên Replit. Không cần đổi MONGODB_URI.
