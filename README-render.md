Render deployment notes
=======================

- Web Service: use the Render web service for the API server.
- Build command: pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build
- Start command: node artifacts/api-server/dist/index.mjs
- Health check path: /healthz
- Port: Render injects PORT automatically; the server now listens on 0.0.0.0 and falls back to 3000 locally.
