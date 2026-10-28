import js from "@eslint/js";
import pluginQuery from "@tanstack/eslint-plugin-query";
import i18next from "eslint-plugin-i18next";
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

// react-hooks `recommended` carries the React Compiler rules (purity, refs, set-state-in-effect,
// immutability...), so a component that would de-opt the compiler fails lint instead.
export default tseslint.config(
  { ignores: ["dist", "docs-llm", "firmware-source", "node_modules"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      jsxA11y.configs.recommended,
      ...pluginQuery.configs["flat/recommended"],
    ],
    languageOptions: { ecmaVersion: 2024, globals: globals.browser },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": "error",
    },
  },
  // No hard-coded text in JSX: interface strings go through t() (docs/I18N.md). Tests may use
  // literal text to query the English page.
  {
    files: ["src/**/*.tsx"],
    ignores: ["src/**/*.test.tsx"],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": [
        "error",
        {
          mode: "jsx-text-only",
          // Not words: symbols, silkscreen and register names (VCC, C1), units and their numbers.
          words: {
            exclude: [
              "^[^A-Za-z]*$",
              "^[^a-z]*$",
              "^[\\d\\s.\\-−]*(dB|mm|ms|Hz|kHz|MHz|baud|°C|%)?$",
            ],
          },
        },
      ],
    },
  },
  {
    files: ["src/lib/logger.ts", "vite.config.ts", "eslint.config.ts", "tools/**"],
    rules: { "no-console": "off" },
  },
);
