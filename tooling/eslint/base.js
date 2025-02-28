/// <reference types="./types.d.ts" />

import * as path from "node:path";
import { includeIgnoreFile } from "@eslint/compat";
// import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import turboNoUndeclaredEnvVarsT3Env from "./custom_rules/turbo-no-undeclared-env-vars-t3-env.js";

/**
 * All packages that leverage t3-env should use this rule
 */
export const restrictEnvAccess = tseslint.config(
  { ignores: ["**/env.ts"] },
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Use `import { env } from '@/env'` instead to ensure validated types.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          name: "process",
          importNames: ["env"],
          message: "Use `import { env } from '@/env'` instead to ensure validated types.",
        },
      ],
    },
  },
);

export default tseslint.config(
  // Ignore files not tracked by VCS and any config files
  includeIgnoreFile(path.join(import.meta.dirname, "../../.gitignore")),
  { ignores: ["**/*.config.*"] },
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx"],
    plugins: {
      import: importPlugin,
      turbo: turboPlugin,
      custom: {
        rules: {
          "turbo-no-undeclared-env-vars-t3-env": turboNoUndeclaredEnvVarsT3Env,
        },
      },
    },
    extends: [
      // eslint.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      ...turboPlugin.configs.recommended.rules,
      "arrow-body-style": "error",
      "logical-assignment-operators": "error",
      "no-else-return": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-lone-blocks": "error",
      "no-lonely-if": "error",
      "no-var": "error",
      "no-unneeded-ternary": "error",
      "no-useless-call": "error",
      "no-useless-computed-key": "error",
      "no-useless-concat": "error",
      "no-useless-rename": "error",
      "no-useless-return": "error",
      "object-shorthand": "error",
      "operator-assignment": "error",
      "prefer-arrow-callback": "error",
      "prefer-const": "error",
      "prefer-exponentiation-operator": "error",
      "prefer-numeric-literals": "error",
      "prefer-object-spread": "error",
      "prefer-regex-literals": "error",
      "prefer-spread": "error",
      "prefer-template": "error",
      yoda: "error",
      "import/no-duplicates": "error",
      "require-await": "error",

      // TODO (shan): Continue chipping away at this until can mark all as "error"
      "require-unicode-regexp": "off",
      eqeqeq: "off",
      // eqeqeq: ["error", "smart"],
      "no-alert": "off",
      radix: "off",
      "no-console": "off",
      "prefer-promise-reject-errors": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "custom/turbo-no-undeclared-env-vars-t3-env": "error",
      "@typescript-eslint/consistent-type-imports": [
        "off",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "import/consistent-type-specifier-style": ["off", "prefer-top-level"],
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/unbonud-method": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "off",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
          reportUsedIgnorePattern: true,
        },
      ],
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/require-array-sort-compare": ["error", { ignoreStringArrays: true }],
      "@typescript-eslint/switch-exhaustiveness-check": "error",

      // TODO Continue chipping away at these until we can re-enable them.
      "@typescript-eslint/consistent-type-assertions": ["off", { assertionStyle: "never" }],
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      // "@typescript-eslint/no-unnecessary-condition": [
      //   "error",
      //   {
      //     allowConstantLoopConditions: true,
      //   },
      // ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",
      "@typescript-eslint/restrict-plus-operands": "off",
      "@typescript-eslint/no-misused-promises": "off",
      // "@typescript-eslint/no-misused-promises": [
      //   2,
      //   { checksVoidReturn: { attributes: false } },
      // ],
      "@typescript-eslint/no-deprecated": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "no-async-promise-executor": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-dynamic-delete": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      // "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "import/order": "off",
      // "import/order": [
      //   "error",
      //   {
      //     "newlines-between": "always",
      //     alphabetize: { order: "asc", caseInsensitive: true },
      //     groups: [["builtin", "external"], "internal", "parent", ["sibling", "index"]],
      //     pathGroups: [
      //       { pattern: "@/components/**", group: "internal", position: "after" },
      //       { pattern: "@/**", group: "internal" },
      //     ],
      //   },
      // ],
    },
  },
  {
    linterOptions: { reportUnusedDisableDirectives: true },
    languageOptions: { parserOptions: { projectService: true } },
  },
);
