export interface Stringifies {
    name: string;
    type: string;
    edition?: string | undefined;
}

export class Ante {
    ante: number;
    boss: string | null;
    voucher: string | null;
    queue: Stringifies[];
    tags: string[];
    blinds: { [key: string]: { packs: any[] } }
    miscCardSources: any[]
    wheelQueue: Stringifies[] = [];
    auraQueue: Stringifies[] = [];
    deckDraws: { [key: string]: any[] } = {};

    constructor(ante: number) {
        this.ante = ante;
        this.boss = null;
        this.voucher = null;
        this.queue = [];
        this.tags = [];
        this.miscCardSources = [];
        this.blinds = {
            smallBlind: { packs: [] },
            bigBlind: { packs: [] },
            bossBlind: { packs: [] }
        }
    }
}

export class Joker_Final implements Stringifies {
    name: string;
    type: string;
    edition: string;
    rarity: number;
    isEternal: boolean | undefined;
    isPerishable: boolean | undefined;
    isRental: boolean | undefined;

    constructor(joker: any) {
        this.name = joker.name;
        this.type = joker.type;
        this.edition = joker?.edition === "No Edition" ? '' : joker?.edition ?? '';
        this.rarity = joker?.rarity ?? 0;
        this.isEternal = joker.isEternal;
        this.isPerishable = joker.isPerishable;
        this.isRental = joker.isRental;
    }
}

export class StandardCard_Final implements Stringifies {
    name: string;
    type: string;
    edition: string | undefined;
    rank: string | undefined;
    suit: string | undefined;
    base: string | undefined;

    constructor(card: any) {
        this.name = card.name;
        this.type = card.type;
        this.edition = card.edition;
        this.rank = card.rank;
        this.suit = card.suit;
        this.base = card.base;
    }
}

export class SeedResultsContainer {
    antes: { [key: number]: Ante };
    constructor() {
        this.antes = {}
    }
}
