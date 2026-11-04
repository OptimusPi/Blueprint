import {useViewportSize} from "@mantine/hooks";
import {ActionIcon, AppShell, Box, Burger, Button, Center, Container, CopyButton, Group, SegmentedControl, Title, Tooltip} from "@mantine/core";
import {IconMessageChatbot} from "@tabler/icons-react";
import {SeedQueueControls} from "../../SeedQueue.tsx";
import {useCardStore} from "../../../modules/state/store.ts";
import SearchSeedInput from "../../searchInput.tsx";
import {GaEvent} from "../../../modules/useGA.ts";
import {viewModeOptions} from "./navbar.tsx";

export default function Header() {
    const { width } = useViewportSize();
    const start = useCardStore(state => state.applicationState.start)
    const settingsOpened = useCardStore(state => state.applicationState.settingsOpen);
    const toggleSettings = useCardStore(state => state.toggleSettings);
    const navbarHidden = useCardStore(state => state.applicationState.navbarHidden);
    const toggleNavbar = useCardStore(state => state.toggleNavbar);
    const wide = width > 1000;

    const outputOpened = useCardStore(state => state.applicationState.asideOpen);
    const toggleOutput = useCardStore(state => state.toggleOutput);
    const assistantOpened = useCardStore(state => state.applicationState.assistantOpen);
    const toggleAssistant = useCardStore(state => state.toggleAssistant);
    const viewMode = useCardStore(state => state.applicationState.viewMode);
    const setViewMode = useCardStore(state => state.setViewMode);
    const queuedSeeds = useCardStore(state => state.seedQueue.seeds.length);

    return (
        <AppShell.Header>
            <Container fluid h={'100%'}>
                <Group h={'100%'} justify={'space-between'}>
                    <Group flex={1}>
                        {viewMode !== 'jaml' && <Burger opened={settingsOpened} onClick={toggleSettings} hiddenFrom={'md'} size="sm" />}
                        {viewMode !== 'jaml' && (
                            <Tooltip label={(wide ? navbarHidden : !settingsOpened) ? 'Show settings' : 'Hide settings'}>
                                <Burger
                                    id="settings-panel-toggle"
                                    opened={wide ? !navbarHidden : settingsOpened}
                                    onClick={wide ? toggleNavbar : toggleSettings}
                                    visibleFrom={'md'}
                                    size="sm"
                                />
                            </Tooltip>
                        )}
                        <Center h={'100%'}>
                            <Group grow>
                                <Box flex={1}>
                                    <Title > Blueprint </Title>
                                </Box>
                            </Group>
                        </Center>
                        {viewMode === 'jaml' && (
                            <SegmentedControl
                                size="xs"
                                value={viewMode}
                                onChange={(value: string) => setViewMode(value)}
                                data={viewModeOptions}
                            />
                        )}
                    </Group>

                    <Group align={'center'}>
                        {(viewMode !== 'jaml' || queuedSeeds > 0) && width > 600 && <SeedQueueControls />}
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
