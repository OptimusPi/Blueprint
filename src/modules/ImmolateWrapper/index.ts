import { RunSimulator } from "../balatrots/RunSimulator";
import { SimulationResult } from "../balatrots/SimulationTypes";
import { Ante, SeedResultsContainer, Stringifies } from "./CardEngines/Cards";

export interface AnalyzeSettings {
    seed: string;
    deck: string;
    stake: string;
    gameVersion: string;
    antes: number;
    cardsPerAnte: number;
}

export interface AnalyzeOptions {
    maxMiscCardSource: number;
    showCardSpoilers: boolean;
    unlocks: string[];
    events: any[];
    updates: any[];
    buys: any;
    sells: any;
    lockedCards: any;
}

export function analyzeSeed(settings: AnalyzeSettings, options: AnalyzeOptions): SeedResultsContainer {
    const simResult = RunSimulator.simulate({
        seed: settings.seed,
        deck: settings.deck,
        stake: settings.stake,
        maxAnte: settings.antes,
        version: parseInt(settings.gameVersion) || 10103,
        showCardSpoilers: options.showCardSpoilers
    });

    const container = new SeedResultsContainer();

    // Map SimulationResult back to the legacy SeedResultsContainer for UI compatibility
    for (const [anteNum, simAnte] of Object.entries(simResult.antes)) {
        const ante = new Ante(parseInt(anteNum));
        ante.boss = simAnte.boss;
        ante.voucher = simAnte.vouchers[0] || null;
        ante.tags = simAnte.tags;

        // Map shop queue
        ante.queue = simAnte.shopQueue.map(c => ({
            name: c.name,
            type: c.type,
            edition: c.edition
        }));

        // Map packs
        ante.blinds.bossBlind.packs = simAnte.packs.map(p => ({
            name: p.name.replace(" Pack", ""),
            cards: p.cards.map(c => ({
                name: c.name,
                type: c.type,
                edition: c.edition
            }))
        }));

        // Map misc sources
        ante.miscCardSources = simAnte.miscCardSources.map(s => ({
            name: s.name,
            cards: s.cards.map(c => ({
                name: c.name,
                type: c.type,
                edition: c.edition
            }))
        }));

        ante.deckDraws = simAnte.deckDraws;

        container.antes[parseInt(anteNum)] = ante;
    }

    return container;
}

export class CardEngineWrapper {
    static printAnalysis(results: SeedResultsContainer): string {
        let output = "";
        for (const [anteNum, ante] of Object.entries(results.antes)) {
            output += `Ante ${anteNum}:\n`;
            output += `  Boss: ${ante.boss}\n`;
            output += `  Voucher: ${ante.voucher}\n`;
            output += `  Tags: ${ante.tags.join(", ")}\n`;
            output += `  Voucher: ${ante.voucher}\n`;
            output += `  Shop Queue:\n`;
            ante.queue.forEach(item => {
                output += `    - ${item.name} (${item.type})${item.edition ? ` [${item.edition}]` : ""}\n`;
            });
            output += "\n";
        }
        return output;
    }
}
