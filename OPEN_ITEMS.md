# Open Items

Production-ready for Railway/Render/Fly. **Not Vercel** (needs WebSockets + disk).

## Done

Full app + production hardening: rate limits, room cleanup, CSV export, health check, backup script, deploy guide, trust proxy for HTTPS.

## Before you host

1. Put real token in host env vars (not in git) — rotate if exposed in `.env.example`
2. Set `APP_URL=https://your-domain.com`
3. Mount persistent volume on `data/`
4. `npm run build` → `npm start`

## Optional later

- Redis for multi-instance
- Full Sentry SDK (`@sentry/node`)
- Uptime monitoring (UptimeRobot, Better Stack)

See `DEPLOY.md`.
