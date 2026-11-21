import IORedis, { type Redis } from "ioredis";
import { env } from "./env";

const g = globalThis as unknown as { redis?: Redis | null };

/** Connexion Redis partagée, ou null si REDIS_URL n'est pas configuré. */
export function redis(): Redis | null {
  if (g.redis !== undefined) return g.redis;
  const url = env().REDIS_URL;
  g.redis = url ? new IORedis(url, { maxRetriesPerRequest: null, lazyConnect: false }) : null;
  return g.redis;
}
