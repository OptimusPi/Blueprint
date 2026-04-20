# Blueprint - Development Rules

## Dependencies
- **NEVER use `pnpm link`, `npm link`, or local file dependencies.** Always publish to npm first, then install the real package.
- All dependencies must come from the npm registry. No exceptions.

## Game Engine Constants
- **NEVER modify PRNG keys, enum string values, or game engine constants** to fix lint errors. Suppress the lint rule instead.
- Files in `src/modules/balatrots/enum/` contain Balatro PRNG keys that must match the game exactly.

## Code Style
- No AI-generated comments. No obvious comments. No "slop."
- No unnecessary abstractions, wrapper files, or indirection layers.
- Use `jaml-ui` components (JamlIde, JamlGameCard, etc.) instead of building custom UI.
- Use `motely-wasm` directly — no wrapper modules around it.

## motely-wasm
- v11+ is NativeAOT-LLVM, single-threaded, no SharedArrayBuffer needed, no COI serviceworker.
- Boot once on mount. Don't boot again.
- Import directly: `import motely, { MotelyWasm, MotelyWasmEvents } from "motely-wasm"`

## React
- Modern React patterns only. No unnecessary refs, useCallback chains, or setState-in-effects.
- `tsconfig.json` uses `"jsx": "react-jsx"` — no need to import React for JSX.
