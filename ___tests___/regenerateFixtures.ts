import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { analyzeSeed } from "../src/modules/GameEngine";

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedJsonDir = join(__dirname, "seedJson");
const files = readdirSync(seedJsonDir).filter((f) => f.endsWith(".json"));

for (const file of files) {
  const filePath = join(seedJsonDir, file);
  const raw = JSON.parse(readFileSync(filePath, "utf-8"));
  const { analyzeState, options } = raw;

  const results = analyzeSeed(
    {
      seed: analyzeState.seed,
      deck: analyzeState.deck,
      stake: analyzeState.stake,
      gameVersion: analyzeState.gameVersion,
      minAnte: 1,
      maxAnte: analyzeState.antes,
      cardsPerAnte: analyzeState.cardsPerAnte,
    },
    options
  );

  if (!results) {
    console.error(`SKIP ${file}: analyzeSeed returned undefined`);
    continue;
  }

  raw.immolateResults = results;
  writeFileSync(filePath, JSON.stringify(raw, null, 2), "utf-8");
  console.log(`Updated ${file}`);
}
