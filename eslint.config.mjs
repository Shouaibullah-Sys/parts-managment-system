import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginNext from "@next/eslint-plugin-next";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "public/**",
      "migrations/**",
      "next-env.d.ts",
    ],
  },
  { files: ["**/*.{js,mjs,cjs,ts,tsx}"] },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
    },
  },
  {
    // Node scripts (migrations/verification helpers) run under Node, not the browser
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  {
    plugins: { "react-hooks": pluginReactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  pluginNext.configs.recommended,
  {
    settings: { react: { version: "detect" } },
    rules: {
      // Next.js specific rules
      "@next/next/no-html-link-for-pages": "off",
      "react/jsx-key": "warn",
      "react/prop-types": "off",
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
    // CommonJS Node scripts use require() by design
    files: ["**/*.{js,cjs,mjs}"],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["**/next.config.*", "**/tailwind.config.*", "**/postcss.config.*"],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
    },
  },
];
