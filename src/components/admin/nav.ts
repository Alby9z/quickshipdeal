import type { PermissionKey } from "@/modules/auth/permissions";

export const ADMIN_NAV: { group: string; items: { href: string; label: string; perm: PermissionKey }[] }[] = [
  { group: "Pilotage", items: [
    { href: "/admin", label: "Tableau de bord", perm: "dashboard:read" },
    { href: "/admin/statistiques", label: "Statistiques", perm: "analytics:read" },
  ] },
  { group: "Catalogue", items: [
    { href: "/admin/produits", label: "Produits", perm: "product:read" },
    { href: "/admin/categories", label: "Catégories", perm: "category:write" },
    { href: "/admin/prix", label: "Prix", perm: "price:write" },
    { href: "/admin/stocks", label: "Stocks", perm: "inventory:write" },
    { href: "/admin/fournisseurs", label: "Fournisseurs", perm: "supplier:read" },
    { href: "/admin/synchronisations", label: "Synchronisations", perm: "supplier:read" },
  ] },
  { group: "Ventes", items: [
    { href: "/admin/commandes", label: "Commandes", perm: "order:read" },
    { href: "/admin/paiements", label: "Paiements", perm: "order:read" },
    { href: "/admin/remboursements", label: "Remboursements", perm: "order:read" },
    { href: "/admin/clients", label: "Clients", perm: "customer:read" },
    { href: "/admin/livraisons", label: "Livraisons", perm: "order:read" },
    { href: "/admin/transporteurs", label: "Transporteurs et tarifs", perm: "settings:write" },
  ] },
  { group: "Marketing", items: [
    { href: "/admin/promotions", label: "Promotions", perm: "promotion:write" },
    { href: "/admin/coupons", label: "Coupons", perm: "promotion:write" },
    { href: "/admin/avis", label: "Avis", perm: "review:write" },
  ] },
  { group: "Service client", items: [
    { href: "/admin/retours", label: "Retours", perm: "return:write" },
    { href: "/admin/support", label: "Réclamations et support", perm: "support:write" },
    { href: "/admin/emails", label: "E-mails", perm: "email:read" },
  ] },
  { group: "Contenu", items: [
    { href: "/admin/blog", label: "Blog", perm: "content:write" },
    { href: "/admin/pages", label: "Pages", perm: "content:write" },
    { href: "/admin/seo", label: "SEO", perm: "content:write" },
  ] },
  { group: "Système", items: [
    { href: "/admin/reglages", label: "Paramètres", perm: "settings:write" },
    { href: "/admin/utilisateurs", label: "Administrateurs", perm: "user:write" },
    { href: "/admin/roles", label: "Rôles et permissions", perm: "user:write" },
    { href: "/admin/audit", label: "Journal d'audit", perm: "audit:read" },
  ] },
];
