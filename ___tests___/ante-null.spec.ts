import { describe, it, expect } from 'vitest'
import { AnalyzeOptions, analyzeSeed, AnalyzeSettings } from "../src/modules/GameEngine";
import { SeedResultsContainer } from '../src/modules/GameEngine/CardEngines/Cards';

const options: AnalyzeOptions = {
  buys: {},
  sells: {},
  showCardSpoilers: false,
  unlocks: [],
  events: []
}

describe('ante sanitization', () => {
  it.each([NaN, null])('does not throw when settings.antes is %s and falls back to 1 ante', (antes) => {
    const settings: AnalyzeSettings = {
      seed: 'ABCD',
      deck: 'Ghost Deck',
      stake: 'White Stake',
      gameVersion: '10106',
      antes: antes as number,
      cardsPerAnte: 1,
    }

    const result: SeedResultsContainer | undefined = analyzeSeed(settings, options);
    expect(result?.antes[1]).toBeDefined()
    expect(result?.antes[2]).toBeUndefined()
  })

  it('treats settings.antes = 0 as at least 1', () => {
    const settings: AnalyzeSettings = {
      seed: 'ABCD',
      deck: 'Ghost Deck',
      stake: 'White Stake',
      gameVersion: '10106',
      antes: 0,
      cardsPerAnte: 1,
    }

    const result: SeedResultsContainer | undefined = analyzeSeed(settings, options)
    expect(result).toBeDefined()
    expect(result?.antes[1]).toBeDefined()
  })
})
