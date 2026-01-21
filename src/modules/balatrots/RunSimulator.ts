import { Game } from "./Game";
import { InstanceParams } from "./struct/InstanceParams";
import { Deck, DeckType } from "./enum/Deck";
import { Stake, StakeType } from "./enum/Stake";
import { SimulationResult, SimulatedAnte, SimulatedCard, SimulatedPack, SimulatedMiscSource } from "./SimulationTypes";
import { CardTranslator } from "./utils/CardTranslator";
import { RNGSource } from "./enum/QueueName";
import { Type } from "./enum/cards/CardType";

export interface SimulatorOptions {
    seed: string;
    deck?: string;
    stake?: string;
    maxAnte?: number;
    version?: number;
    showCardSpoilers?: boolean;
}

export class RunSimulator {
    /**
     * Performs a full run simulation and returns a UI-friendly result
     */
    static simulate(options: SimulatorOptions): SimulationResult {
        const seed = options.seed.toUpperCase();
        const deckSlug = options.deck || 'red';
        const stakeSlug = options.stake || 'white';
        const maxAnte = options.maxAnte || 8;
        const version = options.version || 10103;
        const showCardSpoilers = options.showCardSpoilers || false;

        const deckType = this.getDeckType(deckSlug);
        const stakeType = this.getStakeType(stakeSlug);

        const params = new InstanceParams(new Deck(deckType), new Stake(stakeType), false, version);
        const game = new Game(seed, params);

        // Initialize engine locks
        game.initLocks(1, true, false);
        game.firstLock();

        const result: SimulationResult = {
            seed,
            deck: deckSlug,
            stake: stakeSlug,
            version,
            antes: {}
        };

        for (let a = 1; a <= maxAnte; a++) {
            result.antes[a] = this.simulateAnte(game, a, showCardSpoilers);
        }

        return result;
    }

    private static simulateAnte(game: Game, ante: number, showCardSpoilers: boolean): SimulatedAnte {
        game.initUnlocks(ante, false);

        const boss = game.nextBoss(ante);
        const voucher = game.nextVoucher(ante);
        const tags = [game.nextTag(ante).name, game.nextTag(ante).name];

        const shopQueue: SimulatedCard[] = [];
        for (let i = 0; i < 15; i++) {
            const item = game.nextShopItem(ante);
            shopQueue.push(CardTranslator.toSimulatedCard(item.type === Type.JOKER ? item.jokerData : item.item));
        }

        const packs: SimulatedPack[] = [];
        const numPacks = ante === 1 ? 4 : 6;
        for (let p = 1; p <= numPacks; p++) {
            const packItem = game.nextPack(ante);
            const packInfo = game.packInfo(packItem);
            const cards = game.generatePack(packInfo, ante);

            packs.push({
                name: packItem.getName(),
                kind: packInfo.getKind(),
                size: packInfo.getSize(),
                choices: packInfo.getChoices(),
                cards: cards.map(c => {
                    let cardToTranslate = c;
                    if (showCardSpoilers) {
                        // Check if it's a Card with getName or a JokerData with a joker that has getName
                        const name = (c as any).getName ? (c as any).getName() :
                            (c as any).joker && (c as any).joker.getName ? (c as any).joker.getName() : "Unknown";

                        if (name === "Judgement") {
                            cardToTranslate = game.peekJoker(RNGSource.S_Judgement, ante, false);
                        } else if (name === "Wraith") {
                            cardToTranslate = game.peekJoker(RNGSource.S_Wraith, ante, false);
                        } else if (name === "The Soul") {
                            cardToTranslate = game.peekJoker(RNGSource.S_Soul, ante, false);
                        }
                    }
                    return CardTranslator.toSimulatedCard(cardToTranslate);
                })
            });
        }


        const miscCardSources = this.generateMiscSources(game, ante);

        const deckDraws: Record<string, SimulatedCard[]> = {
            "Round 1": game.getDeckDraw(ante, 1, 52).map(c => CardTranslator.toSimulatedCard(c)),
            "Round 2": game.getDeckDraw(ante, 2, 52).map(c => CardTranslator.toSimulatedCard(c)),
            "Round 3": game.getDeckDraw(ante, 3, 52).map(c => CardTranslator.toSimulatedCard(c))
        };

        return {
            ante,
            boss: (boss as any).name || boss,
            vouchers: [(voucher as any).name || voucher],
            tags,
            shopQueue,
            packs,
            miscCardSources,
            deckDraws
        };
    }

    private static generateMiscSources(game: Game, ante: number): SimulatedMiscSource[] {
        const sources: Array<{ name: string, source: RNGSource, type: string }> = [
            { name: "riffRaff", source: RNGSource.S_Riff_Raff, type: "Joker" },
            { name: "arcanaPack", source: RNGSource.S_Arcana, type: "Tarot" },
            { name: "spectralPack", source: RNGSource.S_Spectral, type: "Spectral" },
            { name: "buffoonPack", source: RNGSource.S_Buffoon, type: "Joker" }
        ];

        return sources.map(s => {
            const cards: SimulatedCard[] = [];
            for (let i = 0; i < 5; i++) {
                let card;
                if (s.type === "Joker") card = game.nextJoker(s.source, ante, false);
                else if (s.type === "Tarot") card = game.nextTarot(s.source, ante, false);
                else if (s.type === "Spectral") card = game.nextSpectral(s.source, ante, false);

                cards.push(CardTranslator.toSimulatedCard(card));
            }
            return { name: s.name, source: s.source, cards };
        });


    }

    private static getDeckType(slug: string): DeckType {
        const normalized = slug.toLowerCase().replace(" deck", "").replace(" ", "_");
        const map: Record<string, DeckType> = {
            'red': DeckType.RED_DECK,
            'blue': DeckType.BLUE_DECK,
            'yellow': DeckType.YELLOW_DECK,
            'green': DeckType.GREEN_DECK,
            'black': DeckType.BLACK_DECK,
            'magic': DeckType.MAGIC_DECK,
            'nebula': DeckType.NEBULA_DECK,
            'ghost': DeckType.GHOST_DECK,
            'abandoned': DeckType.ABANDONED_DECK,
            'checkered': DeckType.CHECKERED_DECK,
            'zodiac': DeckType.ZODIAC_DECK,
            'painted': DeckType.PAINTED_DECK,
            'anaglyph': DeckType.ANAGLYPH_DECK,
            'plasma': DeckType.PLASMA_DECK,
            'erratic': DeckType.ERRATIC_DECK,
        };
        return map[normalized] || DeckType.RED_DECK;
    }

    private static getStakeType(slug: string): StakeType {
        const normalized = slug.toLowerCase().replace(" stake", "").replace(" ", "_");
        const map: Record<string, StakeType> = {
            'white': StakeType.WHITE_STAKE,
            'red': StakeType.RED_STAKE,
            'green': StakeType.GREEN_STAKE,
            'black': StakeType.BLACK_STAKE,
            'blue': StakeType.BLUE_STAKE,
            'purple': StakeType.PURPLE_STAKE,
            'orange': StakeType.ORANGE_STAKE,
            'gold': StakeType.GOLD_STAKE,
        };
        return map[normalized] || StakeType.WHITE_STAKE;
    }
}
