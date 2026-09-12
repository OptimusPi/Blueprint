import { LOCATIONS, LOCATION_TYPES } from "../const.ts";
import { BuyMetaData } from "../classes/BuyMetaData.ts";
import { parseSeedList, useCardStore } from "../state/store.ts";
import { analyzeSeedFromStore } from "../state/analysisResultProvider.tsx";
import { sanitizeSeed } from "../utils.ts";
import { describeAnte, findItems, summarizeSeed } from "./summary.ts";
import { listMemory, remember } from "./memory.ts";
import type { Blinds } from "../state/store.ts";
import type { BlueprintTool } from "./registry.ts";
import type { CardTuple } from "../GameEngine/CardEngines/Cards.ts";

const DECKS = [
    "Red Deck", "Blue Deck", "Yellow Deck", "Green Deck", "Black Deck", "Magic Deck", "Nebula Deck",
    "Ghost Deck", "Abandoned Deck", "Checkered Deck", "Zodiac Deck", "Painted Deck", "Anaglyph Deck",
    "Plasma Deck", "Erratic Deck",
];
const STAKES = ["White Stake", "Red Stake", "Green Stake", "Black Stake", "Blue Stake"];
const BLINDS: Array<Blinds> = ["smallBlind", "bigBlind", "bossBlind"];

function normalizeName(value: unknown, options: Array<string>, suffix: string): string | undefined {
    if (typeof value !== "string" || !value.trim()) return undefined;
    const wanted = value.trim().toLowerCase().replace(new RegExp(`\\s*${suffix}$`), "");
    return options.find((option) => option.toLowerCase().replace(new RegExp(`\\s*${suffix}$`), "") === wanted);
}

function currentAnalysis(seed?: unknown) {
    const target = typeof seed === "string" && seed.trim() ? sanitizeSeed(seed) : undefined;
    const results = analyzeSeedFromStore(target);
    if (!results) throw new Error("No seed is loaded. Call analyze_seed with a seed first.");
    return { seed: target ?? useCardStore.getState().engineState.seed, results };
}

function anteNumber(value: unknown): number {
    const ante = Math.trunc(Number(value));
    if (!Number.isFinite(ante) || ante < 0) throw new Error("ante must be a non-negative integer");
    return ante;
}

function appState() {
    const s = useCardStore.getState();
    return {
        seed: s.engineState.seed,
        deck: s.engineState.deck,
        stake: s.engineState.stake,
        maxAnte: s.engineState.maxAnte,
        cardsPerAnte: s.engineState.cardsPerAnte,
        gameVersion: s.engineState.gameVersion,
        view: s.applicationState.viewMode,
        analyzed: s.applicationState.start && !!s.engineState.seed,
        selectedAnte: s.applicationState.selectedAnte,
        selectedBlind: s.applicationState.selectedBlind,
        purchases: Object.keys(s.shoppingState.buys).length,
        seedQueue: { count: s.seedQueue.seeds.length, index: s.seedQueue.index },
        memory: listMemory(),
    };
}

