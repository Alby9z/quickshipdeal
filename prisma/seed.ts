/**
 * Seed : rôles, permissions, réglages, transporteurs, modèles d'e-mails, pages en brouillon,
 * et premier administrateur (si SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD sont définis).
 * AUCUN produit, prix, avis ni commande n'est créé.
 * Idempotent : peut être relancé sans dupliquer.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { PERMISSIONS, ROLES } from "../src/modules/auth/permissions";
import { EMAIL_TYPE_LABELS } from "../src/modules/emails/templates";
import { SEED_PAGES } from "./seed-data/pages";

const db = new PrismaClient();

async function main() {
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await db.permission.upsert({ where: { key }, create: { key, description }, update: { description } });
  }
  for (const [key, def] of Object.entries(ROLES)) {
    const role = await db.role.upsert({
      where: { key },
      create: { key, name: def.name, description: def.description, isSystem: true },
      update: { name: def.name, description: def.description },
    });
    const perms = await db.permission.findMany({ where: { key: { in: def.permissions } } });
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    await db.rolePermission.createMany({ data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })) });
  }

  // Informations fournies par l'exploitant (extrait du registre + coordonnées communiquées le 21/11/2026).
  // Ne pas écraser des réglages déjà modifiés dans l'admin.
  await db.appSetting.upsert({
    where: { key: "business" },
    update: {},
    create: {
      key: "business",
      value: {
        legalName: "MARTIN Brian",
        tradeName: "QuickShipDeals",
        legalForm: "Entrepreneur individuel (micro-entreprise)",
        siren: "981 011 810",
        siret: "981 011 810 00018",
        rcs: "981 011 810 R.C.S. Belfort",
        euid: "FR9001.981011810",
        apeCode: "47.91A — Vente à distance sur catalogue général",
        registeredAddress: "42 B rue Voltaire, 90000 Belfort, France",
        contactAddress: "11 rue Anatole France, 70300 Luxeuil-les-Bains, France",
        returnAddress: "",
        email: "quickshipdeal@gmail.com",
        phone: "06 46 28 35 81",
        vatNumber: "",
        publicationDirector: "Brian MARTIN",
        hostName: "",
        hostAddress: "",
        mediatorName: "",
        mediatorUrl: "",
        createdOn: "19/10/2023",
      },
    },
  });
  await db.appSetting.upsert({ where: { key: "tax" }, update: {}, create: { key: "tax", value: { vatMode: "UNCONFIGURED", defaultVatRateBps: 2000 } } });
  await db.appSetting.upsert({ where: { key: "store" }, update: {}, create: { key: "store", value: {} } });

  const carriers = [
    { code: "colissimo", name: "Colissimo", trackingUrlTemplate: "https://www.laposte.fr/outils/suivre-vos-envois?code={tracking}" },
    { code: "chronopost", name: "Chronopost", trackingUrlTemplate: "https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLV={tracking}" },
    { code: "dhl", name: "DHL", trackingUrlTemplate: "https://www.dhl.com/fr-fr/home/tracking.html?tracking-id={tracking}" },
    { code: "ups", name: "UPS", trackingUrlTemplate: "https://www.ups.com/track?tracknum={tracking}" },
    { code: "gls", name: "GLS", trackingUrlTemplate: "https://gls-group.com/FR/fr/suivi-colis?match={tracking}" },
    { code: "mondial-relay", name: "Mondial Relay", trackingUrlTemplate: null },
    { code: "other", name: "Autre transporteur", trackingUrlTemplate: null },
  ];
  for (const c of carriers) await db.carrier.upsert({ where: { code: c.code }, create: c, update: {} });

  for (const [key, label] of Object.entries(EMAIL_TYPE_LABELS)) {
    await db.emailTemplate.upsert({ where: { key }, create: { key, subject: "", intro: null }, update: {} });
    void label;
  }

  for (const page of SEED_PAGES) {
    await db.page.upsert({
      where: { key: page.key },
      update: {},
      create: { key: page.key, title: page.title, slug: page.slug, content: page.content, status: "DRAFT", needsLegalReview: page.legal },
    });
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD?.trim();
  if (email && password) {
    const superAdmin = await db.role.findUniqueOrThrow({ where: { key: "SUPER_ADMIN" } });
    const existing = await db.user.findUnique({ where: { email } });
    const user =
      existing ??
      (await db.user.create({
        data: {
          email,
          name: "Administrateur",
          emailVerified: true,
          profile: { create: {} },
        },
      }));
    // Better Auth exige accountId = id de l'utilisateur pour le compte "credential".
    const credential = await db.account.findFirst({ where: { userId: user.id, providerId: "credential" } });
    if (!credential) await db.account.create({ data: { userId: user.id, providerId: "credential", accountId: user.id, password: await hashPassword(password) } });
    else if (credential.accountId !== user.id) await db.account.update({ where: { id: credential.id }, data: { accountId: user.id } });
    await db.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: superAdmin.id } },
      create: { userId: user.id, roleId: superAdmin.id },
      update: {},
    });
    console.log(`Administrateur prêt : ${email}`);
  } else {
    console.log("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD absents : aucun administrateur créé.");
  }
  console.log("Seed terminé (aucune donnée commerciale fictive créée).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
