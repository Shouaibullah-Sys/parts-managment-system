import js from "@eslint/js";
import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginNext from "@next/eslint-plugin-next";

export default [
  { files: ["**/*.{js,mjs,cjs,ts,tsx}"] },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginReact.configs.recommended,
  ...pluginReactHooks.configs.recommended,
  ...pluginNext.configs.recommended,
  {
    rules: {
      // Next.js specific rules
      "@next/next/no-html-link-for-pages": "off",
      "react/jsx-key": "warn",
      "react-hooks/exhaustive-deps": "warn",

      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",

      // General rules
      "no-unused-vars": "off",
      "no-console": "warn",
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    files: ["**/*.test.{js,ts,tsx}", "**/*.spec.{js,ts,tsx}"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["**/next.config.*", "**/tailwind.config.*", "**/postcss.config.*"],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
    },
  },
];
