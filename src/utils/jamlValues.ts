import { CommonJoker } from '../modules/balatrots/enum/cards/CommonJoker';
import { UncommonJoker } from '../modules/balatrots/enum/cards/UncommonJoker';
import { RareJoker } from '../modules/balatrots/enum/cards/RareJoker';
import { LegendaryJoker } from '../modules/balatrots/enum/cards/LegendaryJoker';
import { Edition } from '../modules/balatrots/enum/Edition';
import { Rank } from '../modules/balatrots/enum/Rank';
import { Suit } from '../modules/balatrots/enum/Suit';
import { Voucher } from '../modules/balatrots/enum/Voucher';
import { TarotEnum } from '../modules/balatrots/enum/cards/Tarot';
import { Planet } from '../modules/balatrots/enum/cards/Planet';
import { Spectral } from '../modules/balatrots/enum/packs/Spectral';
import { Tag } from '../modules/balatrots/enum/Tag';
import { BossBlindEnum } from '../modules/balatrots/enum/BossBlind';
import { Seal } from '../modules/balatrots/enum/Seal';
import { Enhancement } from '../modules/balatrots/enum/Enhancement';

/**
 * All valid JAML clause types (left-hand keys for clauses)
 */
export const CLAUSE_TYPES = [
  'joker',
  'soulJoker',
  'voucher',
  'tarotCard',
  'planetCard',
  'spectralCard',
  'standardCard',
  'tag',
  'smallBlindTag',
  'bigBlindTag',
  'boss',
  'bossBlind',
  'event',
  'erraticRank',
  'erraticSuit',
  'and',
  'or',
] as const;

/**
 * All valid JAML property keys (for clauses)
 */
export const PROPERTY_KEYS = {
  // Metadata (Purple)
  metadata: ['label'] as const,

  // Stickers/Modifiers (Purple)
  stickers: ['stickers'] as const,

  // Card Modifiers (varies)
  modifiers: ['edition', 'seal', 'enhancement'] as const,

  // Playing Card Specific
  playingCard: ['rank', 'suit'] as const,

  // Source/Location Properties (Blue - informational)
  sources: ['sources', 'antes'] as const,

  // Scoring (Blue - optional)
  scoring: ['score'] as const,
} as const;

/**
 * All valid joker names (all rarities combined)
 */
export const ALL_JOKERS = [
  ...Object.values(CommonJoker),
  ...Object.values(UncommonJoker),
  ...Object.values(RareJoker),
  ...Object.values(LegendaryJoker),
  'Any', // Special value
] as const;

/**
 * Soul Jokers (Legendary) only
 */
export const SOUL_JOKERS = [
  ...Object.values(LegendaryJoker),
  'Any',
] as const;

/**
 * All editions - but NOTE: StandardCard cannot have Negative!
 */
export const ALL_EDITIONS = [
  Edition.FOIL,
  Edition.HOLOGRAPHIC,
  Edition.POLYCHROME,
  Edition.NEGATIVE,
  Edition.ETERNAL,
  Edition.PERISHABLE,
  Edition.RENTAL,
] as const;

/**
 * Standard Card ONLY editions (NO NEGATIVE!)
 */
export const STANDARD_CARD_EDITIONS = [
  Edition.FOIL,
  Edition.HOLOGRAPHIC,
  Edition.POLYCHROME,
  // Negative NOT allowed on Standard Cards!
] as const;

/**
 * All vouchers
 */
export const ALL_VOUCHERS = Object.values(Voucher);

/**
 * All tarot cards
 */
export const ALL_TAROTS = Object.values(TarotEnum);

/**
 * All planet cards
 */
export const ALL_PLANETS = Object.values(Planet);

/**
 * All spectral cards
 */
export const ALL_SPECTRALS = [...new Set(Object.values(Spectral))]; // Remove duplicate RETRY

/**
 * All tags
 */
export const ALL_TAGS = Object.values(Tag);

/**
 * All boss blinds
 */
export const ALL_BOSSES = Object.values(BossBlindEnum);

/**
 * All seals
 */
