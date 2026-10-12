import { useEffect } from "react";
import { useCardStore } from "../modules/state/store.ts";

export function SeedQueueBootstrap() {
    useEffect(() => {
        const state = useCardStore.getState();
        const { seeds, index } = state.seedQueue;
        if (seeds.length === 0) return;
        const expected = seeds[index];
        if (!expected) return;
        if (state.engineState.seed !== expected) {
            state.jumpSeedQueue(index);
            return;
        }
        if (!state.applicationState.start) {
            state.setStart(true);
        }
    }, []);

    return null;
}
