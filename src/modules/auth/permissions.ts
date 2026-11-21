/** Catalogue des permissions et rôles système. Source unique utilisée par le seed et les contrôles. */
export const PERMISSIONS = {
  "dashboard:read": "Voir le tableau de bord",
  "product:read": "Voir les produits",
  "product:write": "Créer et modifier les produits",
  "price:write": "Modifier les prix",
  "inventory:write": "Modifier les stocks",
  "category:write": "Gérer les catégories",
  "supplier:read": "Voir les fournisseurs",
  "supplier:write": "Gérer les fournisseurs et synchronisations",
  "order:read": "Voir les commandes",
  "order:write": "Modifier les commandes et expéditions",
  "order:refund": "Rembourser",
  "customer:read": "Voir les clients",
  "customer:write": "Modifier les clients, export et anonymisation RGPD",
  "promotion:write": "Gérer promotions et coupons",
  "review:write": "Modérer les avis",
  "return:write": "Gérer retours et réclamations",
  "support:write": "Répondre au support",
  "email:read": "Voir l'historique des e-mails",
  "content:write": "Gérer blog, pages et SEO",
  "analytics:read": "Voir les statistiques et marges",
  "settings:write": "Modifier les réglages",
  "user:write": "Gérer les administrateurs et rôles",
  "audit:read": "Voir le journal d'audit",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
const ALL = Object.keys(PERMISSIONS) as PermissionKey[];

export const ROLES: Record<string, { name: string; description: string; permissions: PermissionKey[] }> = {
  SUPER_ADMIN: { name: "Super administrateur", description: "Tous les droits", permissions: ALL },
  ADMIN: {
    name: "Administrateur",
    description: "Gestion complète sauf administrateurs",
    permissions: ALL.filter((p) => p !== "user:write"),
  },
  CATALOG_MANAGER: {
    name: "Gestionnaire catalogue",
    description: "Produits, prix, stocks, fournisseurs",
    permissions: [
      "dashboard:read", "product:read", "product:write", "price:write", "inventory:write",
      "category:write", "supplier:read", "supplier:write", "promotion:write", "content:write",
    ],
  },
  ORDER_MANAGER: {
    name: "Gestionnaire commandes",
    description: "Commandes, livraisons, retours",
    permissions: [
      "dashboard:read", "product:read", "order:read", "order:write", "order:refund",
      "customer:read", "return:write", "support:write", "email:read", "supplier:read",
    ],
  },
  SUPPORT: {
    name: "Support client",
    description: "Support, avis, retours",
    permissions: ["dashboard:read", "order:read", "customer:read", "review:write", "return:write", "support:write", "email:read"],
  },
  CUSTOMER: { name: "Client", description: "Compte client", permissions: [] },
};

export const STAFF_ROLES = Object.keys(ROLES).filter((r) => r !== "CUSTOMER");
