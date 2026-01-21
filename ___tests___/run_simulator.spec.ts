import { describe, expect, test } from "vitest";
import { RunSimulator } from "../src/modules/balatrots/RunSimulator";

describe("RunSimulator Architecture Test", () => {
    const seed = "ALEEB";

    test("simulate() returns valid structure for ALEEB", () => {
        const result = RunSimulator.simulate({
            seed,
            deck: 'red',
            stake: 'white',
            maxAnte: 2
        });

        expect(result.seed).toBe("ALEEB");
        expect(result.antes[1]).toBeDefined();
        expect(result.antes[2]).toBeDefined();

        const ante1 = result.antes[1];
        expect(ante1.boss).toBeDefined();
        expect(ante1.vouchers.length).toBeGreaterThan(0);
        expect(ante1.shopQueue.length).toBe(15);
        expect(ante1.packs.length).toBe(4);

        // Verify Card Transformation
        // Engine: "D_T" -> UI: "T_D"
        expect(ante1.deckDraws["Round 1"][0].name).toBe("T_D");
        expect(ante1.deckDraws["Round 1"][0].type).toBe("Standard");
    });
});
