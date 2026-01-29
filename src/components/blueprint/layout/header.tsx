import React from "react";
import {useViewportSize} from "@mantine/hooks";
import {ActionIcon, AppShell, Box, Burger, Button, Center, Container, CopyButton, Group, Select, Title, Tooltip, useMantineColorScheme} from "@mantine/core";
import {IconMoon, IconSun} from "@tabler/icons-react";
import {useCardStore} from "../../../modules/state/store.ts";
import SearchSeedInput from "../../searchInput.tsx";
import {GaEvent} from "../../../modules/useGA.ts";
import {useBlueprintTheme} from "../../../modules/state/themeProvider.tsx";
import type {KnownThemes} from "../../../modules/state/themeProvider.tsx";


export default function Header() {
    const {width} = useViewportSize();
    const colorScheme = useMantineColorScheme();
    const {theme: themeName, setTheme, themes} = useBlueprintTheme();
    const themeNames = Object.keys(themes);
    const start = useCardStore(state => state.applicationState.start)
    const settingsOpened = useCardStore(state => state.applicationState.settingsOpen);
    const toggleSettings = useCardStore(state => state.toggleSettings);

    const outputOpened = useCardStore(state => state.applicationState.asideOpen);
    const toggleOutput = useCardStore(state => state.toggleOutput);
    const headerGap = width > 600 ? 'md' : 'xs';
    const rightGap = width > 600 ? 'sm' : 'xs';
    const isDark = colorScheme.colorScheme === 'dark';
    return (
        <AppShell.Header>
            <Container fluid h={'100%'} px={{ base: 'xs', sm: 'md' }}>
                <Group h={'100%'} justify={'space-between'} gap={headerGap}>
                    <Group flex={1} gap={headerGap} align="center">
                        <Center h={'100%'}>
                            <Burger 
                                opened={settingsOpened} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSettings();
                                }} 
                                size="sm"
                            />
                        </Center>
                        <Center h={'100%'}>
                            <Group grow>
                                <Box flex={1}>
                                    <Title order={5} fz={{ base: 'xs', sm: 'sm' }}> Blueprint </Title>
                                </Box>
                            </Group>
                        </Center>
                    </Group>

                    <Group align={'center'} gap={rightGap}>
                        {width > 600 && start && <SearchSeedInput/>}
                        {width > 700 && start && (
                            <CopyButton value={new URL(window.location.href).toString()}>
                                {({copied, copy}) => (
                                    <Button 
                                        color={copied ? 'teal' : 'blue'} 
                                        onClick={copy}
                                        size={width > 600 ? 'sm' : 'xs'}
                                    >
                                        {copied ? 'Copied url' : 'Copy url'}
                                    </Button>
                                )}
                            </CopyButton>
                        )}
                        <Select
                            size="xs"
                            w={width > 600 ? 100 : 80}
                            value={themeName}
                            onChange={(t) => { if (t) setTheme(t as KnownThemes); }}
                            data={themeNames}
                            styles={{ input: { fontSize: 'var(--mantine-font-size-xs)' } }}
                        />
                        <Tooltip label={isDark ? 'Light mode' : 'Dark mode'}>
                            <ActionIcon
                                variant="subtle"
                                size="lg"
                                onClick={() => colorScheme.toggleColorScheme()}
                                aria-label="Toggle dark mode"
                            >
                                {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
                            </ActionIcon>
                        </Tooltip>
                        <Burger opened={outputOpened} onClick={()=>{
                            GaEvent('side_panel_toggled')
                            toggleOutput()
                        }} size="sm"/>
                    </Group>
                </Group>
            </Container>
        </AppShell.Header>
    )
}
