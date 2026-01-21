// Pure TypeScript types for Blueprint simulation results
// Replaces the legacy ImmolateWrapper compatibility layer

export interface SimulatedCard {
    name: string;
    type: string;
    edition?: string;
    // Extended properties for specific card types
    rarity?: number;
    isEternal?: boolean;
    isPerishable?: boolean;
    isRental?: boolean;
    rank?: string;
    suit?: string;
    base?: string;
}

export interface SimulatedPack {
    name: string;
    cards: SimulatedCard[];
}

export interface SimulatedMiscSource {
    name: string;
    cards: SimulatedCard[];
}

export interface SimulatedAnte {
    ante: number;
    boss: string | null;
    voucher: string | null;
    tags: string[];
    queue: SimulatedCard[];
    blinds: {
        smallBlind: { packs: SimulatedPack[] };
        bigBlind: { packs: SimulatedPack[] };
        bossBlind: { packs: SimulatedPack[] };
    };
    // Legacy compatibility - packs array (same as blinds.bossBlind.packs)
    packs?: SimulatedPack[];
    miscCardSources: SimulatedMiscSource[];
    wheelQueue: SimulatedCard[];
    auraQueue: SimulatedCard[];
    deckDraws: { [key: string]: SimulatedCard[] };
    // Additional queues for lookahead
    voucherQueue?: string[];
    bossQueue?: string[];
    tagsQueue?: string[];
    packQueue?: string[];
}

export interface SimulatedRun {
    antes: { [key: number]: SimulatedAnte };
}

export interface AnalysisSettings {
    seed: string;
    deck: string;
    stake: string;
    gameVersion: string;
    antes: number;
    cardsPerAnte: number;
}

export interface AnalysisOptions {
    maxMiscCardSource?: number;
    showCardSpoilers: boolean;
    unlocks: string[];
    events: any[];
    updates: any[];
    buys: any;
    sells: any;
    lockedCards: any;
}
