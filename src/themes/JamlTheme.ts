import { createTheme } from '@mantine/core';

// JAML Theme: Retro/Polaroid "Ink on Paper" Aesthetic
const JAML_PALETTE = {
    white: '#FFFFFF',
    black: '#000000',
    paperWhite: '#fbf9f5', // Soft off-white for Polaroid background
    paperCream: '#efebe0', // Slightly darker cream

    // Ink Colors (Slightly desaturated/darker than neon Balatro colors)
    inkRed: '#d93d32',
    inkBlue: '#007acc',
    inkGreen: '#3aa876',
    inkPurple: '#7a5cd6',
    inkGold: '#cfa242',
    inkOrange: '#e68a00',

    // UI Greys
    grey: '#3a5055',
    mediumGrey: '#33464b',
    darkGrey: '#1e2b2d',
    brightSilver: '#b9c2d2',
    lightSilver: '#a3acb9',
    greySilver: '#686e78',
    fadedGrey: '#565b5c',
    darkDullGrey: '#2d2d2d',
    dullGrey: '#5c5c5c',
    mediumShadow: '#1e2e32',
    darkShadow: '#0b1415',
    lightDullGrey: '#6b6b6b',
    lightDullWashGrey: '#545454',
};

const scale = (...values: Array<string>): [string, string, string, string, string, string, string, string, string, string] => [
    values[0], values[0],
    values[1] ?? values[0],
    values[1] ?? values[0],
    values[2] ?? values[1] ?? values[0],
    values[2] ?? values[1] ?? values[0],
    values[3] ?? values[2] ?? values[1] ?? values[0],
    values[3] ?? values[2] ?? values[1] ?? values[0],
    values[2] ?? values[1] ?? values[0],
    values[1] ?? values[0],
];

