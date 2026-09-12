import { describe, expect, it } from "vitest";
import { analyzeSeed } from "../src/modules/GameEngine";
import { describeAnte, findItems, summarizeSeed } from "../src/modules/webmcp/summary";
import { parseSeedList } from "../src/modules/state/store";

const options = { buys: {}, sells: {}, showCardSpoilers: false, unlocks: [], events: [], maxMiscCardSource: 15 };

function analyze(seed: string, antes = 3) {
    const results = analyzeSeed({ seed, deck: "Ghost Deck", stake: "White Stake", gameVersion: "10106", antes, cardsPerAnte: 20 }, options);
    if (!results) throw new Error("analysis failed");
    return results;
}

describe("seed summaries", () => {
    it("summarizes every generated ante in order", () => {
        const summary = summarizeSeed("WEEJOKER", analyze("WEEJOKER", 4), 5);
        expect(summary.antes.map((a) => a.ante)).toEqual([1, 2, 3, 4]);
        for (const ante of summary.antes) {
            expect(ante.shop.length).toBeLessThanOrEqual(5);
            expect(ante.shopSize).toBe(20);
            expect(typeof ante.boss).toBe("string");
            expect(ante.packs.length).toBeGreaterThan(0);
        }
    });

    it("finds items where the ante details say they are", () => {
        const results = analyze("WEEJOKER");
        const ante1 = describeAnte(results.antes[1]);
        const first = ante1.shop[0];
        const bare = first.item.replace(/ \(.*\)$/, "");
        const hits = findItems(results, [bare])[bare];
        expect(hits.some((h) => h.ante === 1 && h.source === "shop" && h.index === 0)).toBe(true);
    });

    it("returns empty matches for unknown names", () => {
        expect(findItems(analyze("WEEJOKER"), ["Definitely Not A Card"])).toEqual({ "Definitely Not A Card": [] });
    });
});

describe("parseSeedList", () => {
    it("accepts newline, comma and whitespace separated seeds and dedupes", () => {
        expect(parseSeedList("aleeb\nPIROCKS weejoker\naleeb")).toEqual(["ALEEB", "PIROCKS", "WEEJOKER"]);
    });

    it("takes the first column of CSV rows and skips a seed header", () => {
        expect(parseSeedList("seed,score\nFAJK8SAR, 11, 1, 0\n16661,2")).toEqual(["FAJK8SAR", "16661"]);
    });

    it("sanitizes zeros and junk", () => {
        expect(parseSeedList("a0b-c!d 123456789ABC")).toEqual(["AOBCD", "12345678"]);
    });
});
