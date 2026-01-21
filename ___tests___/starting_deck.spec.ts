import { describe, expect, test } from "vitest";
import { Game } from "../src/modules/balatrots/Game";
import { InstanceParams } from "../src/modules/balatrots/struct/InstanceParams";
import { Deck, DeckType } from "../src/modules/balatrots/enum/Deck";
import { Stake, StakeType } from "../src/modules/balatrots/enum/Stake";

describe("TDD: Multi-Deck & Full Draw Verification (ALEEB)", () => {
    const seed = "ALEEB";
    const stake = new Stake(StakeType.WHITE_STAKE);

    test("Standard Red Deck: Full 52 card draw order", () => {
        const deck = new Deck(DeckType.RED_DECK);
        const game = new Game(seed, new InstanceParams(deck, stake));
        const draw = game.getDeckDraw(1, 1, 52);

        expect(draw.length).toBe(52);

        const names = draw.map(c => c.getName());
        // User will verify this sequence
        console.log("Full 52 (Red Deck):", JSON.stringify(names));

        // Starting 8 (Verified Truth)
        expect(names.slice(0, 8)).toEqual([
            "D_T", "H_4", "S_7", "C_T", "D_2", "S_9", "H_6", "H_5"
        ]);

        // TODO: Add full 52 expectation once user confirms order
    });

    test("Abandoned Deck: Starting 8 cards (No Face Cards)", () => {
        const deck = new Deck(DeckType.ABANDONED_DECK);
        const game = new Game(seed, new InstanceParams(deck, stake));
        const draw = game.getDeckDraw(1, 1, 8);

        // Abandoned deck has 40 cards.
        // If logic is correct, it should shuffle the 40 non-face cards using 'nr1'.
        const names = draw.map(c => c.getName());
        console.log("Abandoned 8:", JSON.stringify(names));

        expect(names).toEqual(["D_T", "H_3", "S_5", "C_T", "D_2", "S_6", "H_4", "S_A"]);
    });

    test("Checkered Deck: Starting 8 cards (Hearts/Spades Only)", () => {
        const deck = new Deck(DeckType.CHECKERED_DECK);
        const game = new Game(seed, new InstanceParams(deck, stake));
        const draw = game.getDeckDraw(1, 1, 8);

        const names = draw.map(c => c.getName());
        console.log("Checkered 8:", JSON.stringify(names));

        expect(names).toEqual(["H_T", "S_3", "S_J", "H_8", "H_8", "S_K", "S_4", "S_3"]);
    });

    test("Erratic Deck: Starting 8 cards (Randomized Composition)", () => {
        const deck = new Deck(DeckType.ERRATIC_DECK);
        const game = new Game(seed, new InstanceParams(deck, stake));
        const draw = game.getDeckDraw(1, 1, 8);

        const names = draw.map(c => c.getName());
        console.log("Erratic 8 (Round 1):", JSON.stringify(names));

        // Result from refined sorted Erratic construction logic
        expect(names).toEqual(["D_Q", "H_3", "S_7", "C_K", "C_T", "S_8", "H_5", "H_3"]);
    });

    test("Sequential Rounds: Unique Shuffles for ALEEB", () => {
        const deck = new Deck(DeckType.RED_DECK);
        const game = new Game(seed, new InstanceParams(deck, stake));

        const draw1 = game.getDeckDraw(1, 1, 8).map(c => c.getName());
        const draw2 = game.getDeckDraw(1, 2, 8).map(c => c.getName());
        const draw3 = game.getDeckDraw(1, 3, 8).map(c => c.getName());

        console.log("Round 1:", JSON.stringify(draw1));
        console.log("Round 2:", JSON.stringify(draw2));
        console.log("Round 3:", JSON.stringify(draw3));

        // Verify they are distinct
        expect(draw1).not.toEqual(draw2);
        expect(draw1).not.toEqual(draw3);
        expect(draw2).not.toEqual(draw3);

        // Verification of literal values for ALEEB Round 1 (matches Red Deck test)
        expect(draw1).toEqual(["D_T", "H_4", "S_7", "C_T", "D_2", "S_9", "H_6", "H_5"]);
    });
});
