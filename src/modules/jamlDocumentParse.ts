import { sanitizeSeed } from "./utils.ts";

export interface ParsedJamlDocument {
    filterJaml: string;
    seeds: Array<string>;
    deck: string | null;
    stake: string | null;
    name: string | null;
}

const SEED_LIST_ITEM = /^\s*-\s+['"]?([1-9A-Za-z]{1,8})['"]?\s*(?:#.*)?$/;
const TOP_LEVEL = /^[a-zA-Z][\w]*:/;

export function jamlDeckToBlueprint(deck: string): string {
    const d = deck.trim();
    if (!d) return "Red Deck";
    if (d.endsWith(" Deck")) return d;
    return `${d} Deck`;
}

export function jamlStakeToBlueprint(stake: string): string {
    const s = stake.trim();
    if (!s) return "White Stake";
    if (s.endsWith(" Stake")) return s;
    return `${s} Stake`;
}

function readScalar(lines: Array<string>, key: string): string | null {
    const re = new RegExp(`^${key}:\\s*(.+?)\\s*(?:#.*)?$`, "i");
    for (const line of lines) {
        const m = line.match(re);
        if (m) return m[1].replace(/^['"]|['"]$/g, "").trim();
    }
    return null;
}

function pushSeed(seeds: Array<string>, seen: Set<string>, token: string) {
    const seed = sanitizeSeed(token);
    if (seed && !seen.has(seed)) {
        seen.add(seed);
        seeds.push(seed);
    }
}

function parseInlineSeeds(rest: string, seeds: Array<string>, seen: Set<string>) {
    const inner = rest.replace(/^\[/, "").replace(/\]\s*$/, "");
    for (const part of inner.split(/[\s,]+/)) {
        const t = part.replace(/^['"]|['"]$/g, "").trim();
        if (t) pushSeed(seeds, seen, t);
    }
}

export function parseJamlDocument(text: string): ParsedJamlDocument {
    const lines = text.split(/\r?\n/);
    const deck = readScalar(lines, "deck");
    const stake = readScalar(lines, "stake");
    const name = readScalar(lines, "name");

    const seeds: Array<string> = [];
    const seen = new Set<string>();
    const filterLines: Array<string> = [];

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        if (/^seeds:\s*/i.test(trimmed)) {
            const after = trimmed.replace(/^seeds:\s*/i, "").trim();
            if (after.startsWith("[")) {
                parseInlineSeeds(after, seeds, seen);
                i++;
                continue;
            }
            i++;
            while (i < lines.length) {
                const seedLine = lines[i];
                const seedTrim = seedLine.trim();
                if (!seedTrim || seedTrim.startsWith("#")) {
                    i++;
                    continue;
                }
                if (TOP_LEVEL.test(seedTrim) && !seedTrim.startsWith("-")) break;
                const item = seedLine.match(SEED_LIST_ITEM);
                if (item) {
                    pushSeed(seeds, seen, item[1]);
                    i++;
                    continue;
                }
                if (/^\s*-\s+/.test(seedLine)) {
                    const raw = seedTrim.replace(/^-\s+/, "").replace(/^['"]|['"]$/g, "");
                    pushSeed(seeds, seen, raw);
                    i++;
                    continue;
                }
                break;
            }
            continue;
        }

        filterLines.push(line);
        i++;
    }

    let filterJaml = filterLines.join("\n").trimEnd();
    if (seeds.length > 0) {
        filterJaml = `${filterJaml}\n\n# ${seeds.length.toLocaleString()} seeds loaded into the seed queue`;
    }

    return {
        filterJaml,
        seeds,
        deck,
        stake,
        name,
    };
}

export function documentLooksLikeSeedBundle(text: string): boolean {
    return /^seeds:\s*$/im.test(text) || /^seeds:\s*\[/im.test(text) || /^seeds:\s*\n\s*-/im.test(text);
}
