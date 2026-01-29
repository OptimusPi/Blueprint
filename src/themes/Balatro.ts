import { createTheme } from '@mantine/core';

// Balatro Theme: ONLY the provided palette (no invented colors)
const BALATRO = {
  white: '#FFFFFF',
  black: '#000000',
  red: '#ff4c40',
  darkRed: '#a02721',
  darkestRed: '#70150f',
  blue: '#0093ff',
  darkBlue: '#0057a1',
  orange: '#ff9800',
  darkOrange: '#a05b00',
  darkGold: '#b8883a',
  green: '#429f79',
  darkGreen: '#215f46',
  purple: '#7d60e0',
  darkPurple: '#292189',
  brightGold: '#eaba44',
  brightGreen: '#35bd86',
  grey: '#3a5055',
  mediumGrey: '#33464b',
  darkGrey: '#1e2b2d',
  brightSilver: '#b9c2d2',
  lightGrey: '#777e89',
  fadedGrey: '#565b5c',
  mediumShadow: '#1e2e32',
  darkShadow: '#0b1415',
  darkDullGrey: '#2d2d2d',
  dullGrey: '#5c5c5c',
  lightDullGrey: '#6b6b6b',
  lightDullWashGrey: '#545454',
  burntRed: '#8f3b36',
  lightSilver: '#a3acb9',
  greySilver: '#686e78',
  purpleViolet: '#9B7EDE',
  purpleMuted: '#6B5AA8',
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

export const BalatroTheme = createTheme({
  colors: {
    gray: scale(
      BALATRO.brightSilver,
      BALATRO.lightSilver,
      BALATRO.lightGrey,
      BALATRO.greySilver,
      BALATRO.fadedGrey,
      BALATRO.dullGrey,
      BALATRO.lightDullGrey,
      BALATRO.lightDullWashGrey,
      BALATRO.mediumGrey,
      BALATRO.darkGrey
    ),
    dark: scale(
      BALATRO.grey,
      BALATRO.mediumGrey,
      BALATRO.darkGrey,
      BALATRO.mediumShadow,
      BALATRO.darkShadow,
      BALATRO.darkDullGrey
    ),
    red: scale(BALATRO.red, BALATRO.darkRed, BALATRO.darkestRed, BALATRO.burntRed),
    blue: scale(BALATRO.blue, BALATRO.darkBlue),
    orange: scale(BALATRO.orange, BALATRO.darkOrange),
    green: scale(BALATRO.brightGreen, BALATRO.green, BALATRO.darkGreen),
    purple: scale(BALATRO.purple, BALATRO.purpleViolet, BALATRO.purpleMuted, BALATRO.darkPurple),
    gold: scale(BALATRO.brightGold, BALATRO.darkGold),
    // Map common semantic colors to Balatro palette (still no new hex values)
    teal: scale(BALATRO.brightGreen, BALATRO.green, BALATRO.darkGreen),
    cyan: scale(BALATRO.blue, BALATRO.darkBlue),
    yellow: scale(BALATRO.brightGold, BALATRO.darkGold),
    grape: scale(BALATRO.purple, BALATRO.purpleViolet, BALATRO.purpleMuted, BALATRO.darkPurple),
    violet: scale(BALATRO.purple, BALATRO.purpleViolet, BALATRO.purpleMuted, BALATRO.darkPurple),
    indigo: scale(BALATRO.darkBlue, BALATRO.blue),
  },
  primaryColor: 'red',
  primaryShade: { light: 0, dark: 2 },
  white: BALATRO.white,
  black: BALATRO.black,
  autoContrast: true,
  luminanceThreshold: 0.4,
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace: '"Fira Code", "JetBrains Mono", Consolas, Monaco, "Courier New", monospace',
  defaultRadius: 'md',
  activeClassName: 'mantine-active',
  focusClassName: 'mantine-focus-auto',
  components: {
    // Flat styling - no pixel borders, use background color hierarchy instead
    Paper: {
      defaultProps: { withBorder: false },
      styles: {
        root: {
          border: 'none',
          boxShadow: 'none',
          backgroundColor: BALATRO.darkGrey,
        },
      },
    },
    Card: {
      defaultProps: { withBorder: false },
      styles: {
        root: {
          border: 'none',
          boxShadow: 'none',
          backgroundColor: BALATRO.mediumGrey,
        },
      },
    },
    Fieldset: {
      styles: {
        root: {
          border: 'none',
          boxShadow: 'none',
          backgroundColor: BALATRO.mediumGrey,
        },
        legend: {
          fontWeight: 700,
        },
      },
    },
    Input: {
      styles: {
        input: {
          border: 'none',
          boxShadow: 'none',
          backgroundColor: BALATRO.grey,
          fontWeight: 600,
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
    SegmentedControl: {
      styles: {
        root: {
          border: 'none',
          backgroundColor: BALATRO.darkGrey,
        },
        control: {
          border: 'none',
        },
      },
    },
    Tabs: {
      styles: {
        tab: {
          border: 'none',
          fontWeight: 700,
        },
      },
    },
    Badge: {
      styles: {
        root: {
          border: 'none',
          fontWeight: 700,
        },
      },
    },
  },
});
