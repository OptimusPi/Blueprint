export interface ToolInputSchema {
    type: "object";
    properties?: Record<string, unknown>;
    required?: Array<string>;
    additionalProperties?: boolean;
}

export interface BlueprintTool {
    name: string;
    description: string;
    inputSchema: ToolInputSchema;
    execute: (input: Record<string, unknown>) => unknown | Promise<unknown>;
}

const tools = new Map<string, BlueprintTool>();
const listeners = new Set<() => void>();

function notify() {
    for (const listener of listeners) listener();
}

export function registerTool(tool: BlueprintTool): () => void {
    tools.set(tool.name, tool);
    notify();
    return () => {
        if (tools.get(tool.name) === tool) {
            tools.delete(tool.name);
            notify();
        }
    };
}

export function registerTools(list: Array<BlueprintTool>): () => void {
    const unregister = list.map(registerTool);
    return () => unregister.forEach((fn) => fn());
}

export function listTools(): Array<BlueprintTool> {
    return Array.from(tools.values());
}

export function onToolsChanged(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function callTool(name: string, input: Record<string, unknown> = {}): Promise<unknown> {
    const tool = tools.get(name);
    if (!tool) return Promise.reject(new Error(`Unknown tool: ${name}`));
    return Promise.resolve(tool.execute(input));
}
