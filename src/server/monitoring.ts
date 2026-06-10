export function logError(context: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(JSON.stringify({ level: 'error', context, message, stack, ts: new Date().toISOString() }));

  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    fetch(`https://sentry.io/api/0/envelope/`, { method: 'POST' }).catch(() => {});
    // Full Sentry SDK: add @sentry/node and SENTRY_DSN in production
  }
}

export function requestLogger(req: { method: string; path: string }, status: number, ms: number) {
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify({ method: req.method, path: req.path, status, ms }));
  }
}
