import { useEffect, useRef, useState } from "react";
import Anthropic from "@anthropic-ai/sdk";
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import {
    ActionIcon,
    Badge,
    Button,
    Code,
    Drawer,
    Group,
    Paper,
    PasswordInput,
    ScrollArea,
    Select,
    Stack,
    Text,
    Textarea,
    Tooltip,
} from "@mantine/core";
import { IconPlayerStop, IconSend, IconSettings, IconTrash } from "@tabler/icons-react";
import { useCardStore } from "../modules/state/store.ts";
import { listTools } from "../modules/webmcp/registry.ts";
import { listMemory } from "../modules/webmcp/memory.ts";
import { BALATRO_KNOWLEDGE } from "../modules/webmcp/knowledge.ts";
import type { BlueprintTool } from "../modules/webmcp/registry.ts";

const KEY_STORAGE = "blueprint-anthropic-key";
const MODEL_STORAGE = "blueprint-assistant-model";
const HISTORY_STORAGE = "blueprint-assistant-history";
const MODELS = [
    { value: "claude-opus-5", label: "Claude Opus 5" },
    { value: "claude-sonnet-5", label: "Claude Sonnet 5" },
    { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
];
const MAX_HISTORY_MESSAGES = 60;

const SYSTEM_PROMPT = `You are the Blueprint assistant, embedded in Blueprint: a Balatro seed analyzer and router that runs in the user's browser.
You have tools that read and drive the app: analyze seeds, read per-ante shop queues, packs, tags, vouchers and bosses, search a seed for items, navigate the view, mark purchases, load seed lists, and remember notes about the user.
Use the tools instead of guessing: any question about a specific seed must be answered from get_seed_overview / get_ante_details / find_items. Call get_app_state first when you do not know what is loaded.
When the user shares what they like (decks, strategies, jokers, seeds they hunt), call remember so future sessions are personalized.
Answer like a sharp Balatro player talking to another one: concrete antes, shop indices, pack names. Short paragraphs, no filler.`;

interface Turn {
    role: "user" | "assistant";
    text: string;
    tools: Array<{ name: string; ok: boolean }>;
}

type History = Array<Anthropic.Beta.BetaMessageParam>;

function readStorage(key: string): string {
    try {
        return localStorage.getItem(key) ?? "";
    } catch {
        return "";
    }
}

function writeStorage(key: string, value: string) {
    try {
        if (value) localStorage.setItem(key, value);
        else localStorage.removeItem(key);
    } catch {
        return;
    }
}

function loadHistory(): History {
    try {
        const parsed = JSON.parse(readStorage(HISTORY_STORAGE) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function turnsFromHistory(history: History): Array<Turn> {
    const turns: Array<Turn> = [];
    for (const message of history) {
        if (message.role === "system") continue;
        if (typeof message.content === "string") {
            turns.push({ role: message.role, text: message.content, tools: [] });
            continue;
        }
        const text = message.content
            .filter((block): block is Anthropic.Beta.BetaTextBlockParam => block.type === "text")
            .map((block) => block.text)
            .join("");
        const toolUses = message.content
            .filter((block): block is Anthropic.Beta.BetaToolUseBlockParam => block.type === "tool_use")
            .map((block) => ({ name: block.name, ok: true }));
        if (message.role === "assistant") {
            const last = turns[turns.length - 1];
            if (last && last.role === "assistant") {
                last.text += text;
                last.tools.push(...toolUses);
            } else {
                turns.push({ role: "assistant", text, tools: toolUses });
            }
        } else if (text) {
            turns.push({ role: "user", text, tools: [] });
        }
    }
    return turns;
}

function runnableTools(tools: Array<BlueprintTool>, onCall: (name: string, ok: boolean) => void) {
    return tools.map((tool) =>
        betaTool({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema as Parameters<typeof betaTool>[0]["inputSchema"],
            run: async (args) => {
                try {
                    const result = await tool.execute((args ?? {}) as Record<string, unknown>);
                    onCall(tool.name, true);
                    return JSON.stringify(result);
                } catch (error) {
                    onCall(tool.name, false);
                    throw error;
                }
            },
        }),
    );
}

function contextBlock(): string {
    const s = useCardStore.getState();
    const notes = listMemory();
    const lines = [
        `Loaded seed: ${s.engineState.seed || "(none)"} on ${s.engineState.deck}, ${s.engineState.stake}, antes 1-${s.engineState.maxAnte}, view ${s.applicationState.viewMode}.`,
        `Seed queue: ${s.seedQueue.seeds.length} seeds, position ${s.seedQueue.index + 1}.`,
    ];
    if (notes.length > 0) lines.push(`Notes about this user:\n- ${notes.join("\n- ")}`);
    return lines.join("\n");
}

export default function AssistantDrawer() {
    const opened = useCardStore(state => state.applicationState.assistantOpen);
    const toggleAssistant = useCardStore(state => state.toggleAssistant);

    const [apiKey, setApiKey] = useState(() => readStorage(KEY_STORAGE));
    const [model, setModel] = useState(() => readStorage(MODEL_STORAGE) || MODELS[0].value);
    const [showSettings, setShowSettings] = useState(() => !readStorage(KEY_STORAGE));
    const [history, setHistory] = useState<History>(loadHistory);
    const [turns, setTurns] = useState<Array<Turn>>(() => turnsFromHistory(loadHistory()));
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const viewportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight });
    }, [turns]);

    const persist = (next: History) => {
        const trimmed = next.length > MAX_HISTORY_MESSAGES ? next.slice(next.length - MAX_HISTORY_MESSAGES) : next;
        setHistory(trimmed);
        writeStorage(HISTORY_STORAGE, JSON.stringify(trimmed));
    };

    const clear = () => {
        persist([]);
        setTurns([]);
        setError(null);
    };

    const stop = () => abortRef.current?.abort();

    const send = async () => {
        const text = draft.trim();
        if (!text || busy) return;
        if (!apiKey) {
            setShowSettings(true);
            setError("Add your Anthropic API key first.");
            return;
        }
        setDraft("");
        setError(null);
        setBusy(true);
        const userMessage: Anthropic.Beta.BetaMessageParam = { role: "user", content: text };
        const startingHistory: History = [...history, userMessage];
        setTurns((prev) => [...prev, { role: "user", text, tools: [] }, { role: "assistant", text: "", tools: [] }]);

        const patchAssistant = (patch: (turn: Turn) => Turn) =>
            setTurns((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") next[next.length - 1] = patch(last);
                return next;
            });

        const dropEmptyAssistant = () =>
            setTurns((prev) => {
                const last = prev[prev.length - 1];
                return last?.role === "assistant" && !last.text && last.tools.length === 0 ? prev.slice(0, -1) : prev;
            });

        const controller = new AbortController();
        abortRef.current = controller;
        const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
        const runner = client.beta.messages.toolRunner(
            {
                model,
                max_tokens: 16000,
                stream: true,
                max_iterations: 16,
                betas: ["server-side-fallback-2026-07-01"],
                fallbacks: "default",
                output_config: { effort: "medium" },
                system: [
                    { type: "text", text: `${SYSTEM_PROMPT}\n\n${BALATRO_KNOWLEDGE}`, cache_control: { type: "ephemeral" } },
                    { type: "text", text: contextBlock() },
                ],
                tools: runnableTools(listTools(), (name, ok) =>
                    patchAssistant((turn) => ({ ...turn, tools: [...turn.tools, { name, ok }] })),
                ),
                messages: startingHistory,
            },
            { signal: controller.signal },
        );

        try {
            for await (const stream of runner) {
                stream.on("text", (delta) => patchAssistant((turn) => ({ ...turn, text: turn.text + delta })));
                const message = await stream.finalMessage();
                if (message.stop_reason === "pause_turn") {
                    runner.pushMessages({ role: "assistant", content: message.content });
                }
                if (message.stop_reason === "refusal") {
                    setError(message.stop_details?.explanation ?? "The model declined this request.");
                }
            }
            persist(runner.params.messages as History);
        } catch (err) {
            if (controller.signal.aborted) {
                persist(runner.params.messages as History);
            } else if (err instanceof Anthropic.AuthenticationError) {
                setError("Anthropic rejected the API key.");
                setShowSettings(true);
            } else if (err instanceof Anthropic.RateLimitError) {
                setError("Rate limited by Anthropic. Try again in a moment.");
            } else if (err instanceof Anthropic.APIError) {
                setError(`Anthropic API error ${err.status}: ${err.message}`);
            } else {
                setError(err instanceof Error ? err.message : String(err));
            }
        } finally {
            dropEmptyAssistant();
            abortRef.current = null;
            setBusy(false);
        }
    };

    return (
        <Drawer
            opened={opened}
            onClose={toggleAssistant}
            position="right"
            size="md"
            title={
                <Group gap="xs">
                    <Text fw={700}>Blueprint assistant</Text>
                    <Badge variant="light" size="sm">{listTools().length} tools</Badge>
                </Group>
            }
            styles={{ body: { display: "flex", flexDirection: "column", height: "calc(100% - 60px)", gap: 8 } }}
        >
            <Group gap="xs" justify="space-between">
                <Group gap="xs">
                    <Tooltip label="Settings">
                        <ActionIcon variant={showSettings ? "filled" : "default"} onClick={() => setShowSettings((v) => !v)} aria-label="Assistant settings">
                            <IconSettings size={16} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Clear conversation">
                        <ActionIcon variant="default" onClick={clear} disabled={busy || turns.length === 0} aria-label="Clear conversation">
                            <IconTrash size={16} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
                <Text size="xs" c="dimmed">Tools also exposed via WebMCP (document.modelContext)</Text>
            </Group>

            {showSettings && (
                <Paper withBorder p="sm">
                    <Stack gap="xs">
                        <PasswordInput
                            id="assistant-api-key"
                            label="Anthropic API key"
                            description="Stored only in this browser (localStorage) and sent straight to api.anthropic.com."
                            placeholder="sk-ant-..."
                            value={apiKey}
                            onChange={(e) => {
                                setApiKey(e.currentTarget.value);
                                writeStorage(KEY_STORAGE, e.currentTarget.value.trim());
                            }}
                        />
                        <Select
                            label="Model"
                            data={MODELS}
                            value={model}
                            allowDeselect={false}
                            onChange={(value) => {
                                if (!value) return;
                                setModel(value);
                                writeStorage(MODEL_STORAGE, value);
                            }}
                        />
                    </Stack>
                </Paper>
            )}

            <ScrollArea style={{ flex: 1 }} viewportRef={viewportRef} type="auto">
                <Stack gap="sm" p="xs">
                    {turns.length === 0 && (
                        <Text size="sm" c="dimmed">
                            Ask about the loaded seed, hunt items across antes, mark purchases, or paste a seed list. The assistant drives the app through the same tools browser agents get via WebMCP.
                        </Text>
                    )}
                    {turns.map((turn, i) => (
                        <Paper
                            key={i}
                            p="sm"
                            radius="md"
                            withBorder
                            style={{ alignSelf: turn.role === "user" ? "flex-end" : "flex-start", maxWidth: "92%" }}
                        >
                            {turn.tools.length > 0 && (
                                <Group gap={4} mb={6}>
                                    {turn.tools.map((call, j) => (
                                        <Badge key={j} size="xs" variant="dot" color={call.ok ? "teal" : "red"}>{call.name}</Badge>
                                    ))}
                                </Group>
                            )}
                            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                                {turn.text || (busy && i === turns.length - 1 ? "…" : "")}
                            </Text>
                        </Paper>
                    ))}
                    {error && <Code block color="red">{error}</Code>}
                </Stack>
            </ScrollArea>

            <Group gap="xs" align="flex-end" wrap="nowrap">
                <Textarea
                    id="assistant-input"
                    placeholder="Where is Perkeo in this seed? Load these seeds… Buy the Blueprint in ante 2…"
                    autosize
                    minRows={1}
                    maxRows={5}
                    style={{ flex: 1 }}
                    value={draft}
                    onChange={(e) => setDraft(e.currentTarget.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void send();
                        }
                    }}
                />
                {busy ? (
                    <Button color="red" onClick={stop} leftSection={<IconPlayerStop size={16} />}>Stop</Button>
                ) : (
                    <Button id="assistant-send" onClick={() => void send()} disabled={!draft.trim()} leftSection={<IconSend size={16} />}>Send</Button>
                )}
            </Group>
        </Drawer>
    );
}
