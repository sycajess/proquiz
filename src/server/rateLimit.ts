import { Request, Response, NextFunction } from 'express';

interface Entry { count: number; resetAt: number }

const buckets = new Map<string, Entry>();

function hit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
  }
  entry.count++;
  return entry.count > limit;
}

function clientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

export function rateLimit(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.path}:${clientIp(req)}`;
    if (hit(key, limit, windowMs)) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    next();
  };
}

export const apiLimiter = rateLimit(120, 60_000);
export const aiLimiter = rateLimit(15, 60 * 60_000);
