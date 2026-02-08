import { expect, test } from "vitest";
import { AnalyzeOptions, AnalyzeSettings, analyzeSeed } from "../src/modules/GameEngine";
import { SeedResultsContainer, Pack, CardTuple } from "../src/modules/GameEngine/CardEngines/Cards";
import { options } from "../src/modules/const";

function getAnte2BossArcanaSpoilerJokers(cardsPerAnte: number): string[] {
  const settings: AnalyzeSettings = {
    seed: "TYTWAA1P",
    deck: "Plasma Deck",
    stake: "White Stake",
    gameVersion: "10106",
    minAnte: 1,
    maxAnte: 2,
    cardsPerAnte,
  };
  const analyzeOptions: AnalyzeOptions = {
    buys: {},
    sells: {},
    showCardSpoilers: true,
    unlocks: options,
    events: [],
    lockedCards: {},
  };
  const results: SeedResultsContainer | undefined = analyzeSeed(settings, analyzeOptions);

  const packs: Pack[] = results?.antes?.[2]?.blinds?.bossBlind?.packs ?? [];
  const arcanaPacks = packs.filter((p: Pack) => p.name === "Arcana");
  const jokerNames = arcanaPacks.flatMap((p: Pack) =>
    (p.cards ?? [])
      .filter((c: CardTuple | undefined) => c?.type === "Joker")
      .map((c: CardTuple | undefined) => c?.name)
  ).filter((name: string | undefined) => name !== undefined) as string[];

  return jokerNames;
}

test("TYTWAA1P: Judgement spoiler does not change when Cards per Ante changes", () => {
  const at50 = getAnte2BossArcanaSpoilerJokers(50);
  const at100 = getAnte2BossArcanaSpoilerJokers(100);
  const at150 = getAnte2BossArcanaSpoilerJokers(150);

  expect(at50.length).toBeGreaterThan(0);
  expect(at50).toEqual(at100);
  expect(at50).toEqual(at150);

  expect(at50).toContain("Ice Cream");
  expect(at50).not.toContain("Sixth Sense");
});

