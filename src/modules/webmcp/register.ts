import { initializeWebMCPPolyfill } from "@mcp-b/webmcp-polyfill";
import { listTools, onToolsChanged, registerTools } from "./registry.ts";
import { blueprintTools } from "./tools.ts";
import type { BlueprintTool } from "./registry.ts";

interface ModelContextLike {
    registerTool: (
        tool: {
            name: string;
            description: string;
            inputSchema: BlueprintTool["inputSchema"];
            annotations?: { readOnlyHint?: boolean; consequentialHint?: boolean };
            execute: (input: Record<string, unknown>, options?: { signal?: AbortSignal }) => Promise<unknown>;
        },
        options?: { signal?: AbortSignal },
    ) => Promise<void>;
}

const READ_ONLY = new Set(["get_app_state", "get_seed_overview", "get_ante_details", "find_items", "list_purchases", "get_jaml_filter"]);

function modelContext(): ModelContextLike | undefined {
    const doc = document as Document & { modelContext?: ModelContextLike };
    if (doc.modelContext?.registerTool) return doc.modelContext;
    const nav = navigator as Navigator & { modelContext?: ModelContextLike };
    return nav.modelContext?.registerTool ? nav.modelContext : undefined;
}

let controller: AbortController | null = null;

async function publish() {
    const ctx = modelContext();
    if (!ctx) return;
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    for (const tool of listTools()) {
        if (signal.aborted) return;
        try {
            await ctx.registerTool(
                {
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema,
                    annotations: { readOnlyHint: READ_ONLY.has(tool.name), consequentialHint: !READ_ONLY.has(tool.name) },
                    execute: async (input) => JSON.stringify(await tool.execute(input ?? {})),
                },
                { signal },
            );
        } catch (error) {
            if (signal.aborted) return;
            console.warn(`WebMCP: could not register ${tool.name}`, error);
        }
    }
}

let started = false;

export function startWebMcp() {
    if (started || typeof document === "undefined") return;
    started = true;
    initializeWebMCPPolyfill();
    registerTools(blueprintTools);
    onToolsChanged(() => void publish());
    void publish();
}
