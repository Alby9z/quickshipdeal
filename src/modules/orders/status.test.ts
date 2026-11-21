import { describe, expect, it } from "vitest";
import { canTransition, ORDER_STATUS_LABELS, ORDER_TRANSITIONS } from "./status";

describe("machine à états des commandes", () => {
  it("chaque statut a un libellé et des transitions définies", () => {
    for (const s of Object.keys(ORDER_STATUS_LABELS)) expect(ORDER_TRANSITIONS).toHaveProperty(s);
  });
  it("interdit de déclarer expédiée une commande non payée", () => {
    expect(canTransition("PENDING_PAYMENT", "SHIPPED")).toBe(false);
    expect(canTransition("PENDING_PAYMENT", "PAID")).toBe(true);
  });
  it("une commande remboursée est terminale", () => {
    expect(ORDER_TRANSITIONS.REFUNDED).toEqual([]);
  });
  it("parcours nominal autorisé", () => {
    const path = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "SUPPLIER_ORDERED", "SHIPPED", "IN_TRANSIT", "DELIVERED"] as const;
    for (let i = 1; i < path.length; i++) expect(canTransition(path[i - 1]!, path[i]!)).toBe(true);
  });
});
