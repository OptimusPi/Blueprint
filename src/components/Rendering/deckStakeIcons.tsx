import React from "react";
import {Box} from "@mantine/core";
import {SimpleRenderCanvas} from "./canvasRenderer.tsx";
import {createDeckBackLayer, createStakeChipLayer} from "../../modules/deckStakeHelpers.ts";

export function DeckBackIcon({deckName}: { deckName: string }) {
    const layer = createDeckBackLayer(deckName);
    return (
        <Box 
            w={14}
            h={10}
            style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                position: 'relative',
                minWidth: '14px',
                maxWidth: '14px',
                minHeight: '10px',
                maxHeight: '10px'
            }}
        >
            <Box w={14} h={10} style={{ position: 'relative', overflow: 'hidden' }}>
                <SimpleRenderCanvas layers={[layer]} />
            </Box>
        </Box>
    );
}

export function StakeChipIcon({stakeName}: { stakeName: string }) {
    const layer = createStakeChipLayer(stakeName);
    return (
        <Box 
            w={14}
            h={14}
            style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                position: 'relative',
                minWidth: '14px',
                maxWidth: '14px',
                minHeight: '14px',
                maxHeight: '14px'
            }}
        >
            <Box w={14} h={14} style={{ position: 'relative', overflow: 'hidden' }}>
                <SimpleRenderCanvas layers={[layer]} />
            </Box>
        </Box>
    );
}
