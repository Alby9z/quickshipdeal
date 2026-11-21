import { redis } from "./redis";

const memory = new Map<string, { count: number; resetAt: number }>();

/**
 * Limitation de débit à fenêtre fixe. Utilise Redis quand il est configuré
 * (cohérent entre plusieurs instances), sinon un compteur mémoire par instance.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const r = redis();
  const fullKey = `rl:${key}`;
  if (r) {
    try {
      const count = await r.incr(fullKey);
      if (count === 1) await r.expire(fullKey, windowSeconds);
      return { ok: count <= limit, remaining: Math.max(0, limit - count) };
    } catch {
      // Redis indisponible : on retombe sur la mémoire plutôt que de bloquer le site.
    }
  }
  const now = Date.now();
  const entry = memory.get(fullKey);
  if (!entry || entry.resetAt < now) {
    memory.set(fullKey, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, remaining: limit - 1 };
  }
  entry.count++;
  return { ok: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
