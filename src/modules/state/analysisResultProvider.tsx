import React, { createContext, useContext, useMemo } from "react";


import { analyzeSeed } from "../GameEngine/index.ts";
import { startingDeckCards, useCardStore } from "./store.ts";
import { useSeedOptionsContainer } from "./optionsProvider.tsx";
import type { AnalyzeOptions } from "../GameEngine/index.ts";
import type { InitialState } from "./store.ts";
import type { OptionsProviderProps } from "./optionsProvider.tsx";
import type { DeckCard } from "../deckUtils.ts";
import type { SeedResultsContainer } from "../GameEngine/CardEngines/Cards.ts";

export const SeedResultContext = createContext<SeedResultsContainer | null | undefined>(null);

export function useSeedResultsContainer() {
    const context = useContext(SeedResultContext);
    if (context === null) {
        throw new Error("useSeedResultsContainer must be used within a SeedResultProvider");
    }
    return context;
}

const resultCache = new Map<string, SeedResultsContainer>();

type EngineState = InitialState['engineState'];

function getCacheKey(state: EngineState, options: AnalyzeOptions, seed: string) {
    const { seed: _seed, ...restState } = state;
    return JSON.stringify({ ...restState, options, seed });
}

function runAnalysis(state: EngineState, options: AnalyzeOptions, seed: string) {
    const cacheKey = getCacheKey(state, options, seed);
    const cached = resultCache.get(cacheKey);
    if (cached) return cached;
    const result = analyzeSeed({ ...state, seed, antes: state.maxAnte }, options);
    if (result) resultCache.set(cacheKey, result);
    return result;
}

function optionsFromStore(): AnalyzeOptions {
    const s = useCardStore.getState();
    return {
        maxMiscCardSource: s.applicationState.maxMiscCardSource,
        showCardSpoilers: s.applicationState.showCardSpoilers,
        unlocks: s.engineState.selectedOptions,
        events: s.eventState.events,
        updates: [],
        buys: s.shoppingState.buys,
        sells: s.shoppingState.sells,
        lockedCards: s.lockState.lockedCards,
        customDeck: s.deckState.cards,
    };
}

function optionsForSeed(seed: string, state: EngineState): AnalyzeOptions {
    const options = optionsFromStore();
    if (seed === state.seed) return options;
    return { ...options, buys: {}, sells: {}, customDeck: startingDeckCards(seed, state) };
}

export function analyzeSeedFromStore(seed?: string, overrides?: Partial<EngineState>) {
    const state = { ...useCardStore.getState().engineState, ...overrides };
    const target = seed ?? state.seed;
    if (!target) return undefined;
    return runAnalysis(state, optionsForSeed(target, state), target);
}

export function prefetchSeedAnalysis(seed: string) {
    const state = useCardStore.getState().engineState;
    runAnalysis(state, optionsForSeed(seed, state), seed);
}

export function SeedResultProvider({ children }: { children: React.ReactNode }) {
    const start = useCardStore(state => state.applicationState.start);
    const analyzeState = useCardStore(state => state.engineState);
    const deckCards = useCardStore(state => state.deckState.cards);
    const options = useSeedOptionsContainer();

    const seedResult = useMemo(() => {
        if (!start) {
            return undefined;
        }
        return runAnalysis(analyzeState, toAnalyzeOptions(options, deckCards), analyzeState.seed);
    }, [analyzeState, deckCards, options, start]);

    return (
        <SeedResultContext.Provider value={seedResult}>
                {children}
        </SeedResultContext.Provider>
    )
}

function toAnalyzeOptions(options: OptionsProviderProps, customDeck: Array<DeckCard>): AnalyzeOptions {
    return { ...options, customDeck };
}
