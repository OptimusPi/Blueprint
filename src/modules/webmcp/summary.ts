import type { Ante, CardTuple, SeedResultsContainer, Stringifies } from "../GameEngine/CardEngines/Cards.ts";
import type { Blinds } from "../state/store.ts";

export type ItemSource = "shop" | "pack" | "misc" | "voucher" | "tag" | "boss";

export interface ItemLocation {
    ante: number;
    source: ItemSource;
    name: string;
    edition?: string;
    index?: number;
    blind?: Blinds;
    packIndex?: number;
    packName?: string;
    miscSource?: string;
}

const BLINDS: Array<Blinds> = ["smallBlind", "bigBlind", "bossBlind"];

function label(card: Stringifies | CardTuple | undefined): string {
    if (!card) return "";
    const edition = card.edition && card.edition !== "No Edition" ? ` (${card.edition})` : "";
    return `${card.name}${edition}`;
}

function sortedAntes(results: SeedResultsContainer): Array<Ante> {
    return Object.values(results.antes).sort((a, b) => a.ante - b.ante);
}

export function summarizeSeed(seed: string, results: SeedResultsContainer, shopLimit = 12) {
    return {
        seed,
        antes: sortedAntes(results).map((ante) => ({
            ante: ante.ante,
            boss: ante.boss,
            voucher: ante.voucher,
            tags: ante.tags,
            shop: ante.queue.slice(0, shopLimit).map(label),
            shopSize: ante.queue.length,
            packs: BLINDS.flatMap((blind) =>
                ante.blinds[blind].packs.map((pack) => ({
                    blind,
                    pack: pack.name,
                    cards: pack.cards.map(label),
                })),
            ),
        })),
    };
}

export function describeAnte(ante: Ante) {
    return {
        ante: ante.ante,
        boss: ante.boss,
        voucher: ante.voucher,
        tags: ante.tags,
        shop: ante.queue.map((card, index) => ({ index, item: label(card), type: card.type })),
        packs: BLINDS.flatMap((blind) =>
            ante.blinds[blind].packs.map((pack, packIndex) => ({
                blind,
                packIndex,
                pack: pack.name,
                choices: pack.choices,
                cards: pack.cards.map((card, index) => ({ index, item: label(card) })),
            })),
        ),
        miscSources: ante.miscCardSources.map((source) => ({
            source: source.name,
            cards: source.cards.slice(0, 15).map((card) => card.joker ?? card.name ?? card.base ?? ""),
        })),
    };
}

function matches(needle: string, name: string | null | undefined): boolean {
    return !!name && name.toLowerCase().includes(needle);
}

export function findItems(results: SeedResultsContainer, names: Array<string>, maxPerName = 25): Record<string, Array<ItemLocation>> {
    const out: Record<string, Array<ItemLocation>> = {};
    for (const raw of names) {
        const needle = raw.trim().toLowerCase();
        if (!needle) continue;
        const hits: Array<ItemLocation> = [];
        for (const ante of sortedAntes(results)) {
            if (matches(needle, ante.voucher)) hits.push({ ante: ante.ante, source: "voucher", name: ante.voucher! });
            if (matches(needle, ante.boss)) hits.push({ ante: ante.ante, source: "boss", name: ante.boss! });
            ante.tags.forEach((tag) => {
                if (matches(needle, tag)) hits.push({ ante: ante.ante, source: "tag", name: tag });
            });
            ante.queue.forEach((card, index) => {
                if (matches(needle, card.name)) {
                    hits.push({ ante: ante.ante, source: "shop", name: card.name, edition: card.edition, index });
                }
            });
            for (const blind of BLINDS) {
                ante.blinds[blind].packs.forEach((pack, packIndex) => {
                    pack.cards.forEach((card, index) => {
                        if (card && matches(needle, card.name)) {
                            hits.push({
                                ante: ante.ante,
                                source: "pack",
                                name: card.name,
                                edition: card.edition,
                                index,
                                blind,
                                packIndex,
                                packName: pack.name,
                            });
                        }
                    });
                });
            }
            for (const misc of ante.miscCardSources) {
                misc.cards.forEach((card, index) => {
                    const name = card.joker ?? card.name;
                    if (matches(needle, name)) {
                        hits.push({ ante: ante.ante, source: "misc", name: name, edition: card.edition, index, miscSource: misc.name });
                    }
                });
            }
            if (hits.length >= maxPerName) break;
        }
        out[raw] = hits.slice(0, maxPerName);
    }
    return out;
}
