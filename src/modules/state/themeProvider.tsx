import * as React from "react";
import { createContext, useContext, useState } from "react";

import MantineThemeFile from "../../themes/Mantine.ts";
import VivillanThemeFile from "../../themes/Vivillan.ts";
import MurkrowThemeFile from "../../themes/Murkrow.ts";
import SylveonThemeFile from "../../themes/Sylveon.ts";
import { JamlTheme } from "../../themes/JamlTheme.ts";
import type { MantineThemeOverride } from "@mantine/core";

export type KnownThemes = "Mantine" |
    "Vivillan" |
    "Murkrow" |
    "Sylveon" |
    "Jaml";
const themes = {
    Mantine: MantineThemeFile,
    Vivillan: VivillanThemeFile,
    Murkrow: MurkrowThemeFile,
    Sylveon: SylveonThemeFile,
    Jaml: JamlTheme,
};
export const themeNames = Object.keys(themes) as Array<KnownThemes>;
export const BlueprintThemeContext = createContext<{ theme: KnownThemes, themes: Record<KnownThemes, MantineThemeOverride>, setTheme: (theme: KnownThemes) => void } | undefined>({
    theme: "Mantine",
    themes,

    setTheme: () => { },
});

export function useBlueprintTheme() {
    const context = useContext(BlueprintThemeContext);
    if (!context) {
        throw new Error("useBlueprintTheme must be used within a SeedResultProvider");
    }
    return context;
}

export function BlueprintThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<KnownThemes>(
        Object.keys(themes)[0] as KnownThemes,
    );



    return (
        <BlueprintThemeContext.Provider value={{ theme, themes, setTheme }}>
            {children}
        </BlueprintThemeContext.Provider>
    )


}
