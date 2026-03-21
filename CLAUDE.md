# Blueprint

Balatro seed search and JAML filtering tool built for GitHub Pages.

## Stack

- **React 18** + **TypeScript** — UI framework
- **Vite 7** — build tooling, static deploy to GitHub Pages
- **Zustand** — state management (`src/modules/state/store.ts`)
- **Mantine 8** — component library (carousel, spotlight, code-highlight)
- **motely-wasm** — .NET WASM runtime for Balatro seed search (single-threaded, no SharedArrayBuffer required)
- **motely-node** — Node-side Motely utilities
- **TanStack React Query** — async data fetching
- **Vitest** — unit testing

## Commands

```bash
npm run dev        # Start dev server on port 3000
npm run build      # Production build
npm run preview    # Preview production build
npm run test       # Run tests (vitest)
npm run lint       # ESLint (src/)
```

## Architecture

```
src/
  components/blueprint/
    jamlView/         # JAML filter editor + search UI + map view
    layout/           # Navbar, sidebar, app shell
  modules/
    state/            # Zustand store, JAML search context, providers
    ImmolateWrapper/  # Card engine bindings
  Rendering/          # Card, boss, voucher, tag rendering
  mocks/              # next/navigation shim (Vite alias)
```

## Key Patterns

- JAML search uses the `motely-wasm` package's instance-based API: `createInstance()` → `startJamlSearch()` → `destroyInstance()`.
- Progress and results come via event subscriptions (`onSearchProgress`, `onSearchResult`).
- WASM boots single-threaded (`bootsharp_st`) — no COOP/COEP headers needed, works on GitHub Pages without hacks.
- Search context lives in `JamlSearchProvider` (React Context) at `src/modules/state/jamlSearchContext.tsx`.
- Card stream visibility is driven by JAML config via `extractSourcesFromJaml()` / `extractAntesFromJaml()`.

## Deployment

- GitHub Pages via `.github/workflows/main.yml`
- Base path configured via `BASE_PATH` env var (defaults to `./`)
- No custom HTTP headers available on GitHub Pages (static hosting)
