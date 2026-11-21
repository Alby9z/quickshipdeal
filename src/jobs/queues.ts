import { Queue, type JobsOptions } from "bullmq";
import { redis } from "@/lib/redis";

/** Noms des files traitées par le worker (voir worker/index.ts). */
export const QUEUES = {
  emails: "emails",
  supplierOrders: "supplier-orders",
  supplierSync: "supplier-sync",
  trackingSync: "tracking-sync",
  maintenance: "maintenance",
} as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

const queues = new Map<string, Queue>();

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 30_000 },
  removeOnComplete: { age: 7 * 24 * 3600, count: 5000 },
  removeOnFail: { age: 30 * 24 * 3600 },
};

export function getQueue(name: QueueName): Queue | null {
  const connection = redis();
  if (!connection) return null;
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS });
    queues.set(name, q);
  }
  return q;
}

/**
 * Ajoute une tâche. jobId déterministe = aucune tâche en double.
 * Retourne false si Redis n'est pas configuré : l'appelant décide du repli.
 */
export async function enqueue(name: QueueName, jobName: string, data: unknown, jobId: string, opts?: JobsOptions) {
  const q = getQueue(name);
  if (!q) return false;
  await q.add(jobName, data, { ...opts, jobId: jobId.replace(/:/g, "_") });
  return true;
}
