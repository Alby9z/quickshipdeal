import { describe, it, expect } from "vitest";
import { parseSupplierCsv, splitCsvLine } from "./csv";

describe("import CSV fournisseur", () => {
  it("découpe les champs entre guillemets", () => {
    expect(splitCsvLine('a;"b;c";"d ""e"""', ";")).toEqual(["a", "b;c", 'd "e"']);
  });
  it("lit les colonnes reconnues et convertit les prix en centimes", () => {
    const r = parseSupplierCsv("sku;titre;prix_achat;stock\nA1;Lampe;12,50;4\nA2;Tapis;3;0");
    expect(r.errors).toEqual([]);
    expect(r.items[0]).toMatchObject({ externalSku: "A1", title: "Lampe", costPriceCents: 1250, stockQuantity: 4, availability: "IN_STOCK" });
    expect(r.items[1]).toMatchObject({ costPriceCents: 300, availability: "OUT_OF_STOCK" });
  });
  it("rejette les lignes invalides sans rien deviner", () => {
    const r = parseSupplierCsv("sku,cost,stock\n,1,1\nB1,abc,1\nB2,1,-3\nB3,1,2\nB3,1,2");
    expect(r.items.map((i) => i.externalSku)).toEqual(["B3"]);
    expect(r.errors).toHaveLength(4);
  });
  it("exige une colonne sku", () => {
    expect(parseSupplierCsv("nom;prix\nx;1").errors[0]).toMatch(/sku/);
  });
});
