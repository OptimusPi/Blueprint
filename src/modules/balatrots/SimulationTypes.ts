import { RNGSource } from "./enum/QueueName";

/**
 * Basic card information for UI consumption
 */
export interface SimulatedCard {
    name: string;
    type: string;
    edition?: string;
    seal?: string;
    rarity?: number;
    isEternal?: boolean;
    isPerishable?: boolean;
    isRental?: boolean;
}

/**
 * Pack information during a run
 */
export interface SimulatedPack {
    name: string;
    kind: string;
    size: number;
    choices: number;
    cards: SimulatedCard[];
}

/**
 * Miscellaneous source data (Riff Raff, Tags, etc.)
 */
export interface SimulatedMiscSource {
    name: string;
    source: string | RNGSource;
    cards: SimulatedCard[];
}

/**
 * Data for a single Ante in the simulation
 */
export interface SimulatedAnte {
    ante: number;
    boss: string;
    vouchers: string[];
    tags: string[];
    shopQueue: SimulatedCard[];
    packs: SimulatedPack[];
    miscCardSources: SimulatedMiscSource[];
    deckDraws: Record<string, SimulatedCard[]>;
}

/**
 * The final result of a run simulation
 */
export interface SimulationResult {
    seed: string;
    deck: string;
    stake: string;
    version: number;
    antes: Record<number, SimulatedAnte>;
}
