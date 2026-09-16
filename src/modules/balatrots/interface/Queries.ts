import type { BossBlind } from "../enum/BossBlind";
import type { LegendaryJoker } from "../enum/cards/LegendaryJoker";
import type { PackType } from "../enum/packs/PackType";
import type { Voucher } from "../enum/Voucher";
import type { CommonQueries } from "./CommonQueries";
import type { Item } from "./Item";

type AnteScoped = "hasInPack" | "hasInShop" | "countLegendary" | "hasLegendary" | "hasInSpectral" | "hasInBuffonPack" | "hasPack" | "hasVoucher" | "hasBoss";

export interface Queries extends Omit<CommonQueries, AnteScoped> {
    hasInPack: (ante: number, item: Item) => boolean;
    hasInShop: (ante: number, item: Item, index?: number) => boolean;
    countLegendary: (ante: number) => number;
    hasLegendary: (ante: number, ...jokers: Array<LegendaryJoker>) => boolean;
    hasInSpectral: (ante: number, item: Item) => boolean;
    hasInBuffonPack: (ante: number, item: Item) => boolean;
    hasPack: (ante: number, packType: PackType) => boolean;
    hasVoucher: (ante: number, voucher: Voucher) => boolean;
    hasBoss: ((ante: number, boss: BossBlind) => boolean) & ((boss: BossBlind) => boolean);
}
