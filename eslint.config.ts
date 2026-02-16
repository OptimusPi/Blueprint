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
    // Project-specific rule relaxations
    {
        files: ["**/*.{ts,mts,cts,tsx}"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/no-unnecessary-type-assertion": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
            "@typescript-eslint/no-duplicate-enum-values": "warn",
            "no-case-declarations": "warn",
            "react/no-unescaped-entities": "warn",
            "react/react-in-jsx-scope": "off",
            "react-hooks/set-state-in-effect": "warn",
            "react-hooks/immutability": "warn",
            "react-hooks/preserve-manual-memoization": "warn",
            "react-hooks/refs": "warn",
            "react-hooks/exhaustive-deps": "warn"
        }
    },

]);
