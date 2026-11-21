import { env } from "@/lib/env";

export type TrackingResult = {
  status: "PENDING" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED" | "RETURNED";
  events: { occurredAt: Date; description: string; location?: string; status?: string; externalId?: string }[];
  estimatedDeliveryAt?: Date | null;
};

export interface TrackingAdapter {
  readonly key: string;
  readonly label: string;
  configured(): boolean;
  /** Récupère le suivi réel. Jamais appelé si non configuré. */
  fetch?(trackingNumber: string, carrierCode?: string | null): Promise<TrackingResult>;
}

/**
 * 17TRACK et AfterShip — squelettes. NON OPÉRATIONNELS tant que la clé API n'est pas fournie
 * et que l'appel n'est pas implémenté/testé avec ce compte. En attendant, le suivi est saisi
 * manuellement par l'administrateur (transporteur, numéro, événements).
 */
const IMPLEMENTED: Record<string, boolean> = { track17: false, aftership: false };

const track17: TrackingAdapter = { key: "17track", label: "17TRACK", configured: () => IMPLEMENTED.track17 === true && Boolean(env().TRACK17_API_KEY) };
const aftership: TrackingAdapter = { key: "aftership", label: "AfterShip", configured: () => IMPLEMENTED.aftership === true && Boolean(env().AFTERSHIP_API_KEY) };

export const TRACKING_ADAPTERS = [track17, aftership];

export function activeTrackingAdapter(): TrackingAdapter | null {
  return TRACKING_ADAPTERS.find((a) => a.configured() && a.fetch) ?? null;
}

export function carrierTrackingUrl(template: string | null | undefined, trackingNumber: string) {
  if (!template) return null;
  return template.replace("{tracking}", encodeURIComponent(trackingNumber));
}
