import { load } from "js-yaml";
import { describe, expect, it } from "vitest";
import { parseJamlDocument } from "../src/modules/jamlDocumentParse";
import { parseSeedList } from "../src/modules/state/store";

describe("parseJamlDocument", () => {
    it("splits filter clauses from a seeds list and reads deck/stake", () => {
        const doc = parseJamlDocument(`name: demo
deck: Ghost
stake: White
must:
  - tag: NegativeTag
    antes: [1]
seeds:
  - ALEEB
  - PIROCKS
`);
        expect(doc.name).toBe("demo");
        expect(doc.deck).toBe("Ghost");
        expect(doc.stake).toBe("White");
        expect(doc.seeds).toEqual(["ALEEB", "PIROCKS"]);
        expect(doc.filterJaml).toContain("must:");
        expect(doc.filterJaml).not.toMatch(/^seeds:/m);
    });

    it("feeds parseSeedList for whole JAML uploads", () => {
        const text = `deck: Red
stake: White
must:
  - joker: Any
    antes: [1]
seeds:
  - WEEJOKER
  - ALEEB
`;
        expect(parseSeedList(text)).toEqual(["WEEJOKER", "ALEEB"]);
    });
});

describe("simpleCola fixture", () => {
    it("loads 46,210 seeds without keeping them in the filter body", () => {
        const alphabet = "123456789ABCDEFGHIJKLMNPQRSTUVWXYZ";
        const seeds = Array.from({ length: 46210 }, (_, i) => {
            let n = i, out = "";
            for (let k = 0; k < 8; k++) { out += alphabet[n % alphabet.length]; n = Math.floor(n / alphabet.length); }
            return out;
        });
        const text = `name: simpleCola\ndeck: Ghost\nstake: White\nmust:\n  - joker: DietCola\n    antes: [1, 2]\nseeds:\n${seeds.map((x) => `  - ${x}`).join("\n")}\n`;
        const started = performance.now();
        const doc = parseJamlDocument(text);
        const elapsed = performance.now() - started;
        expect(doc.seeds).toHaveLength(46210);
        expect(doc.deck).toBe("Ghost");
        expect(doc.stake).toBe("White");
        expect(doc.filterJaml).toContain("simpleCola");
        expect(doc.filterJaml).not.toMatch(/^seeds:/m);
        expect(elapsed).toBeLessThan(5000);
    });
});

describe("JSON filter", () => {
    it("reads seeds, deck and stake off a JSON document and keeps the rest as the filter", () => {
        const text = JSON.stringify({ name: "cola", deck: "Ghost", stake: "White", must: [{ joker: "DietCola", antes: [1] }], seeds: ["WEEJOKER", "aleeb"] });
        const doc = parseJamlDocument(text);
        expect(doc.seeds).toEqual(["WEEJOKER", "ALEEB"]);
        expect(doc.deck).toBe("Ghost");
        expect(doc.stake).toBe("White");
        expect(doc.name).toBe("cola");
        expect(load(doc.filterJaml)).toEqual({ name: "cola", deck: "Ghost", stake: "White", must: [{ joker: "DietCola", antes: [1] }] });
    });
});
