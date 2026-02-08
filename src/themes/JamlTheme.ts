import { createTheme } from '@mantine/core';

// Jimbo UI Design System Colors
// Based on LocalThunk's Balatro - eyegdropped from actual game pixels
const JIMBO_COLORS = {
  // Primary colors
  red: '#ff4c40',
  blue: '#0093ff',
  gold: '#ff9800',
  green: '#429f79',
  orange: '#ff9800',
  purple: '#9e74ce',
  
  // Dark variants for hover/pressed
  darkRed: '#a02721',
  darkBlue: '#0057a1',
  darkOrange: '#a05b00',
  darkGreen: '#215f46',
  darkPurple: '#5e437e',
  
  // Panel colors
  darkGrey: '#3a5055',
  darkest: '#1e2b2d',
  grey: '#708386',
  tealGrey: '#404c4e',
  
  // Panel structure
  panelEdge: '#1e2e32',
  innerBorder: '#334461',
  
  // Borders & shadows
  borderSilver: '#b9c2d2',
  borderSouth: '#777e89',
  
  // Text colors
  goldText: '#e4b643',
  greenText: '#35bd86',
  orangeText: '#ff8f00',
  white: '#ffffff',
  black: '#000000',
  
  // Special button colors
  tarotButton: '#9e74ce',
  planetButton: '#00a7ca',
  spectralButton: '#2e76fd',
  
  tarotButtonDark: '#5e437e',
  planetButtonDark: '#00657b',
  spectralButtonDark: '#14449e',
} as const;

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
    // Standard Mantine color scales using Jimbo colors
    red: scale(JIMBO_COLORS.red, JIMBO_COLORS.darkRed),
    blue: scale(JIMBO_COLORS.blue, JIMBO_COLORS.darkBlue),
    green: scale(JIMBO_COLORS.green, JIMBO_COLORS.darkGreen),
    orange: scale(JIMBO_COLORS.orange, JIMBO_COLORS.darkOrange),
    purple: scale(JIMBO_COLORS.purple, JIMBO_COLORS.darkPurple),
    
    // Gold as yellow since Mantine doesn't have gold by default
    yellow: scale(JIMBO_COLORS.gold, JIMBO_COLORS.darkOrange),
    
    // Gray scale using panel colors
    gray: scale(
      JIMBO_COLORS.borderSilver,
      JIMBO_COLORS.grey,
      JIMBO_COLORS.tealGrey,
      JIMBO_COLORS.darkGrey,
      JIMBO_COLORS.panelEdge,
      JIMBO_COLORS.darkest
    ),
    
    // Jimbo panel colors (for JamlView panels, NOT for Mantine shell)
    jimboPanel: [
      JIMBO_COLORS.darkGrey,    // 0: inner panel
      JIMBO_COLORS.tealGrey,    // 1: nested content
      JIMBO_COLORS.panelEdge,   // 2: panel edge
      JIMBO_COLORS.darkest,     // 3: outer panel / deepest bg
      JIMBO_COLORS.innerBorder, // 4: inner border
      JIMBO_COLORS.grey,        // 5: lighter panel
      JIMBO_COLORS.borderSouth, // 6: south border
      JIMBO_COLORS.borderSilver,// 7: silver border
      JIMBO_COLORS.darkGrey,    // 8
      JIMBO_COLORS.darkest,     // 9
    ],
    
    // Custom Jimbo semantic colors
    jimboRed: scale(JIMBO_COLORS.red, JIMBO_COLORS.darkRed),
    jimboBlue: scale(JIMBO_COLORS.blue, JIMBO_COLORS.darkBlue),
    jimboGreen: scale(JIMBO_COLORS.green, JIMBO_COLORS.darkGreen),
    jimboGold: scale(JIMBO_COLORS.gold, JIMBO_COLORS.darkOrange),
    jimboPurple: scale(JIMBO_COLORS.purple, JIMBO_COLORS.darkPurple),
    
    // Special button colors
    tarot: scale(JIMBO_COLORS.tarotButton, JIMBO_COLORS.tarotButtonDark),
    planet: scale(JIMBO_COLORS.planetButton, JIMBO_COLORS.planetButtonDark),
    spectral: scale(JIMBO_COLORS.spectralButton, JIMBO_COLORS.spectralButtonDark),
    
    // Text colors
    goldText: scale(JIMBO_COLORS.goldText),
    greenText: scale(JIMBO_COLORS.greenText),
    orangeText: scale(JIMBO_COLORS.orangeText),
    
    // Backward-compatible aliases for InteractiveJamlEditor
    jamlRed: scale(JIMBO_COLORS.red, JIMBO_COLORS.darkRed),
    jamlBlue: scale(JIMBO_COLORS.blue, JIMBO_COLORS.darkBlue),
    jamlGreen: scale(JIMBO_COLORS.green, JIMBO_COLORS.darkGreen),
    jamlGold: scale(JIMBO_COLORS.gold, JIMBO_COLORS.darkOrange),
    jamlPurple: scale(JIMBO_COLORS.purple, JIMBO_COLORS.darkPurple),
    polaroidBg: scale(JIMBO_COLORS.darkGrey, JIMBO_COLORS.tealGrey, JIMBO_COLORS.panelEdge, JIMBO_COLORS.darkest),
    polaroidText: scale(JIMBO_COLORS.white, JIMBO_COLORS.borderSilver, JIMBO_COLORS.grey),
  },
  
  primaryColor: 'blue',
  primaryShade: { light: 0, dark: 0 },
  
  white: JIMBO_COLORS.white,
  black: JIMBO_COLORS.black,
  
  autoContrast: true,
  luminanceThreshold: 0.4,
  
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace: '"Fira Code", "JetBrains Mono", Consolas, Monaco, "Courier New", monospace',
  
  defaultRadius: 'sm',
  
  activeClassName: 'mantine-active',
  focusClassName: 'mantine-focus-auto',
  
  components: {},
});
