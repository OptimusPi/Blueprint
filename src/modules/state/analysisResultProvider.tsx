import React, { createContext, useContext, useMemo } from "react";


import { useCardStore } from "./store.ts";
import { useSeedOptionsContainer } from "./optionsProvider.tsx";
import { SeedResultsContainer } from "../GameEngine/CardEngines/Cards.ts";
import { analyzeSeed } from "../GameEngine/index.ts";

export const SeedResultContext = createContext<SeedResultsContainer | null | undefined>(null);

export function useSeedResultsContainer() {
    const context = useContext(SeedResultContext);
    if (context === null) {
        throw new Error("useSeedResultsContainer must be used within a SeedResultProvider");
    }
    return context;
}


// Simple in-memory cache
const resultCache = new Map<string, SeedResultsContainer>();

// Helper to generate a cache key from all influential state
function getCacheKey(state: any, options: any, seed: string) {
    // We exclude seed from the base state object and append it explicitly
    const { seed: _, ...restState } = state;
    return JSON.stringify({ ...restState, options, seed });
}

export function SeedResultProvider({ children }: { children: React.ReactNode }) {
    const start = useCardStore(state => state.applicationState.start);
    const analyzeState = useCardStore(state => state.engineState);
    const options = useSeedOptionsContainer();

    const seedResult = useMemo(() => {
        if (!start) {
            return undefined;
        }

        const cacheKey = getCacheKey(analyzeState, options, analyzeState.seed);

        if (resultCache.has(cacheKey)) {
            return resultCache.get(cacheKey);
        }

        // Analyze and cache
        const result = analyzeSeed(analyzeState, {
            ...options,
            customDeck: analyzeState.deck
        });
        if (result) {
            resultCache.set(cacheKey, result);
        }
        return result;
    }, [analyzeState, deckState.cards, options, start]);

    // Expose a way to pre-warm the cache from other components
    // We attach this to the window or export a hook, but for now, 
    // passing it via context or just exporting a function that reads the store might be cleaner.
    // For simplicity in this specialized app, we'll keep the cache global.

    return (
        <SeedResultContext.Provider value={seedResult}>
                {children}
        </SeedResultContext.Provider>
    )
}

export function prefetchSeedAnalysis(seed: string, state: any, options: any) {
    const cacheKey = getCacheKey(state, options, seed);
    if (resultCache.has(cacheKey)) return; // Already cached

    // Create a version of state with the new seed
    const newState = { ...state, seed };
    const result = analyzeSeed(newState, options);
    if (result) {
        resultCache.set(cacheKey, result);
    }
}
