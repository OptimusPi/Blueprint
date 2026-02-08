import { initDuckDbWasmResults as initDuckDbWasmResultsInternal, } from './duckdb';
/**
 * Loads the Motely WASM runtime from the specified base URL.
 * Use this in browser code when your bundler supports dynamic import of the WASM URL.
 *
 * @param baseUrl The public path where the motely-wasm files are served (e.g., '/motely-wasm' or 'https://cdn.example.com/motely').
 * @returns A promise that resolves to the MotelyWasmApi.
 */
export async function loadMotely(baseUrl = '/motely-wasm') {
    // Ensure trailing slash is removed for consistency, then append _framework/dotnet.js
    const cleanBase = baseUrl.replace(/\/$/, '');
    const dotnetUrl = `${cleanBase}/_framework/dotnet.js`;
    const bootConfigUrl = `${cleanBase}/_framework/dotnet.boot.js`;
    console.log(`[motely-wasm] Loading runtime from: ${dotnetUrl}`);
    try {
        // dynamic import with webpackIgnore to prevent bundlers from trying to resolve this at build time.
        // @ts-ignore
        const { dotnet } = await import(/* webpackIgnore: true */ /* @vite-ignore */ dotnetUrl);
        const { getAssemblyExports, getConfig } = await dotnet
            .withConfigSrc(bootConfigUrl)
            .create();
        const config = getConfig();
        const exports = await getAssemblyExports(config.mainAssemblyName);
        const api = exports.Motely.WASM.MotelyWasm;
        return api;
    }
    catch (err) {
        console.error(`[motely-wasm] Failed to load WASM runtime:`, err);
        throw new Error(`Motely WASM Init Failed: ${err.message || String(err)}`);
    }
}
/**
 * Initialize DuckDB-WASM results storage and hook into MotelyWasmOnResult.
 * Call this before starting a search if you want browser-side results persisted in DuckDB-WASM.
 */
export async function initDuckDbWasmResults(options = {}) {
    return initDuckDbWasmResultsInternal(options);
}