export const ALL_SEALS = Object.values(Seal).filter(s => s !== Seal.NO_SEAL);

/**
 * All enhancements
 */
export const ALL_ENHANCEMENTS = Object.values(Enhancement);

/**
 * All ranks for StandardCard
 */
export const ALL_RANKS = Object.values(Rank);

/**
 * All suits for StandardCard
 */
export const ALL_SUITS = Object.values(Suit);

/**
 * All decks
 */
export const ALL_DECKS = [
  'Red', 'Blue', 'Yellow', 'Green', 'Black', 'Magic', 'Nebula',
  'Ghost', 'Abandoned', 'Checkered', 'Zodiac', 'Painted', 'Anaglyph',
  'Plasma', 'Erratic', 'Challenge'
];

/**
 * All stakes
 */
export const ALL_STAKES = [
  'White', 'Red', 'Green', 'Black', 'Blue', 'Purple', 'Orange', 'Gold'
];

/**
 * Keys that hold array values
 */
export const ARRAY_KEYS = ['antes', 'shopSlots', 'packSlots'];

/**
 * Get valid values for a given clause type and property
 */
export function getValidValuesFor(clauseType: string, propertyKey?: string): string[] {
  // If no property specified, return clause type values (the right-hand value after the colon)
  if (!propertyKey) {
    switch (clauseType) {
      case 'joker':
        return ['Any', ...ALL_JOKERS];
      case 'soulJoker':
        return [...SOUL_JOKERS];
      case 'voucher':
        return ['Any', ...ALL_VOUCHERS];
      case 'tarotCard':
        return ['Any', ...ALL_TAROTS];
      case 'planetCard':
        return ['Any', ...ALL_PLANETS];
      case 'spectralCard':
        return ['Any', ...ALL_SPECTRALS];
      case 'tag':
      case 'smallBlindTag':
      case 'bigBlindTag':
        return ['Any', ...ALL_TAGS];
      case 'boss':
      case 'bossBlind':
        return ['Any', ...ALL_BOSSES];
      case 'standardCard':
        return ['Any', ...generateStandardCardSuggestions()];
      default:
        return [];
    }
  }

  // Property-specific values
  switch (propertyKey) {
    case 'edition':
      // Special case: StandardCard can't have Negative edition
      if (clauseType === 'standardCard') {
        return [...STANDARD_CARD_EDITIONS];
      }
      return [...ALL_EDITIONS];

    case 'rank':
      return [...ALL_RANKS];

    case 'suit':
      return [...ALL_SUITS];

    case 'seal':
      return [...ALL_SEALS];

    case 'enhancement':
      return [...ALL_ENHANCEMENTS];

    case 'stickers':
      return ['Eternal', 'Perishable', 'Rental'];

    case 'antes':
      // Return range 0-12 as common values (can type more)
      return Array.from({ length: 13 }, (_, i) => i.toString());

    case 'score':
      // Common score values
      return ['1', '2', '3', '4', '5', '10', '15', '20'];

    case 'shopSlots':
    case 'packSlots':
      // Common slot indices
      return ['0', '1', '2', '3', '4', '5'];

    case 'source':
      // Layout source options
      return [...LAYOUT_SOURCES];

    case 'colspan':
      return ['1', '2', '3'];

    case 'deck':
      return ALL_DECKS;

    case 'stake':
      return ALL_STAKES;

    default:
      return [];
  }
}

/**
 * Generate smart StandardCard suggestions like "2 of Hearts", "Polychrome King of Spades"
 */
function generateStandardCardSuggestions(): string[] {
  const suggestions: string[] = [];

  // Basic formatted cards
  for (const rank of ALL_RANKS) {
    // suggestions.push(`${rank} of ...`); // user can type suit if they want
    for (const suit of ALL_SUITS) {
      suggestions.push(`${rank} of ${suit}`);
    }
  }

  // Add some fancy variants for inspiration
  const fancyVariants = [
    'Polychrome King of Hearts',
    'Glass Ace of Spades',
    'Red Seal Steel King of Diamonds',
    'Foil Queen of Clubs',
    'Holographic Jack of Spades'
  ];

  return [...fancyVariants, ...suggestions];
}

