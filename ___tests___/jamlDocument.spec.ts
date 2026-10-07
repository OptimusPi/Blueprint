import { readFileSync } from "node:fs";
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
        const path = "/home/ubuntu/.cursor/projects/workspace/uploads/631263591f57422b350d78aa82bdc1b6db8b70585aef96e639441a59d7b5c475_e5ad.jaml";
        const text = readFileSync(path, "utf8");
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
