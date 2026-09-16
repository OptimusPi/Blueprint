import type { ItemImpl } from '../interface/Item';
import type { EditionItem } from '../enum/Edition';

export class SearchableItem {
    constructor(
        private readonly item: ItemImpl,
        private readonly edition?: EditionItem
    ) { }

    hasSticker(): boolean {
        return this.edition !== undefined;
    }

    hasEdition(edition: EditionItem): boolean {
        return this.edition !== undefined && this.edition.name === edition.name;
    }

    equals(_item: ItemImpl): boolean {
        // if (item instanceof EditionItem && this.edition) {
        //     return item.eq(this.item) &&
        //         item.edition !== undefined &&
        //         this.edition.eq(item.edition()!);
        // }
        // return item.eq(this.item);
        return true;
    }

    getItem(): ItemImpl {
        return this.item;
    }

    getEdition(): EditionItem | undefined {
        return this.edition;
    }
}
