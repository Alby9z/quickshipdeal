import { describe, expect, it } from "vitest";
import { allocate, assertCents, formatEuros, marginCents, marginRateBps, netFromGross, parseEuros, percentOf, roundDiv, vatIncluded } from "./money";

describe("money", () => {
  it("parse les saisies françaises en centimes", () => {
    expect(parseEuros("12,90")).toBe(1290);
    expect(parseEuros("12.9")).toBe(1290);
    expect(parseEuros("12")).toBe(1200);
    expect(parseEuros(" 1 234,5 ")).toBe(123450);
    expect(() => parseEuros("-3")).toThrow();
    expect(() => parseEuros("12,999")).toThrow();
    expect(() => parseEuros("abc")).toThrow();
  });
  it("refuse les montants négatifs ou non entiers", () => {
    expect(() => assertCents(-1)).toThrow();
    expect(() => assertCents(1.5)).toThrow();
    expect(assertCents(0)).toBe(0);
  });
  it("arrondit au centime", () => {
    expect(roundDiv(5, 2)).toBe(3);
    expect(roundDiv(-5, 2)).toBe(-3);
    expect(percentOf(999, 1000)).toBe(100); // 10 % de 9,99 = 0,999 → 1,00
  });
  it("calcule la TVA incluse et le HT", () => {
    expect(vatIncluded(1200, 2000)).toBe(200);
    expect(netFromGross(1200, 2000)).toBe(1000);
    expect(vatIncluded(999, 2000)).toBe(166); // 9,99 TTC → 8,33 HT
    expect(vatIncluded(1000, 0)).toBe(0);
  });
  it("calcule la marge HT", () => {
    expect(marginCents(2400, 1000, 2000)).toBe(1000);
    expect(marginRateBps(2400, 1000, 2000)).toBe(5000);
    expect(marginCents(1500, 1000, 0)).toBe(500);
  });
  it("répartit sans perte de centime", () => {
    const parts = allocate(100, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(parts.sort()).toEqual([33, 33, 34]);
    expect(allocate(0, [5, 5])).toEqual([0, 0]);
  });
  it("formate en euros", () => {
    expect(formatEuros(129000).replace(/\s/g, " ")).toBe("1 290,00 €");
  });
});
