import { describe, expect, it } from "vitest";
import { businessSchema, taxSchema } from "./service";
import { fillLegalTokens, legalTokens } from "./legal-tokens";

describe("legal tokens", () => {
  it("remplace les balises par les réglages et signale les vides", () => {
    const b = businessSchema.parse({ legalName: "MARTIN Brian", email: "contact@example.com", contactAddress: "1 rue X" });
    const t = legalTokens(b, taxSchema.parse({ vatMode: "FRANCHISE" }));
    const out = fillLegalTokens("{{exploitant}} — {{email}} — {{telephone}} — {{mention_tva}} — {{inconnue}}", t);
    expect(out).toBe("MARTIN Brian — contact@example.com — [à compléter] — TVA non applicable, art. 293 B du CGI — {{inconnue}}");
  });
  it("affiche le médiateur avec son lien", () => {
    const b = businessSchema.parse({ mediatorName: "Médiateur X", mediatorUrl: "https://example.org" });
    expect(legalTokens(b, taxSchema.parse({})).mediateur).toBe("Médiateur X — [https://example.org](https://example.org)");
  });
});
