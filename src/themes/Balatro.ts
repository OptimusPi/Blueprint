import { createTheme } from '@mantine/core';
import type { MantineThemeOverride } from '@mantine/core';


const BALATRO_COLORS = {
    red: '#ff5e5e',
    blue: '#4bb1ff',
    green: '#46bc77',
    purple: '#9074ff',
    orange: '#ff9d4d',
    yellow: '#ffcf4d',
    dark: [
        '#C1C2C5',
        '#A6A7AB',
        '#909296',
        '#5C5F66',
        '#373A40',
        '#2C2E33',
        '#25262B',
        '#1A1B1E',
        '#141517',
        '#101113',
    ],
};

const theme: MantineThemeOverride = createTheme({
    colors: {
        // Balatro primary colors
        balatroRed: [
            '#ffebeb', '#ffd6d6', '#ffadad', '#ff8585', BALATRO_COLORS.red, '#ff4747', '#ff3d3d', '#e63232', '#cc2929', '#b31f1f'
        ],
        balatroBlue: [
            '#ebf7ff', '#d6efff', '#ade0ff', '#85d1ff', BALATRO_COLORS.blue, '#33a7ff', '#1f9dff', '#008ae6', '#007acc', '#006bb3'
        ],
        balatroGreen: [
            '#ecf9f2', '#daeedf', '#b6e0c4', '#91d1a8', BALATRO_COLORS.green, '#3eaa68', '#369a5e', '#2e8652', '#267346', '#1e5f3a'
        ],
        balatroPurple: [
            '#f2f0ff', '#e5e1ff', '#ccc4ff', '#b3a7ff', BALATRO_COLORS.purple, '#7c5eff', '#6947ff', '#5e3df2', '#5436d9', '#492fbf'
        ],
        balatroOrange: [
            '#fff5eb', '#ffebd6', '#ffd6ad', '#ffc285', BALATRO_COLORS.orange, '#ff8b33', '#ff7a1f', '#e66914', '#cc5c12', '#b35010'
        ],
        balatroYellow: [
            '#fffbeb', '#fff7d6', '#ff_edad', '#ffe385', BALATRO_COLORS.yellow, '#ffc533', '#ffbc1f', '#e6a614', '#cc9412', '#b38210'
        ],

        // Override standard Mantine colors with Balatro vibes
        red: [
            '#ffebeb', '#ffd6d6', '#ffadad', '#ff8585', '#ff5e5e', '#ff4747', '#ff3d3d', '#e63232', '#cc2929', '#b31f1f'
        ],
        blue: [
            '#ebf7ff', '#d6efff', '#ade0ff', '#85d1ff', '#4bb1ff', '#33a7ff', '#1f9dff', '#008ae6', '#007acc', '#006bb3'
        ],
        green: [
            '#ecf9f2', '#daeedf', '#b6e0c4', '#91d1a8', '#46bc77', '#3eaa68', '#369a5e', '#2e8652', '#267346', '#1e5f3a'
        ],
    },
    primaryColor: 'balatroBlue',
    primaryShade: { light: 4, dark: 4 },
    defaultRadius: 'md',
    fontFamily: 'Inter, system-ui, sans-serif',
    components: {
        Button: {
            defaultProps: {
                variant: 'filled',
            },
            styles: {
                root: {
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    boxShadow: '0 4px 0 rgba(0,0,0,0.2)',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                    '&:active': {
                        transform: 'translateY(2px)',
                        boxShadow: '0 2px 0 rgba(0,0,0,0.2)',
                    },
                },
            },
        },
        Paper: {
            defaultProps: {
                withBorder: true,
                shadow: 'sm',
            },
            styles: {
                root: {
                    backgroundColor: '#1A1B1E',
                    borderColor: 'rgba(255,255,255,0.1)',
                },
            },
        },
        Card: {
            defaultProps: {
                withBorder: true,
                shadow: 'md',
            },
            styles: {
                root: {
                    backgroundColor: '#1A1B1E',
                    borderColor: 'rgba(255,255,255,0.1)',
                },
            },
        },
        Input: {
            styles: {
                input: {
                    backgroundColor: '#141517',
                    borderColor: 'rgba(255,255,255,0.1)',
                    fontWeight: 600,
                },
            },
        },
        Accordion: {
            styles: {
                item: {
                    backgroundColor: 'transparent',
                    borderColor: 'rgba(255,255,255,0.05)',
                },
                control: {
                    '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.03)',
                    },
                },
            },
        },
    },
});

export default theme;
