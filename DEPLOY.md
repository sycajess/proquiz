# Deploy Guide

## Do NOT use Vercel for this app

ProQuiz needs:
- Long-running WebSocket server
- Persistent disk for `data/`

Vercel serverless cannot do either. Use **Railway**, **Render**, or **Fly.io**.

## Order

1. Finish production prep (done in code)
2. Pick host (Railway recommended)
3. Set env vars on host
4. Deploy — HTTPS is automatic on these platforms

## Env vars (production)

```
NODE_ENV=production
HUGGINGFACE_API_TOKEN=your_token
APP_URL=https://your-domain.com
PORT=3000
ROOM_TTL_HOURS=24
ARCHIVE_TTL_DAYS=30
```

Optional: `SENTRY_DSN`, `GEMINI_API_KEY`

## Railway (quick)

1. Push repo to GitHub
2. New project → Deploy from GitHub
3. Add env vars above
4. Add volume mounted at `/app/data` for persistence
5. Build: `npm run build` | Start: `npm start`

## Render

1. New Web Service → connect repo
2. Build: `npm install && npm run build`
3. Start: `npm start`
4. Add disk mount for `data/`

## After deploy

- Set `APP_URL` to your HTTPS URL (join links + QR depend on this)
- Run `npm run backup` periodically or use host snapshots on `data/`
- Monitor logs on host dashboard

## Custom domain

Add domain in host settings → update `APP_URL` to match.
