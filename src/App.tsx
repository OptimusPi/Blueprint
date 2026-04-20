import "@mantine/core/styles.css";
import '@mantine/code-highlight/styles.css';
import '@mantine/carousel/styles.css';
import '@mantine/spotlight/styles.css';


import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Blueprint } from "./components/blueprint/standardView";
import { SeedResultProvider } from "./modules/state/analysisResultProvider.tsx";
import { SeedOptionsProvider } from "./modules/state/optionsProvider.tsx";
import { DownloadSeedResultProvider } from "./modules/state/downloadProvider.tsx";
import { BlueprintThemeProvider, useBlueprintTheme } from "./modules/state/themeProvider.tsx";
import { JamlSearchProvider } from "./modules/state/jamlSearchContext.tsx";

const queryClient = new QueryClient()

function ProviderContainer({ children }: { children: React.ReactNode }) {
    const { theme, themes } = useBlueprintTheme()

    return (

        <MantineProvider defaultColorScheme={'dark'} theme={themes[theme]}>
            <QueryClientProvider client={queryClient}>
                <SeedOptionsProvider>
                    <SeedResultProvider>
                        <DownloadSeedResultProvider>
                                    {children}
                        </DownloadSeedResultProvider>
                    </SeedResultProvider>
                </SeedOptionsProvider>
            </QueryClientProvider>
        </MantineProvider>
    );
}

export default function App() {
    return (
        <BlueprintThemeProvider>
            <JamlSearchProvider>
                <ProviderContainer>
                    <Blueprint/>
                </ProviderContainer>
            </JamlSearchProvider>
        </BlueprintThemeProvider>
    );
}
