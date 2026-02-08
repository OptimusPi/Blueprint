import type { MotelyWasmApi, SearchOptions, SearchStatusInfo } from 'motely-wasm';

let wasmApi: MotelyWasmApi | null = null;
let initPromise: Promise<MotelyWasmApi> | null = null;

export async function getWasmApi(): Promise<MotelyWasmApi> {
  if (wasmApi) return wasmApi;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const { loadMotely } = await import('motely-wasm');
    wasmApi = await loadMotely();
    return wasmApi;
  })();
  return initPromise;
}

export async function startJamlSearchWasm(
  jamlContent: string,
  options?: SearchOptions,
  handlers?: {
    onProgress?: (searchId: string, totalSeedsSearched: number, matchingSeeds: number, elapsedMs: number, resultCount: number) => void;
    onResult?: (searchId: string, seed: string, score: number) => void;
  },
): Promise<SearchStatusInfo> {
  const api = await getWasmApi();
  return api.startJamlSearch(jamlContent, {
    ...options,
    onProgress: handlers?.onProgress,
    onResult: handlers?.onResult,
  });
}

export async function cancelSearchWasm(searchId: string): Promise<void> {
  const api = await getWasmApi();
  api.stopSearch(searchId);
  await api.disposeSearch(searchId);
}
