import type { AvailabilityStatus, Supplier } from "@prisma/client";

/** Produit tel que renvoyé par un fournisseur (normalisé). */
export type SupplierCatalogItem = {
  externalSku: string;
  externalId?: string;
  title?: string;
  costPriceCents?: number;
  currency?: string;
  availability?: AvailabilityStatus;
  stockQuantity?: number;
  raw?: unknown;
};

export type SupplierOrderRequest = {
  orderNumber: string;
  shippingAddress: Record<string, unknown>;
  email: string;
  lines: { externalSku: string; quantity: number }[];
};

export type AdapterCapabilities = { catalog: boolean; prices: boolean; stock: boolean; orders: boolean; orderStatus: boolean };

/**
 * Contrat commun à tous les fournisseurs. Chaque intégration réelle implémente
 * les méthodes qu'elle supporte ; `configured` est false tant que les accès manquent.
 */
export interface SupplierAdapter {
  readonly key: string;
  readonly label: string;
  configured(): boolean;
  capabilities(): AdapterCapabilities;
  fetchCatalog?(supplier: Supplier, page: number): Promise<{ items: SupplierCatalogItem[]; hasMore: boolean }>;
  fetchUpdates?(supplier: Supplier, externalSkus: string[]): Promise<SupplierCatalogItem[]>;
  placeOrder?(supplier: Supplier, order: SupplierOrderRequest): Promise<{ externalOrderId: string; status: string }>;
  getOrderStatus?(supplier: Supplier, externalOrderId: string): Promise<{ status: string; trackingNumber?: string; carrier?: string }>;
}

export class SupplierNotConfiguredError extends Error {
  constructor(label: string) {
    super(`${label} : intégration non configurée (accès API requis). Utilisez la transmission manuelle.`);
  }
}
