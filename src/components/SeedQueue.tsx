import { useEffect, useState } from "react";
import { ActionIcon, Badge, Button, Group, Stack, Text, Textarea, Tooltip } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight, IconPlayerSkipBack, IconPlayerSkipForward, IconTrash } from "@tabler/icons-react";
import { parseSeedList, useCardStore } from "../modules/state/store.ts";
import { prefetchSeedAnalysis } from "../modules/state/analysisResultProvider.tsx";

const PREFETCH_RADIUS = 2;

export function SeedQueueHotkeys() {
    const seeds = useCardStore(state => state.seedQueue.seeds);
    const index = useCardStore(state => state.seedQueue.index);
    const engineState = useCardStore(state => state.engineState);
    const viewMode = useCardStore(state => state.applicationState.viewMode);
    const stepSeedQueue = useCardStore(state => state.stepSeedQueue);
    const jumpSeedQueue = useCardStore(state => state.jumpSeedQueue);

    const guarded = (fn: () => void) => () => {
        if (viewMode !== 'jaml') fn();
    };

    useHotkeys([
        ["ArrowRight", guarded(() => stepSeedQueue(1))],
        ["ArrowLeft", guarded(() => stepSeedQueue(-1))],
        ["Home", guarded(() => jumpSeedQueue(0))],
        ["End", guarded(() => jumpSeedQueue(seeds.length - 1))],
    ]);

    useEffect(() => {
        if (seeds.length === 0) return;
        const targets: Array<string> = [];
        for (let offset = 1; offset <= PREFETCH_RADIUS; offset++) {
            if (seeds[index + offset]) targets.push(seeds[index + offset]);
            if (seeds[index - offset]) targets.push(seeds[index - offset]);
        }
        let cancelled = false;
        const run = () => {
            if (cancelled) return;
            const next = targets.shift();
            if (!next) return;
            prefetchSeedAnalysis(next);
            setTimeout(run, 0);
        };
        const timer = setTimeout(run, 150);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [seeds, index, engineState]);

    return null;
}

export function SeedQueueControls() {
    const seeds = useCardStore(state => state.seedQueue.seeds);
    const index = useCardStore(state => state.seedQueue.index);
    const stepSeedQueue = useCardStore(state => state.stepSeedQueue);
    const jumpSeedQueue = useCardStore(state => state.jumpSeedQueue);
    if (seeds.length === 0) return null;
    return (
        <Group gap={4} wrap="nowrap">
            <ActionIcon variant="default" size="sm" onClick={() => jumpSeedQueue(0)} disabled={index === 0} aria-label="First seed">
                <IconPlayerSkipBack size={14} />
            </ActionIcon>
            <ActionIcon variant="default" size="sm" onClick={() => stepSeedQueue(-1)} disabled={index === 0} aria-label="Previous seed">
                <IconChevronLeft size={14} />
            </ActionIcon>
            <Tooltip label="ArrowLeft / ArrowRight step, Home / End jump">
                <Badge variant="light" size="lg" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {index + 1} / {seeds.length}
                </Badge>
            </Tooltip>
            <ActionIcon variant="default" size="sm" onClick={() => stepSeedQueue(1)} disabled={index >= seeds.length - 1} aria-label="Next seed">
                <IconChevronRight size={14} />
            </ActionIcon>
            <ActionIcon variant="default" size="sm" onClick={() => jumpSeedQueue(seeds.length - 1)} disabled={index >= seeds.length - 1} aria-label="Last seed">
                <IconPlayerSkipForward size={14} />
            </ActionIcon>
        </Group>
    );
}

export function SeedQueuePanel() {
    const seeds = useCardStore(state => state.seedQueue.seeds);
    const setSeedQueue = useCardStore(state => state.setSeedQueue);
    const clearSeedQueue = useCardStore(state => state.clearSeedQueue);
    const [text, setText] = useState("");
    const parsed = parseSeedList(text);

    const load = () => {
        if (parsed.length === 0) return;
        setSeedQueue(parsed);
        setText("");
    };

    return (
        <Stack gap="xs" mb="xs">
            <Textarea
                id="seed-queue-input"
                label="Seed list"
                description="Paste seeds (one per line, comma or space separated, or a CSV with seeds in the first column). Arrow keys step through them."
                placeholder={"ALEEB\nPIROCKS\nWEEJOKER"}
                autosize
                minRows={2}
                maxRows={6}
                value={text}
                onChange={(e) => setText(e.currentTarget.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) load();
                }}
            />
            <Group gap="xs" wrap="nowrap">
                <Button id="seed-queue-load" size="xs" onClick={load} disabled={parsed.length === 0} style={{ flex: 1 }}>
                    Load {parsed.length > 0 ? parsed.length : ""} seeds
                </Button>
                {seeds.length > 0 && (
                    <Tooltip label="Clear seed list">
                        <ActionIcon variant="default" size="lg" onClick={clearSeedQueue} aria-label="Clear seed list">
                            <IconTrash size={16} />
                        </ActionIcon>
                    </Tooltip>
                )}
            </Group>
            {seeds.length > 0 && (
                <Group justify="space-between">
                    <Text size="xs" c="dimmed">{seeds.length} queued</Text>
                    <SeedQueueControls />
                </Group>
            )}
        </Stack>
    );
}
