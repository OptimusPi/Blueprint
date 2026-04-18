import { JokerType } from "../enum/JokerType";
import type { Filter } from "./Filter";
import type { Item } from "./Item";

export interface Joker extends Item {
    // Method overload signatures
    inBuffonPack: (() => Filter) & ((ante: number) => Filter);
    getType: () => JokerType;
    isRare: () => boolean;
    isCommon: () => boolean;
    isUncommon: () => boolean;
    isLegendary: () => boolean;
}

export class JokerImpl implements Joker {
    name: string;
    constructor(private type: JokerType, name: string) {
        this.name = name;
    }

    getType(): JokerType {
        return this.type;
    }

    // Implementation of overloaded method
    inBuffonPack(_ante?: number): Filter {
        // Implement your logic here
        return {} as Filter; // Replace with actual implementation
    }

    isRare(): boolean {
        return this.type === JokerType.RARE;
    }

    isCommon(): boolean {
        return this.type === JokerType.COMMON;
    }

    isUncommon(): boolean {
        return this.type === JokerType.UNCOMMON;
    }

    isLegendary(): boolean {
        return this.type === JokerType.LEGENDARY;
    }

    // Implementation of Item interface methods
    getName(): string {
        return this.name;
    }

    eq(item: Item): boolean {
        return this.getName() === item.getName();
    }

    equals(value: string): boolean {
        return this.getName() === value;
    }

    inPack(_ante?: number): Filter {
        // Implement your logic here
        return {} as Filter; // Replace with actual implementation
    }

    inShop(_ante?: number): Filter {
        // Implement your logic here
        return {} as Filter; // Replace with actual implementation
    }

    inSpectral(_ante?: number): Filter {
        // Implement your logic here
        return {} as Filter; // Replace with actual implementation
    }

    edition() {
        // Implement your logic here
        return {} as any; // Replace with actual implementation
    }

}