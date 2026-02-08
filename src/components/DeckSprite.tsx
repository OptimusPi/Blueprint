import * as React from 'react';

interface DeckSpriteProps {
    deck: string;
    stake?: string;
    size?: number;
    className?: string;
}

export const DECK_MAP: Record<string, { x: number; y: number }> = {
    'red': { x: 0, y: 0 },
    'nebula': { x: 3, y: 0 },
    'blue': { x: 0, y: 2 },
    'yellow': { x: 1, y: 2 },
    'green': { x: 2, y: 2 },
    'black': { x: 3, y: 2 },
    'plasma': { x: 4, y: 2 },
    'ghost': { x: 6, y: 2 },
    'magic': { x: 0, y: 3 },
    'checkered': { x: 1, y: 3 },
    'erratic': { x: 2, y: 3 },
    'abandoned': { x: 3, y: 3 },
    'painted': { x: 4, y: 3 },
    'challenge': { x: 0, y: 4 },
    'anaglyph': { x: 2, y: 4 },
    'zodiac': { x: 3, y: 4 },
    'locked': { x: 4, y: 0 },
};

export const STAKE_MAP: Record<string, { x: number; y: number }> = {
    'white': { x: 1, y: 0 },
    'red': { x: 2, y: 0 },
    'green': { x: 3, y: 0 },
    'blue': { x: 4, y: 0 },
    'black': { x: 0, y: 1 },
    'purple': { x: 1, y: 1 },
    'orange': { x: 2, y: 1 },
    'gold': { x: 3, y: 1 },
};

const SPRITE_WIDTH = 142;
const SPRITE_HEIGHT = 190;
const DECK_COLS = 7;
const DECK_ROWS = 5;
const STICKER_COLS = 5;
const STICKER_ROWS = 3;

export function DeckSprite({ deck, stake, size = 50, className = '' }: DeckSpriteProps) {
    const deckKey = (deck || 'erratic').toLowerCase().replace(/\s*deck\s*$/i, '');
    const deckPos = DECK_MAP[deckKey] || DECK_MAP['erratic'];
    const stakeKey = (stake || '').toLowerCase().replace(/\s*stake\s*$/i, '');
    const stakePos = stake ? STAKE_MAP[stakeKey] : null;


    const scale = size / SPRITE_WIDTH;
    const displayHeight = SPRITE_HEIGHT * scale;

    return (
        <div
            className={`relative ${className}`}
            style={{
                width: `${size}px`,
                height: `${displayHeight}px`,
                imageRendering: 'pixelated'
            }}
        >
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundImage: 'url(/assets/Enhancers.png)',
                    backgroundSize: `${DECK_COLS * 100}% ${DECK_ROWS * 100}%`,
                    backgroundPosition: `${(deckPos.x / (DECK_COLS - 1)) * 100}% ${(deckPos.y / (DECK_ROWS - 1)) * 100}%`,
                    backgroundRepeat: 'no-repeat',
                }}
            />
            {stakePos && (
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: 'url(/assets/Decks/stickers.png)',
                        backgroundSize: `${STICKER_COLS * 100}% ${STICKER_ROWS * 100}%`,
                        backgroundPosition: `${(stakePos.x / (STICKER_COLS - 1)) * 100}% ${(stakePos.y / (STICKER_ROWS - 1)) * 100}%`,
                        backgroundRepeat: 'no-repeat',
                    }}
                />
            )}
        </div>
    );
}
