import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHook from "eslint-plugin-react-hooks"
import {tanstackConfig} from "@tanstack/eslint-config";
import {defineConfig} from "eslint/config";

export default defineConfig([
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        plugins: {js},
        extends: ["js/recommended"],
        languageOptions: {globals: globals.browser}
    },
    tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    pluginReactHook.configs.flat.recommended,
    tanstackConfig,
    // Vite config is JS and lives outside tsconfig.json include
    {
        files: ["vite.config.js"],
        languageOptions: {
            parserOptions: {
                project: ["./tsconfig.node.json"]
            },
            globals: {
                ...globals.node
            }
        },
        rules: {
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/no-unnecessary-boolean-literal-compare": "off",
            "@typescript-eslint/strict-boolean-expressions": "off",
            "@typescript-eslint/no-unnecessary-type-assertion": "off"
        }
    },
    // disable the no ts ignore rule for ts files
    {
        files: ["**/*.{ts,mts,cts,tsx}"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/no-unnecessary-condition": "off"
        }
    },

]);
