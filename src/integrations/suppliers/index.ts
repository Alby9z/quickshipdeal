import type { SupplierType } from "@prisma/client";
import { env } from "@/lib/env";
import { type SupplierAdapter } from "./adapter";

/** Passe à true uniquement quand l'intégration a été implémentée ET testée avec de vrais accès. */
const IMPLEMENTED: Record<string, boolean> = { BIGBUY: false, CJDROPSHIPPING: false };

const none = { catalog: false, prices: false, stock: false, orders: false, orderStatus: false };

/** Fournisseur manuel : l'administrateur transmet les commandes et saisit les références. Toujours disponible. */
const manual: SupplierAdapter = {
  key: "MANUAL",
  label: "Manuel",
  configured: () => true,
  capabilities: () => none,
};

/**
 * BigBuy — squelette d'intégration. NON OPÉRATIONNEL tant que :
 * 1) un compte BigBuy avec accès API est ouvert, 2) BIGBUY_API_KEY est renseignée,
 * 3) les appels (catalogue, stock, commandes) sont implémentés et testés sur le bac à sable BigBuy.
 */
const bigbuy: SupplierAdapter = {
  key: "BIGBUY",
  label: "BigBuy",
  configured: () => IMPLEMENTED.BIGBUY === true && Boolean(env().BIGBUY_API_KEY),
  capabilities: () => none,
};

/**
 * CJdropshipping — squelette d'intégration. NON OPÉRATIONNEL tant que :
 * 1) un compte CJ avec accès API est ouvert, 2) CJ_API_EMAIL / CJ_API_KEY sont renseignés,
 * 3) les appels sont implémentés et testés avec ces accès.
 */
const cj: SupplierAdapter = {
  key: "CJDROPSHIPPING",
  label: "CJdropshipping",
  configured: () => IMPLEMENTED.CJDROPSHIPPING === true && Boolean(env().CJ_API_KEY),
  capabilities: () => none,
};

const other: SupplierAdapter = { key: "OTHER_API", label: "Autre API", configured: () => false, capabilities: () => none };

const ADAPTERS: Record<SupplierType, SupplierAdapter> = { MANUAL: manual, BIGBUY: bigbuy, CJDROPSHIPPING: cj, OTHER_API: other };

export function supplierAdapter(type: SupplierType): SupplierAdapter {
  return ADAPTERS[type];
}

export function adapterStatus(type: SupplierType): "manual" | "configured" | "not_configured" {
  if (type === "MANUAL") return "manual";
  return ADAPTERS[type].configured() ? "configured" : "not_configured";
}
