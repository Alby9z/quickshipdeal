import { test, expect } from "@playwright/test";

const ADMIN = { email: "e2e-admin@example.test", password: "E2E-only-password-2026!" };

test("la boutique publique s'affiche sans données inventées", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/QuickShipDeals/);
  await expect(page.getByText(/catalogue est en préparation|Aucun produit/i).first()).toBeVisible();
  await page.goto("/mentions-legales");
  await expect(page.getByText("981 011 810").first()).toBeVisible();
  await page.goto("/cgv");
  await expect(page.getByText(/en cours de rédaction/i)).toBeVisible();
  const res = await page.request.get("/sitemap.xml");
  expect(res.ok()).toBeTruthy();
});

test("les pages d'administration exigent une connexion", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/connexion/);
});

test("parcours administrateur : catégorie, produit, panier, paiement non configuré", async ({ page }) => {
  await page.goto("/connexion?next=/admin");
  await page.getByLabel(/e-mail/i).fill(ADMIN.email);
  await page.getByLabel(/mot de passe/i).fill(ADMIN.password);
  await page.getByRole("button", { name: /se connecter|connexion/i }).click();
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByText("non configuré").first()).toBeVisible();

  const stamp = Date.now();
  await page.goto("/admin/categories");
  const newCat = page.locator("section", { hasText: "Nouvelle catégorie" });
  await newCat.locator('input[name="name"]').fill(`Catégorie E2E ${stamp}`);
  await newCat.getByRole("button", { name: "Créer" }).click();
  await expect(newCat.getByText("Catégorie enregistrée")).toBeVisible();

  await page.goto("/admin/produits/nouveau");
  await page.locator('input[name="name"]').fill(`Produit E2E ${stamp}`);
  await page.locator('input[name="sku"]').fill(`E2E-${stamp}`);
  await page.locator('input[name="priceCents"]').fill("19,90");
  await page.locator('input[name="costPriceCents"]').fill("8,00");
  await page.locator('input[name="stockQuantity"]').fill("5");
  await page.locator('select[name="primaryCategoryId"]').selectOption({ label: `Catégorie E2E ${stamp}` });
  await page.locator('select[name="status"]').selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText(/au moins une image/i)).toBeVisible(); // pas de publication sans visuel réel

  await page.getByRole("button", { name: /Ajouter une URL/ }).click();
  await page.getByLabel("URL de l'image").fill("/logo.png");
  await page.getByLabel("Texte alternatif").fill("Visuel de test E2E");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/\/admin\/produits\/c[a-z0-9]+$/, { timeout: 30_000 });

  await page.goto(`/produit/produit-e2e-${stamp}`);
  await expect(page.getByRole("heading", { name: `Produit E2E ${stamp}` })).toBeVisible();
  await expect(page.getByText("19,90").first()).toBeVisible();
  await page.getByRole("button", { name: /ajouter au panier/i }).first().click();
  await expect(page.getByRole("button", { name: /Ajouté/ }).first()).toBeVisible();
  await page.goto("/panier");
  await expect(page.getByText(`Produit E2E ${stamp}`).first()).toBeVisible();
  await expect(page.getByText("19,90").first()).toBeVisible();
});
