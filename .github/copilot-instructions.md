# BlueprintPi Copilot Instructions

## Project Overview
BlueprintPi is a React-based web application for analyzing Balatro seeds, specifically focusing on seed filtering and visualization. It is a fork of the original Blueprint project, emphasizing experimental features and the "JAML" (Joker Analysis Markup Language) system.

## Tech Stack
- **Framework**: React 18+ (Functional Components, Hooks)
- **Language**: TypeScript (Strict mode preferred)
- **UI Library**: Mantine v8 (@mantine/core, @mantine/hooks, etc.)
- **Icons**: @tabler/icons-react
- **State Management**: Zustand, React Query (@tanstack/react-query)
- **Build Tool**: Vite
- **Testing**: Vitest
- **Data Serialization**: JAML (YAML-based) using `js-yaml`
- **Engine**: WASM via `motely-wasm`

## Coding Standards
- **Components**: Use functional components with arrow functions. Prefer Mantine components over raw HTML.
- **Styling**: Use Mantine's style props, `className` with CSS Modules (`.module.scss` or `.module.css`), or Mantine's theme system. 
- **Type Safety**: Always define interfaces or types for props and data models. Use the predefined enums and types in `src/modules/balatrots/enum/`.
- **State**: Use specialized providers in `src/modules/state/` (e.g., `optionsProvider.tsx`, `analysisResultProvider.tsx`) or Zustand stores in `src/modules/state/store.ts`.
- **Naming**: 
  - Components: PascalCase (e.g., `JamlEditor.tsx`)
  - Hooks: `use` prefix (e.g., `useJamlSearch.ts`)
  - Modules: camelCase or kebab-case

## Domain Knowledge (Balatro / JAML)
- **Seeds**: 8-character strings (e.g., `2K9H9HN`).
- **JAML**: A YAML-based DSL for defining filters for Balatro seeds. It includes sections like `name`, `author`, `deck`, `stake`, `must`, `should`, and `seeds`.
- **Search Modes**:
  - `quick`: Search a specific number of seeds (1k, 100k, etc.) or a single seed.
  - `sequential`: Search between a range of seeds.
  - `funny`: Specialized searches for palindromes or keywords.
- **Antes/Packs**: The game is structured in Antes (1-8 typically). Shops contain booster packs and shop slots.
- **WASM**: Seed analysis is often performed using WebAssembly (`motely-wasm`) with configurable thread counts and batch sizes.

## File Structure
- `src/components/blueprint/`: Core UI divided by view types (`jamlView`, `simpleView`, `snapshotView`, `standardView`).
- `src/modules/balatrots/`: Core logic for Balatro game mechanics and analysis.
- `src/modules/state/`: Context providers and global state stores.
- `src/themes/`: Custom Mantine themes (e.g., `Goomy.ts`, `Sylveon.ts`).

## Guidelines for Copilot
- When suggesting UI changes, prioritize Mantine v8 components and patterns.
- When working with JAML, respect the YAML structure and the `JAML_PRESETS` defined in the project.
- If modifying game logic, refer to `src/modules/balatrots/` for existing enums and types to ensure consistency.
- Maintain the "experimental" and "performance-focused" nature of the JAML search implementation.
- Use `lucide-react` or `@tabler/icons-react` for icons as per existing patterns.