export const JamlTheme = createTheme({
    colors: {
        gray: scale(
            JAML_PALETTE.brightSilver,
            JAML_PALETTE.lightSilver,
            JAML_PALETTE.lightDullGrey,
            JAML_PALETTE.greySilver,
            JAML_PALETTE.fadedGrey,
            JAML_PALETTE.dullGrey,
            JAML_PALETTE.lightDullGrey,
            JAML_PALETTE.lightDullWashGrey,
            JAML_PALETTE.mediumGrey,
            JAML_PALETTE.darkGrey
        ),
        dark: scale(
            JAML_PALETTE.grey,
            JAML_PALETTE.mediumGrey,
            JAML_PALETTE.darkGrey,
            JAML_PALETTE.mediumShadow,
            JAML_PALETTE.darkShadow,
            JAML_PALETTE.darkDullGrey
        ),
        // Standard scales mapped to Ink colors
        red: scale(JAML_PALETTE.inkRed, '#ff6b60', '#ff857c'),
        blue: scale(JAML_PALETTE.inkBlue, '#33a9ff', '#66bfff'),
        green: scale(JAML_PALETTE.inkGreen, '#4ccfa0', '#6be0b5'),
        purple: scale(JAML_PALETTE.inkPurple, '#a98fe5', '#bca7e8'),
        gold: scale(JAML_PALETTE.inkGold, '#f0c755', '#f5d475'),
        orange: scale(JAML_PALETTE.inkOrange, '#ffa94d', '#ffc078'),

        // JAML Semantic Colors
        // 0-9 Scale. 6 is primary. 7-9 are lighter shades for text readability on dark, or ink wash on light.
        jamlRed: [
            JAML_PALETTE.inkRed, JAML_PALETTE.inkRed, JAML_PALETTE.inkRed, JAML_PALETTE.inkRed,
            JAML_PALETTE.inkRed, JAML_PALETTE.inkRed, JAML_PALETTE.inkRed, // 6 = Primary
            '#e66a60', '#f2968f', '#ffc2bd' // 7-9
        ],
        jamlBlue: [
            JAML_PALETTE.inkBlue, JAML_PALETTE.inkBlue, JAML_PALETTE.inkBlue, JAML_PALETTE.inkBlue,
            JAML_PALETTE.inkBlue, JAML_PALETTE.inkBlue, JAML_PALETTE.inkBlue, // 6 = Primary
            '#4da3ff', '#80c2ff', '#b3e0ff' // 7-9
        ],
        jamlGreen: [
            JAML_PALETTE.inkGreen, JAML_PALETTE.inkGreen, JAML_PALETTE.inkGreen, JAML_PALETTE.inkGreen,
            JAML_PALETTE.inkGreen, JAML_PALETTE.inkGreen, JAML_PALETTE.inkGreen, // 6 = Primary
            '#5cdb9e', '#85edbd', '#afffe0' // 7-9
        ],
        jamlPurple: [
            JAML_PALETTE.inkPurple, JAML_PALETTE.inkPurple, JAML_PALETTE.inkPurple, JAML_PALETTE.inkPurple,
            JAML_PALETTE.inkPurple, JAML_PALETTE.inkPurple, JAML_PALETTE.inkPurple, // 6 = Primary
            '#9e85e5', '#bfacf2', '#e0d4ff' // 7-9
        ],
        jamlGold: [
            JAML_PALETTE.inkGold, JAML_PALETTE.inkGold, JAML_PALETTE.inkGold, JAML_PALETTE.inkGold,
            JAML_PALETTE.inkGold, JAML_PALETTE.inkGold, JAML_PALETTE.inkGold, // 6 = Primary
            '#e5b85e', '#f2cf85', '#ffe6ad' // 7-9
        ],

        // Editor / Polaroid UI Colors ("Soft Polaroid" - Light Theme override)
        polaroidBg: scale(
            JAML_PALETTE.paperWhite,  // 0: Main Editor Background (Light)
            JAML_PALETTE.paperCream,  // 1: Secondary/Input Background
            JAML_PALETTE.white,
            JAML_PALETTE.white,
            JAML_PALETTE.white,
            JAML_PALETTE.white,
            JAML_PALETTE.white,
            JAML_PALETTE.white,
            JAML_PALETTE.white,
            JAML_PALETTE.white
        ),
        polaroidText: scale(
            JAML_PALETTE.black,       // 0: Main Text (Dark on Light)
            JAML_PALETTE.darkGrey,
            JAML_PALETTE.mediumGrey,
            JAML_PALETTE.grey,
            JAML_PALETTE.black,
            JAML_PALETTE.black,
            JAML_PALETTE.black,
            JAML_PALETTE.black,
            JAML_PALETTE.black,
            JAML_PALETTE.black
        ),
    },
    primaryColor: 'red',
    primaryShade: { light: 0, dark: 2 },
    white: JAML_PALETTE.white,
    black: JAML_PALETTE.black,
    autoContrast: true,
    luminanceThreshold: 0.4,
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilyMonospace: '"Fira Code", "JetBrains Mono", Consolas, Monaco, "Courier New", monospace',
    defaultRadius: 'md',
    activeClassName: 'mantine-active',
    focusClassName: 'mantine-focus-auto',
    components: {
        // "Polaroid" Styling: No borders, Paper backgrounds
        Paper: {
            defaultProps: { withBorder: false },
            styles: {
                root: {
                    border: 'none',
                    boxShadow: 'none',
                    backgroundColor: JAML_PALETTE.paperWhite, // Light bg for Paper
                },
            },
        },
        Card: {
            defaultProps: { withBorder: false },
            styles: {
                root: {
                    border: 'none',
                    boxShadow: 'none',
                    backgroundColor: JAML_PALETTE.paperWhite,
                },
            },
        },
        Button: {
            styles: {
                root: {
                    border: 'none',
                    boxShadow: 'none',
                    fontWeight: 700,
                },
            },
        },
        Input: {
            styles: {
                input: {
                    border: 'none',
                    boxShadow: 'none',
                    backgroundColor: JAML_PALETTE.paperCream, // Inputs slightly darker
                    fontWeight: 600,
                    color: JAML_PALETTE.black,
                },
            },
        },
    },
});
