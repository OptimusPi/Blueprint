import { beforeEach, describe, expect, it } from "vitest";
import { analyzeSeed } from "../src/modules/GameEngine";
import { readSeedQueueFromUrl, startingDeckCards, useCardStore } from "../src/modules/state/store";

function createMemoryStorage() {
    const store = new Map<string, string>();
    return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value); },
        removeItem: (key: string) => { store.delete(key); },
        clear: () => { store.clear(); },
    };
}

function setMockUrl(search: string) {
    const storage = createMemoryStorage();
    const url = new URL(`https://optimuspi.github.io/Blueprint/${search.startsWith("?") ? search : `?${search}`}`);
    const win = {
        location: {
            href: url.href,
            pathname: url.pathname,
            search: url.search,
            hash: url.hash,
        },
        history: {
            replaceState: (_state: unknown, _title: string, newUrl: string) => {
                const parsed = new URL(newUrl, "https://optimuspi.github.io");
                win.location.href = parsed.href;
                win.location.pathname = parsed.pathname;
                win.location.search = parsed.search;
                win.location.hash = parsed.hash;
            },
        },
    };
    Object.defineProperty(globalThis, "window", { value: win, configurable: true, writable: true });
    Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
    return { win, storage };
}

const TARGET_URL_SEARCH =
    "?seed=2AEXJ8R4&deck=Ghost+Deck&minAnte=0&maxAnte=23&stake=White+Stake&view=blueprint&ante=13&seeds=H5EDBW98%2CH8Q7DP6A%2CQVG94XB9%2CBWL8Y8Q7%2C1OSKQDO4%2C2AEXJ8R4%2CWMP83CD9%2CK42QBSR7%2CD3NFNP84%2CYR98CK4B%2CB6KMWI3A%2CMY11ZZV9%2CR5UN8XP8%2CN8C7JZGA%2C6LV5EOVA%2C1B416Y25%2CA5QT9QV9%2C4UCRNNS5%2C46GQQL55%2CTUUXMLYA&seedIndex=5";

describe("URL and seedQueue hydration", () => {
    beforeEach(() => {
        setMockUrl("");
    });

    it("hydrates seed, deck, stake, minAnte, maxAnte, ante=13, selectedBlind, deckState, and 20-seed queue at index 5", async () => {
        const { win } = setMockUrl(TARGET_URL_SEARCH);

        const queue = readSeedQueueFromUrl();
        expect(queue).not.toBeNull();
        expect(queue?.seeds).toHaveLength(20);
        expect(queue?.index).toBe(5);
        expect(queue?.seeds[5]).toBe("2AEXJ8R4");

        await useCardStore.persist.rehydrate();
        const state = useCardStore.getState();

        expect(state.engineState.seed).toBe("2AEXJ8R4");
        expect(state.engineState.deck).toBe("Ghost Deck");
        expect(state.engineState.stake).toBe("White Stake");
        expect(state.engineState.minAnte).toBe(0);
        expect(state.engineState.maxAnte).toBe(23);
        expect(state.applicationState.viewMode).toBe("blueprint");
        expect(state.applicationState.selectedAnte).toBe(13);
        expect(state.applicationState.selectedBlind).toBe("smallBlind");
        expect(state.applicationState.start).toBe(true);
        expect(state.seedQueue.seeds).toHaveLength(20);
        expect(state.seedQueue.index).toBe(5);
        expect(state.deckState.isInitialized).toBe(true);
        expect(state.deckState.cards).toHaveLength(52);

        // Stepping the queue updates seed, seedIndex, and preserves ante=13 and seeds list in URL
        state.stepSeedQueue(1);
        const afterStep = useCardStore.getState();
        expect(afterStep.seedQueue.index).toBe(6);
        expect(afterStep.engineState.seed).toBe("WMP83CD9");
        expect(afterStep.applicationState.selectedAnte).toBe(13);

        const params = new URLSearchParams(win.location.search);
        expect(params.get("seed")).toBe("WMP83CD9");
        expect(params.get("seedIndex")).toBe("6");
        expect(params.get("ante")).toBe("13");
        expect(params.get("maxAnte")).toBe("23");
        expect(params.get("seeds")?.split(",")).toHaveLength(20);
    });

    it("analyzes seed 2AEXJ8R4 across antes 0..23 without error", () => {
        const customDeck = startingDeckCards("2AEXJ8R4", {
            deck: "Ghost Deck",
            stake: "White Stake",
            showmanOwned: false,
            gameVersion: "10106",
        });
        const results = analyzeSeed(
            {
                seed: "2AEXJ8R4",
                deck: "Ghost Deck",
                stake: "White Stake",
                gameVersion: "10106",
                antes: 23,
                cardsPerAnte: 50,
            },
            {
                buys: {},
                sells: {},
                showCardSpoilers: false,
                unlocks: [],
                events: [],
                customDeck,
            }
        );
        expect(results).toBeDefined();
        expect(Object.keys(results!.antes)).toHaveLength(24); // 0..23
        expect(results!.antes[0]).toBeDefined();
        expect(results!.antes[13]).toBeDefined();
        expect(results!.antes[23]).toBeDefined();
        expect(results!.antes[13].tags).toHaveLength(2);
        expect(results!.antes[13].blinds.smallBlind.packs).toHaveLength(2);
    });

    it("preserves ante=0 in the URL when selectedAnte is set to 0", async () => {
        const { win } = setMockUrl(TARGET_URL_SEARCH);
        await useCardStore.persist.rehydrate();

        useCardStore.getState().setSelectedAnte(0);
        expect(useCardStore.getState().applicationState.selectedAnte).toBe(0);
        expect(useCardStore.getState().applicationState.selectedBlind).toBe("smallBlind");

        const params = new URLSearchParams(win.location.search);
        expect(params.get("ante")).toBe("0");
    });

    it("clamps selectedAnte when maxAnte is lowered below current selectedAnte", async () => {
        setMockUrl(TARGET_URL_SEARCH);
        await useCardStore.persist.rehydrate();
        expect(useCardStore.getState().applicationState.selectedAnte).toBe(13);

        useCardStore.getState().setMaxAnte(8);
        expect(useCardStore.getState().engineState.maxAnte).toBe(8);
        expect(useCardStore.getState().applicationState.selectedAnte).toBe(8);
    });

    it("does not overwrite an explicit URL seed with a stale localStorage seedQueue", async () => {
        const { storage } = setMockUrl("?seed=2AEXJ8R4&deck=Ghost+Deck&maxAnte=8&stake=White+Stake");
        storage.setItem("blueprint-seed-queue", JSON.stringify({ seeds: ["ALEEB", "PIROCKS"], index: 0 }));

        await useCardStore.persist.rehydrate();
        const state = useCardStore.getState();
        expect(state.engineState.seed).toBe("2AEXJ8R4");
        expect(state.seedQueue.seeds).toEqual([]);
    });
});