/**
 * Check if a property is valid for a given clause type
 */
export function isPropertyValidForClauseType(clauseType: string, propertyKey: string): boolean {
  const invalidCombinations: Record<string, string[]> = {
    'standardCard': ['sources'], // StandardCards typically don't use sources in the same way
    'voucher': ['rank', 'suit', 'seal', 'enhancement'], // Vouchers can't have playing card properties
    'joker': ['rank', 'suit'], // Jokers don't have rank/suit
    'soulJoker': ['rank', 'suit'], // Soul Jokers don't have rank/suit
  };

  const invalid = invalidCombinations[clauseType] || [];
  return !invalid.includes(propertyKey);
}

/**
 * Get properties that should appear first for a clause type
 * Returns in order of most likely to be used (bottom of popover = most likely)
 */
export function getSuggestedPropertiesFor(clauseType: string): Array<{ key: string; category: 'metadata' | 'modifier' | 'source' | 'scoring' }> {
  // Most likely props at the END (they appear at bottom of popover, closest to cursor)
  // This stack order determines visual order in a list that grows UPWARDS from cursor
  const props: Array<{ key: string; category: 'metadata' | 'modifier' | 'source' | 'scoring' }> = [];

  // Metadata first (least likely to add after the type - appears at TOP of popover)
  props.push({ key: 'label', category: 'metadata' });

  // Stickers (jokers only)
  if (['joker', 'soulJoker'].includes(clauseType)) {
    props.push({ key: 'stickers', category: 'modifier' });
  }

  // Edition (most items can have editions)
  if (!['tag', 'smallBlindTag', 'bigBlindTag', 'boss', 'bossBlind'].includes(clauseType)) {
    props.push({ key: 'edition', category: 'modifier' });
  }

  // StandardCard specific
  if (clauseType === 'standardCard') {
    props.push(
      { key: 'seal', category: 'modifier' },
      { key: 'enhancement', category: 'modifier' },
      { key: 'rank', category: 'modifier' },
      { key: 'suit', category: 'modifier' }
    );
  }

  // Source specifications (very common!)
  props.push(
    { key: 'shopSlots', category: 'source' },
    { key: 'packSlots', category: 'source' },
    { key: 'sources', category: 'source' }
  );

  // Score (only in should: section, but we don't know section here easily. Assume both)
  props.push({ key: 'score', category: 'scoring' });

  // Antes (MOST COMMON - appears at bottom, closest to cursor!)
  props.push({ key: 'antes', category: 'source' });

  // Filter out invalid properties
  return props.filter(prop => isPropertyValidForClauseType(clauseType, prop.key));
}

/**
 * Layout row configuration for custom views
 */
export interface LayoutRow {
  colspan?: number;  // 1, 2, or 3 (columns to span)
  source: string;    // shopSlots, packSlots, voucher, smallBlind, bigBlind, bossBlind, tag, boss
  slots?: Array<number>;  // Optional slot indices to show
}

/**
 * Valid layout sources
 */
export const LAYOUT_SOURCES = [
  'shopSlots',
  'voucher',
  'packSlots',
  'smallBlind',
  'bigBlind',
  'bossBlind',
  'tag',
  'boss',
  'customSource',
] as const;

/**
 * Get all valid top-level JAML keys
 */
export function getTopLevelKeys(): string[] {
  return ['name', 'author', 'description', 'deck', 'stake', 'layout', 'must', 'should', 'mustNot'];
}

/**
 * Get all valid clause type keys (what goes after the dash in must:/should:)
 */
export function getClauseTypeKeys(): string[] {
  return [
    'joker',
    'soulJoker',
    'voucher',
    'tarotCard',
    'planetCard',
    'spectralCard',
    'standardCard',
    'tag',
    'smallBlindTag',
    'bigBlindTag',
    'boss',
    'bossBlind',
    'event',
    'erraticRank',
    'erraticSuit',
  ];
}
