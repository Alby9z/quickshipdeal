import type { OrderStatus } from "@prisma/client";

type Tone = "neutral" | "orange" | "electric" | "green" | "red" | "amber" | "night";
export const ORDER_TONE: Record<OrderStatus, Tone> = {
  PENDING_PAYMENT: "neutral", PAID: "electric", CONFIRMED: "electric", SUPPLIER_PROCESSING: "amber", SUPPLIER_ORDERED: "amber", AWAITING_SHIPMENT: "amber",
  SHIPPED: "orange", IN_TRANSIT: "orange", OUT_FOR_DELIVERY: "orange", DELIVERED: "green", DELIVERY_FAILED: "red", CANCELLED: "neutral",
  REFUNDED: "night", PARTIALLY_REFUNDED: "night", RETURN_REQUESTED: "red", RETURN_RECEIVED: "amber",
};
export const PAYMENT_LABELS: Record<string, string> = { PENDING: "En attente", SUCCEEDED: "Réussi", FAILED: "Échoué", CANCELLED: "Annulé", REFUNDED: "Remboursé", PARTIALLY_REFUNDED: "Partiellement remboursé", DISPUTED: "Litige" };
export const REFUND_LABELS: Record<string, string> = { PENDING: "En cours", SUCCEEDED: "Effectué", FAILED: "Échoué", CANCELLED: "Annulé" };
export const RETURN_LABELS: Record<string, string> = { REQUESTED: "Demandé", APPROVED: "Accepté", REJECTED: "Refusé", RECEIVED: "Reçu", REFUNDED: "Remboursé", CLOSED: "Clos" };
export const TICKET_LABELS: Record<string, string> = { OPEN: "Ouvert", PENDING_CUSTOMER: "En attente client", RESOLVED: "Résolu", CLOSED: "Fermé" };
export const REVIEW_LABELS: Record<string, string> = { PENDING: "En attente", APPROVED: "Publié", REJECTED: "Refusé" };
export const EMAIL_STATUS_LABELS: Record<string, string> = { QUEUED: "En file", SENT: "Envoyé", DELIVERED: "Délivré", BOUNCED: "Rejeté", FAILED: "Échec", SKIPPED_NOT_CONFIGURED: "Non envoyé (Resend non configuré)" };
