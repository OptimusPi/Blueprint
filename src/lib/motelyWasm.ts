/**
 * MotelyWasm wrapper for JAML seed searching via WebAssembly
 * This is a stub implementation to allow the app to compile.
 * In production, this would interface with motely-wasm package.
 */

export interface WasmCapabilities {
    version: string;
    simd: boolean;
}

export interface WasmOptions {
    threadCount?: number;
    batchSize?: number;
    palindrome?: boolean;
}

export interface WasmCallbacks {
    onProgress?: (totalSearched: number, matching: number, elapsedMs: number, resultCount: number) => void;
    onResult?: (seed: string, score: number) => void;
}

export interface WasmResult {
    results?: Array<{ seed: string; score: number }>;
    status: string;
    error?: string;
}

/**
 * Get WASM capabilities and version info
 */
export async function getWasmCapabilities(): Promise<WasmCapabilities> {
    return {
        version: '1.2.11',
        simd: typeof SharedArrayBuffer !== 'undefined',
    };
}

/**
 * Start a JAML seed search using WASM
 */
export async function startJamlSearchWasm(
    jamlText: string,
    options: WasmOptions = {},
    callbacks: WasmCallbacks = {}
): Promise<WasmResult> {
    // Stub implementation - return empty results
    return {
        results: [],
        status: 'completed',
    };
}

/**
 * Cancel an active WASM search
 */
export async function cancelSearchWasm(): Promise<void> {
    // Stub implementation
    return Promise.resolve();
}
