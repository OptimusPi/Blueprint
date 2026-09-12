import { describe, expect, it } from "vitest";
import { Severity, getDiagnostics } from "jaml-lang";
import { DEFAULT_JAML } from "../src/modules/state/jamlSearchContext";

const errors = (jaml: string) => getDiagnostics(jaml).filter((d) => d.severity === Severity.Error);

describe("DEFAULT_JAML", () => {
    it("has no diagnostics", () => {
        expect(errors(DEFAULT_JAML)).toEqual([]);
    });

    it("declares nine should clauses", () => {
        expect(DEFAULT_JAML.split("should:")[1].match(/^  - /gm)).toHaveLength(9);
    });

    it("the validator rejects the keys that crashed motely-wasm", () => {
        const broken = DEFAULT_JAML.replace("spectralCard:", "spectral:").replace("joker: Any", "mixedJoker: Any");
        expect(errors(broken).map((d) => d.message)).toEqual(["Unknown key 'spectral'.", "Unknown key 'mixedJoker'."]);
    });
});
