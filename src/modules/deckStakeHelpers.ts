import { Layer } from "./classes/Layer.ts";

export function getDeckBackPosition(deckName: string): { x: number, y: number } {
    // Deck backs in images/Decks/Enhancers.png
    // Based on weejoker.app DeckSprite.tsx
    const deckBackMap: Record<string, { x: number, y: number }> = {
        "Red Deck": { x: 0, y: 0 },
        "Blue Deck": { x: 0, y: 2 },
        "Yellow Deck": { x: 1, y: 2 },
        "Green Deck": { x: 2, y: 2 },
        "Black Deck": { x: 3, y: 2 },
        "Magic Deck": { x: 0, y: 3 },
        "Nebula Deck": { x: 3, y: 0 },
        "Ghost Deck": { x: 6, y: 2 },
        "Abandoned Deck": { x: 3, y: 3 },
        "Checkered Deck": { x: 1, y: 3 },
        "Zodiac Deck": { x: 3, y: 4 },
        "Painted Deck": { x: 4, y: 3 },
        "Anaglyph Deck": { x: 2, y: 4 },
        "Plasma Deck": { x: 4, y: 2 },
        "Erratic Deck": { x: 2, y: 3 },
        "Challenge Deck": { x: 0, y: 4 }, // Added from list
        "Locked Deck": { x: 4, y: 0 }
    };
    return deckBackMap[deckName] || { x: 2, y: 3 }; // Default to Erratic if unknown
}

export function getStakeChipPosition(stakeName: string): { x: number, y: number } {
    // Stake chips in images/Decks/stickers.png
    // Based on STAKE_MAP in weejoker.app
    const stakeChipMap: Record<string, { x: number, y: number }> = {
        "White Stake": { x: 1, y: 0 },
        "Red Stake": { x: 2, y: 0 },
        "Green Stake": { x: 3, y: 0 },
        "Blue Stake": { x: 4, y: 0 },
        "Black Stake": { x: 0, y: 1 },
        "Purple Stake": { x: 1, y: 1 },
        "Orange Stake": { x: 2, y: 1 },
        "Gold Stake": { x: 3, y: 1 }
    };
    return stakeChipMap[stakeName] || { x: 1, y: 0 };
}

export function createDeckBackLayer(deckName: string): Layer {
    const pos = getDeckBackPosition(deckName);
    return new Layer({
        pos,
        name: `${deckName} Back`,
        order: 0,
        source: 'images/Enhancers.png',
        rows: 5,
        columns: 7
    });
}

export function createStakeChipLayer(stakeName: string): Layer {
    const pos = getStakeChipPosition(stakeName);
    return new Layer({
        pos,
        name: `${stakeName} Chip`,
        order: 0,
        source: 'images/Decks/stickers.png',
        rows: 3, // STICKER_ROWS from DeckSprite
        columns: 5 // STICKER_COLS from DeckSprite
    });
}
