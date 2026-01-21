import { RunSimulator } from "../balatrots/RunSimulator";
import type {
    SimulatedRun,
    SimulatedAnte,
    SimulatedCard,
    SimulatedPack,
    AnalysisSettings,
    AnalysisOptions
} from "./types";

export type {
    SimulatedRun,
    SimulatedAnte,
    SimulatedCard,
    SimulatedPack,
    AnalysisSettings,
    AnalysisOptions
};

/**
 * Analyzes a Balatro seed and returns simulation results
 */
export function analyzeSeed(settings: AnalysisSettings, options: AnalysisOptions): SimulatedRun {
    const simResult = RunSimulator.simulate({
        seed: settings.seed,
        deck: settings.deck,
        stake: settings.stake,
        maxAnte: settings.antes,
        version: parseInt(settings.gameVersion) || 10103,
        showCardSpoilers: options.showCardSpoilers
    });

    const run: SimulatedRun = { antes: {} };

    // Map SimulationResult to SimulatedRun
    for (const [anteNum, simAnte] of Object.entries(simResult.antes)) {
        const ante: SimulatedAnte = {
            ante: parseInt(anteNum),
            boss: simAnte.boss,
            voucher: simAnte.vouchers[0] || null,
            tags: simAnte.tags,
            queue: simAnte.shopQueue.map(c => ({
                name: c.name,
                type: c.type,
                edition: c.edition
            })),
            blinds: {
                smallBlind: { packs: [] },
                bigBlind: { packs: [] },
                bossBlind: {
                    packs: simAnte.packs.map(p => ({
                        name: p.name.replace(" Pack", ""),
                        cards: p.cards.map(c => ({
                            name: c.name,
                            type: c.type,
                            edition: c.edition
                        }))
                    }))
                }
            },
            miscCardSources: simAnte.miscCardSources.map(s => ({
                name: s.name,
                cards: s.cards.map(c => ({
                    name: c.name,
                    type: c.type,
                    edition: c.edition
                }))
            })),
            wheelQueue: [],
            auraQueue: [],
            deckDraws: simAnte.deckDraws
        };

        // Add legacy packs property for UI compatibility
        ante.packs = ante.blinds.bossBlind.packs;

        run.antes[parseInt(anteNum)] = ante;
    }

    return run;
}

/**
 * Formats simulation results as text
 */
export function formatAnalysisText(results: SimulatedRun): string {
    let output = "";
    for (const [anteNum, ante] of Object.entries(results.antes)) {
        output += `Ante ${anteNum}:\n`;
        output += `  Boss: ${ante.boss}\n`;
        output += `  Voucher: ${ante.voucher}\n`;
        output += `  Tags: ${ante.tags.join(", ")}\n`;
        output += `  Shop Queue:\n`;
        ante.queue.forEach(item => {
            output += `    - ${item.name} (${item.type})${item.edition ? ` [${item.edition}]` : ""}\n`;
        });
        output += "\n";
    }
    return output;
}