export const blueprintTools: Array<BlueprintTool> = [
    {
        name: "get_app_state",
        description: "Current Blueprint state: loaded seed, deck, stake, ante range, active view, selected ante/blind, purchase count, seed queue position, and saved user notes.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        execute: () => appState(),
    },
    {
        name: "analyze_seed",
        description: "Load a Balatro seed into Blueprint and analyze it (shop queues, packs, vouchers, tags, bosses per ante). Optionally set deck, stake and how many antes to generate. Returns a compact per-ante overview.",
        inputSchema: {
            type: "object",
            properties: {
                seed: { type: "string", description: "1-8 characters, A-Z and 1-9 (no zero)." },
                deck: { type: "string", enum: DECKS },
                stake: { type: "string", enum: STAKES },
                maxAnte: { type: "integer", minimum: 1, maximum: 39 },
            },
            required: ["seed"],
            additionalProperties: false,
        },
        execute: (input) => {
            const seed = sanitizeSeed(String(input.seed ?? ""));
            if (!seed) throw new Error("seed must contain at least one of A-Z or 1-9");
            const s = useCardStore.getState();
            const deck = normalizeName(input.deck, DECKS, "deck");
            const stake = normalizeName(input.stake, STAKES, "stake");
            if (deck) s.setDeck(deck);
            if (stake) s.setStake(stake);
            if (input.maxAnte !== undefined) s.setMaxAnte(Math.max(1, Math.min(39, anteNumber(input.maxAnte))));
            s.setSeed(seed);
            if (s.applicationState.viewMode === "jaml") s.setViewMode("blueprint");
            s.setStart(true);
            s.setSelectedAnte(1);
            const results = analyzeSeedFromStore(seed);
            if (!results) throw new Error("Analysis failed for that seed");
            return summarizeSeed(seed, results, 8);
        },
    },
    {
        name: "get_seed_overview",
        description: "Per-ante overview of the loaded seed (or a given seed without loading it): boss, voucher, tags, first shop items and every booster pack with its contents.",
        inputSchema: {
            type: "object",
            properties: {
                seed: { type: "string", description: "Defaults to the loaded seed." },
                shopLimit: { type: "integer", minimum: 1, maximum: 100, description: "Shop items to include per ante (default 12)." },
            },
            additionalProperties: false,
        },
        execute: (input) => {
            const { seed, results } = currentAnalysis(input.seed);
            return summarizeSeed(seed, results, input.shopLimit ? anteNumber(input.shopLimit) : 12);
        },
    },
    {
        name: "get_ante_details",
        description: "Everything Blueprint knows about one ante: full shop queue with indices, packs per blind with card indices, misc card sources (Riff-raff, Judgement, Wraith, The Soul...), tags, voucher, boss.",
        inputSchema: {
            type: "object",
            properties: {
                ante: { type: "integer", minimum: 0, maximum: 39 },
                seed: { type: "string", description: "Defaults to the loaded seed." },
            },
            required: ["ante"],
            additionalProperties: false,
        },
        execute: (input) => {
            const { results } = currentAnalysis(input.seed);
            const ante = results.antes[anteNumber(input.ante)];
            if (!ante) throw new Error(`Ante ${input.ante} is outside the generated range. Increase maxAnte with analyze_seed.`);
            return describeAnte(ante);
        },
    },
    {
        name: "find_items",
        description: "Search the loaded seed (or a given seed) for jokers, consumables, vouchers, tags or bosses by name (case-insensitive substring). Returns where each appears: ante, shop index, pack, or misc source. Legendary jokers (Perkeo, Triboulet, Yorick, Chicot, Canio) only resolve when showCardSpoilers is on (set_options); otherwise search for 'The Soul'.",
        inputSchema: {
            type: "object",
            properties: {
                names: { type: "array", items: { type: "string" }, minItems: 1, description: "e.g. [\"Perkeo\", \"Diet Cola\", \"Negative Tag\", \"Ankh\"]" },
                seed: { type: "string", description: "Defaults to the loaded seed." },
            },
            required: ["names"],
            additionalProperties: false,
        },
        execute: (input) => {
            const { seed, results } = currentAnalysis(input.seed);
            const names = Array.isArray(input.names) ? input.names.map(String) : [String(input.names)];
            return { seed, matches: findItems(results, names) };
        },
    },
    {
        name: "go_to_ante",
        description: "Navigate the Blueprint view to an ante and optionally a blind so the user sees it.",
        inputSchema: {
            type: "object",
            properties: {
                ante: { type: "integer", minimum: 0, maximum: 39 },
                blind: { type: "string", enum: BLINDS },
            },
            required: ["ante"],
            additionalProperties: false,
        },
        execute: (input) => {
            const s = useCardStore.getState();
            s.setSelectedAnte(anteNumber(input.ante));
            if (typeof input.blind === "string" && BLINDS.includes(input.blind as Blinds)) s.setSelectedBlind(input.blind as Blinds);
            return { selectedAnte: s.applicationState.selectedAnte, selectedBlind: useCardStore.getState().applicationState.selectedBlind };
        },
    },
    {
        name: "buy_item",
        description: "Mark a shop item or pack card as purchased in the loaded seed. Purchases change later RNG exactly like the game, so re-read the overview afterwards. Use indices from get_ante_details.",
        inputSchema: {
            type: "object",
            properties: {
                ante: { type: "integer", minimum: 0, maximum: 39 },
                source: { type: "string", enum: ["shop", "pack"] },
                index: { type: "integer", minimum: 0, description: "Shop queue index, or card index inside the pack." },
                blind: { type: "string", enum: BLINDS, description: "Required for packs." },
                packIndex: { type: "integer", minimum: 0, description: "Required for packs: pack position within the blind." },
            },
            required: ["ante", "source", "index"],
            additionalProperties: false,
        },
        execute: (input) => {
            const s = useCardStore.getState();
            const { results } = currentAnalysis();
            const anteNum = anteNumber(input.ante);
            const ante = results.antes[anteNum];
            if (!ante) throw new Error(`Ante ${anteNum} is not generated`);
            const index = anteNumber(input.index);
            const blind = (typeof input.blind === "string" && BLINDS.includes(input.blind as Blinds) ? input.blind : s.applicationState.selectedBlind) as Blinds;
            let buy: BuyMetaData;
            if (input.source === "shop") {
                const card = ante.queue[index] as CardTuple | undefined;
                if (!card) throw new Error(`No shop item at index ${index} in ante ${anteNum}`);
                buy = new BuyMetaData({
                    location: LOCATIONS.SHOP,
                    locationType: LOCATION_TYPES.SHOP,
                    index,
                    ante: String(anteNum),
                    blind,
                    card,
                    name: card.name,
                });
            } else {
                const packIndex = anteNumber(input.packIndex);
                const pack = ante.blinds[blind].packs[packIndex];
                const card = pack?.cards[index];
                if (!pack || !card) throw new Error(`No pack card at pack ${packIndex}, card ${index} in ante ${anteNum} ${blind}`);
                buy = new BuyMetaData({
                    location: pack.name,
                    locationType: LOCATION_TYPES.PACK,
                    index,
                    packIndex,
                    ante: String(anteNum),
                    blind,
                    card,
                    name: card.name,
                });
            }
            s.addBuy(buy);
            s.setSelectedAnte(anteNum);
            s.setSelectedBlind(blind);
            return { bought: buy.name, ante: anteNum, blind, source: input.source, index };
        },
    },
    {
        name: "set_options",
        description: "Change analysis options. showCardSpoilers reveals what The Soul, Judgement and Wraith give (legendary jokers show as 'The Soul' until it is on). cardsPerAnte is how deep each shop queue is generated; maxMiscCardSource how many cards each misc source lists. The seed is re-analyzed.",
        inputSchema: {
            type: "object",
            properties: {
                showCardSpoilers: { type: "boolean" },
                cardsPerAnte: { type: "integer", minimum: 1, maximum: 1000 },
                maxMiscCardSource: { type: "integer", minimum: 1, maximum: 100 },
            },
            additionalProperties: false,
        },
        execute: (input) => {
            const s = useCardStore.getState();
            if (typeof input.showCardSpoilers === "boolean") s.setShowCardSpoilers(input.showCardSpoilers);
            if (input.cardsPerAnte !== undefined) s.setCardsPerAnte(Math.max(1, Math.min(1000, anteNumber(input.cardsPerAnte))));
            if (input.maxMiscCardSource !== undefined) s.setMiscMaxSource(Math.max(1, Math.min(100, anteNumber(input.maxMiscCardSource))));
            const next = useCardStore.getState();
            return {
                showCardSpoilers: next.applicationState.showCardSpoilers,
                cardsPerAnte: next.engineState.cardsPerAnte,
                maxMiscCardSource: next.applicationState.maxMiscCardSource,
            };
        },
    },
    {
        name: "list_purchases",
        description: "List every purchase the user has marked in the loaded seed.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        execute: () =>
            Object.values(useCardStore.getState().shoppingState.buys).map((buy) => ({
                name: buy.name,
                ante: Number(buy.ante),
                blind: buy.blind,
                location: buy.location,
                index: buy.index,
                packIndex: buy.packIndex,
            })),
    },
    {
        name: "clear_purchases",
        description: "Remove every marked purchase from the loaded seed.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        execute: () => {
            useCardStore.getState().setBuys({});
            return { cleared: true };
        },
    },
    {
        name: "load_seed_list",
        description: "Load many seeds into the seed queue (one per line, whitespace or comma separated; CSV first column). The first seed is analyzed immediately; the user steps through the rest with the arrow keys.",
        inputSchema: {
            type: "object",
            properties: { seeds: { type: "string", description: "Raw text containing the seeds." } },
            required: ["seeds"],
            additionalProperties: false,
        },
        execute: (input) => {
            const seeds = parseSeedList(String(input.seeds ?? ""));
            if (seeds.length === 0) throw new Error("No valid seeds found");
            useCardStore.getState().setSeedQueue(seeds);
            return { loaded: seeds.length, first: seeds[0] };
        },
    },
    {
        name: "step_seed_queue",
        description: "Move through the loaded seed queue: delta of +1/-1 steps, or an absolute index. Loads and analyzes that seed.",
        inputSchema: {
            type: "object",
            properties: {
                delta: { type: "integer" },
                index: { type: "integer", minimum: 0 },
            },
            additionalProperties: false,
        },
        execute: (input) => {
            const s = useCardStore.getState();
            if (s.seedQueue.seeds.length === 0) throw new Error("Seed queue is empty. Call load_seed_list first.");
            if (input.index !== undefined) s.jumpSeedQueue(anteNumber(input.index));
            else s.stepSeedQueue(Math.trunc(Number(input.delta ?? 1)) || 1);
            const q = useCardStore.getState().seedQueue;
            return { index: q.index, count: q.seeds.length, seed: q.seeds[q.index] };
        },
    },
    {
        name: "set_view",
        description: "Switch the main view: 'blueprint' (seed explorer) or 'jaml' (JAML seed search IDE).",
        inputSchema: {
            type: "object",
            properties: { view: { type: "string", enum: ["blueprint", "jaml"] } },
            required: ["view"],
            additionalProperties: false,
        },
        execute: (input) => {
            const view = input.view === "jaml" ? "jaml" : "blueprint";
            useCardStore.getState().setViewMode(view);
            return { view };
        },
    },
    {
        name: "remember",
        description: "Save a short note about this user (favourite decks, strategies they like, seeds they are hunting). Notes persist in their browser and are shown to every future assistant session.",
        inputSchema: {
            type: "object",
            properties: { note: { type: "string", minLength: 1, maxLength: 300 } },
            required: ["note"],
            additionalProperties: false,
        },
        execute: (input) => ({ notes: remember(String(input.note ?? "")) }),
    },
];
