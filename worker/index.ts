/**
 * Worker BullMQ — à héberger hors Vercel (Railway, Render, Fly.io…), avec les mêmes variables d'environnement.
 * Démarrage : `npm run worker`. Sans REDIS_URL, il s'arrête : les tâches sont alors exécutées en ligne par le site.
 */
import { Worker, type Job } from "bullmq";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { QUEUES, getQueue } from "@/jobs/queues";
import { deliverEmail } from "@/modules/emails/service";
import { placeSupplierOrders, runSupplierSync } from "@/modules/suppliers/service";
import { publishScheduledPosts, reconcilePendingOrders, remindAbandonedCarts, lowStockAlerts, syncTracking } from "@/modules/maintenance/service";

const connection = redis();
if (!connection) {
  logger.error("REDIS_URL absent : le worker ne peut pas démarrer.");
  process.exit(1);
}

const MAINTENANCE: Record<string, () => Promise<unknown>> = {
  "publish-scheduled-posts": () => publishScheduledPosts(),
  "reconcile-pending-orders": () => reconcilePendingOrders(),
  "abandoned-carts": () => remindAbandonedCarts(),
  "low-stock": () => lowStockAlerts(),
  "supplier-sync-all": async () => {
    const suppliers = await db.supplier.findMany({ where: { isEnabled: true, deletedAt: null, type: { not: "MANUAL" } } });
    for (const s of suppliers) await runSupplierSync(s.id, "prices");
    return suppliers.length;
  },
};

const handlers: Record<string, (job: Job) => Promise<unknown>> = {
  [QUEUES.emails]: (job) => deliverEmail((job.data as { emailLogId: string }).emailLogId),
  [QUEUES.supplierOrders]: (job) => placeSupplierOrders((job.data as { orderId: string }).orderId),
  [QUEUES.supplierSync]: (job) => {
    const d = job.data as { supplierId: string; kind: "import" | "prices" | "stock"; triggeredById?: string };
    return runSupplierSync(d.supplierId, d.kind, d.triggeredById);
  },
  [QUEUES.trackingSync]: () => syncTracking(),
  [QUEUES.maintenance]: (job) => {
    const fn = MAINTENANCE[job.name];
    if (!fn) throw new Error(`Tâche de maintenance inconnue : ${job.name}`);
    return fn();
  },
};

const workers = Object.entries(handlers).map(([queue, fn]) => {
  const w = new Worker(queue, async (job) => fn(job), { connection, concurrency: queue === QUEUES.emails ? 5 : 1 });
  w.on("completed", (job, result) => logger.info({ queue, job: job.name, id: job.id, result }, "Tâche terminée"));
  w.on("failed", (job, err) => logger.error({ queue, job: job?.name, id: job?.id, attempts: job?.attemptsMade, err }, "Tâche en échec"));
  return w;
});

/** Planification (idempotente : BullMQ dédoublonne les tâches répétées par clé). */
async function schedule() {
  const m = getQueue(QUEUES.maintenance)!;
  const t = getQueue(QUEUES.trackingSync)!;
  await m.upsertJobScheduler("publish-scheduled-posts", { every: 5 * 60_000 }, { name: "publish-scheduled-posts" });
  await m.upsertJobScheduler("reconcile-pending-orders", { every: 30 * 60_000 }, { name: "reconcile-pending-orders" });
  await m.upsertJobScheduler("abandoned-carts", { every: 60 * 60_000 }, { name: "abandoned-carts" });
  await m.upsertJobScheduler("low-stock", { pattern: "0 8 * * *", tz: "Europe/Paris" }, { name: "low-stock" });
  await m.upsertJobScheduler("supplier-sync-all", { pattern: "0 */6 * * *", tz: "Europe/Paris" }, { name: "supplier-sync-all" });
  await t.upsertJobScheduler("tracking-sync", { every: 2 * 3600_000 }, { name: "tracking-sync" });
}

schedule()
  .then(() => logger.info({ queues: Object.keys(handlers) }, "Worker QuickShipDeals démarré"))
  .catch((e) => { logger.error({ err: e }, "Planification impossible"); process.exit(1); });

async function shutdown() {
  logger.info("Arrêt du worker…");
  await Promise.all(workers.map((w) => w.close()));
  await db.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
