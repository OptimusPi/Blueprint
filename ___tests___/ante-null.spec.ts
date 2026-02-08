import { describe, it, expect } from 'vitest'
import { AnalyzeOptions, analyzeSeed, AnalyzeSettings } from "../src/modules/GameEngine";
import { SeedResultsContainer } from '../src/modules/GameEngine/CardEngines/Cards';

describe('ante sanitization', () => {
  it('does not throw when settings.antes is NaN or null and returns null', () => {
    const settings: AnalyzeSettings = {
      seed: 'ABCD',
      deck: 'Ghost Deck',
      stake: 'White Stake',
      gameVersion: '10106',
      minAnte: NaN,
      maxAnte: NaN,
      cardsPerAnte: 1,
    }
    const options: AnalyzeOptions = {
      buys: {},
      sells: {},
      showCardSpoilers: false,
      unlocks: [],
      events: []
    }

    const result: SeedResultsContainer | undefined = analyzeSeed(settings, options);
    expect(result).toEqual({ antes: {} } as SeedResultsContainer);
  })

  it('treats settings.antes = 0 as at least 1', () => {
    const settings: AnalyzeSettings = {
      seed: 'ABCD',
      deck: 'Ghost Deck',
      stake: 'White Stake',
      gameVersion: '10106',
      minAnte: 0,
      maxAnte: 1,
      cardsPerAnte: 1,
    }
    const options: AnalyzeOptions = {
      buys: {},
      sells: {},
      showCardSpoilers: false,
      unlocks: [],
      events: []
    }

    const result: SeedResultsContainer | undefined = analyzeSeed(settings, options)
    expect(result).toBeDefined()
    expect(result?.antes[1]).toBeDefined()
  })
})
