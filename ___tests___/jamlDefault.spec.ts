import { describe, expect, it } from "vitest";
import { DEFAULT_JAML } from "../src/modules/state/jamlSearchContext";

describe("DEFAULT_JAML", () => {
    it("declares nine should clauses", () => {
        expect(DEFAULT_JAML.split("should:")[1].match(/^  - /gm)).toHaveLength(9);
    });

    it("uses spectralCard and joker clause keys", () => {
        expect(DEFAULT_JAML).toMatch(/spectralCard:/);
        expect(DEFAULT_JAML).toMatch(/joker: Any/);
        expect(DEFAULT_JAML).not.toMatch(/^\s*spectral:/m);
        expect(DEFAULT_JAML).not.toMatch(/mixedJoker:/);
    });
});
