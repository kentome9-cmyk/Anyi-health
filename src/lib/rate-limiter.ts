interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const DEFAULT_CONFIG = {
  windowMs: 60 * 1000,
  max: 60,
};

export function checkRateLimit(
  key: string,
  config: { windowMs?: number; max?: number } = {}
): { allowed: boolean; remaining: number; resetTime: number } {
  const { windowMs = DEFAULT_CONFIG.windowMs, max = DEFAULT_CONFIG.max } = config;
  
  const now = Date.now();
  const existing = rateLimitStore.get(key);
  
  if (!existing || now - existing.windowStart > windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: max - 1, resetTime: now + windowMs };
  }
  
  if (existing.count >= max) {
    return { allowed: false, remaining: 0, resetTime: existing.windowStart + windowMs };
  }
  
  existing.count++;
  return { allowed: true, remaining: max - existing.count, resetTime: existing.windowStart + windowMs };
}

export function getRateLimitKey(request: Request): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  return ip;
}