import React from "react";
import {useViewportSize} from "@mantine/hooks";
import {ActionIcon, AppShell, Box, Burger, Button, Center, Container, CopyButton, Group, Title, Tooltip} from "@mantine/core";
import {IconMessageChatbot} from "@tabler/icons-react";
import {SeedQueueControls} from "../../SeedQueue.tsx";
import {useCardStore} from "../../../modules/state/store.ts";
import SearchSeedInput from "../../searchInput.tsx";
import {GaEvent} from "../../../modules/useGA.ts";

export default function Header() {
    const { width } = useViewportSize();
    const start = useCardStore(state => state.applicationState.start)
    const settingsOpened = useCardStore(state => state.applicationState.settingsOpen);
    const toggleSettings = useCardStore(state => state.toggleSettings);

    const outputOpened = useCardStore(state => state.applicationState.asideOpen);
    const toggleOutput = useCardStore(state => state.toggleOutput);
    const assistantOpened = useCardStore(state => state.applicationState.assistantOpen);
    const toggleAssistant = useCardStore(state => state.toggleAssistant);

    return (
        <AppShell.Header>
            <Container fluid h={'100%'}>
                <Group h={'100%'} justify={'space-between'}>
                    <Group flex={1}>
                        <Burger opened={settingsOpened} onClick={toggleSettings} hiddenFrom={'md'} size="sm" />
                        <Center h={'100%'}>
                            <Group grow>
                                <Box flex={1}>
                                    <Title > Blueprint </Title>
                                </Box>
                            </Group>
                        </Center>
                    </Group>

                    <Group align={'center'}>
                        {width > 900 && <SeedQueueControls />}
                        {width > 600 && start && <Box id="search-input-header"><SearchSeedInput /></Box>}
                        {width > 700 && start && (
                            <CopyButton value={new URL(window.location.href).toString()}>
                                {({ copied, copy }) => (
                                    <Button color={copied ? 'teal' : 'blue'} onClick={copy}>
                                        {copied ? 'Copied url' : 'Copy url'}
                                    </Button>
                                )}
                            </CopyButton>
                        )}
                        <Tooltip label="Chat with the Blueprint assistant">
                            <ActionIcon
                                id="assistant-toggle"
                                variant={assistantOpened ? 'filled' : 'default'}
                                size="lg"
                                aria-label="Open assistant"
                                onClick={toggleAssistant}
                            >
                                <IconMessageChatbot size={20} />
                            </ActionIcon>
                        </Tooltip>
                        <Burger id="side-panel-toggle" opened={outputOpened} onClick={() => {
                            GaEvent('side_panel_toggled')
                            toggleOutput()
                        }} size="sm" />
                    </Group>
                </Group>
            </Container>
        </AppShell.Header>
    )
}
