# Blueprint - pifreak's version!

---
#### ***Balatro Seed Tools***

* Based on [The Soul](https://github.com/MathIsFun0/The-Soul/blob/main/immolate.js) from [MathIsFun0](https://github.com/MathIsFun0)
* Built with Vite And Mantine for a clean and visually cohesive experience. 
* Modified by pifreak-- and pifreak loves you!

## pifreak's experimentation:
* Added ability to create a "JAML Mapped"-View in Blueprint - pifreak's version!
* Added ability to search for seeds in your browser using WASM!
* Added ability to suffer immense pain, trying to use a UI created/modified by pifreak!
* Added ability to upload list of SEEDS in TXT or CSV format!

## Assistant, WebMCP, and seed lists
* **Chat button (top right):** an in-app Balatro assistant powered by the Anthropic API. Paste your own API key in its settings (it stays in your browser's localStorage and goes straight to `api.anthropic.com`). It reads and drives the app through tools: analyze a seed, read any ante's shop queue and packs, find items across antes, mark purchases, navigate, load seed lists, edit the JAML filter, and `remember` notes about you so later sessions are personalized.
* **WebMCP:** the same tools are registered on `document.modelContext` (with the `@mcp-b/webmcp-polyfill` fallback), so browser agents and the Chrome DevTools WebMCP pane / Model Context Tool Inspector extension can call `analyze_seed`, `get_seed_overview`, `find_items`, `buy_item`, `load_seed_list`, `step_seed_queue`, `set_jaml_filter` and friends directly.
* **Seed lists:** paste hundreds or thousands of seeds (one per line, comma/space separated, or a CSV with seeds in the first column) into the *Seed list* box in the sidebar. `ArrowLeft` / `ArrowRight` step through them, `Home` / `End` jump to the first/last; neighbours are pre-analyzed so switching is instant.

## pifreak's roadmap:
* Continue testing motely-wasm
* Continue unlocking performance using SharedArrayBuffer properly?
* No seriously why do I only get 8m/s for negleg? my pc get 35M/s per thread on that 💀 