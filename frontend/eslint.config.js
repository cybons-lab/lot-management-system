// frontend/eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";
import unusedImports from "eslint-plugin-unused-imports";
// Note: tailwindcss eslint plugin removed due to Tailwind v4 incompatibility
// Tailwind class ordering is handled by prettier-plugin-tailwindcss instead
import eslintConfigPrettier from "eslint-config-prettier";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "public/**",
      "../backend/**",
      "scripts/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    ignores: [
      "src/types/api.d.ts", // OpenAPI generated file
    ],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      import: importPlugin,
      "unused-imports": unusedImports,
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { JSX: true },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // TypeScript strict rules
      "@typescript-eslint/no-unused-vars": "off", // Disabled in favor of unused-imports
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // Unused imports auto-removal
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],

      // React rules
      "react/react-in-jsx-scope": "off",

      // React Hooks rules (critical)
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",

      // JSX Accessibility rules
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/aria-activedescendant-has-tabindex": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/heading-has-content": "error",
      "jsx-a11y/html-has-lang": "error",
      "jsx-a11y/iframe-has-title": "error",
      "jsx-a11y/img-redundant-alt": "error",
      "jsx-a11y/interactive-supports-focus": "warn",
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/no-access-key": "error",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/no-redundant-roles": "error",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",
      "jsx-a11y/scope": "error",

      // Note: Tailwind CSS rules removed (plugin incompatible with Tailwind v4)
      // Tailwind class ordering is enforced by prettier-plugin-tailwindcss

      // File size limits - STRICT (restored from temporary relaxation)
      "max-lines": [
        "error",
        {
          max: 400,
          skipBlankLines: true,
          skipComments: true,
        },
      ],

      // Function size limits
      "max-lines-per-function": [
        "error",
        {
          max: 80,
          skipBlankLines: true,
          skipComments: true,
        },
      ],

      // Complexity limits
      "max-depth": ["error", 4],
      "max-params": ["error", 4],
      complexity: ["error", 12],

      // Import organization
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],

      // Prevent warehouse_* usage (migrated to delivery_place_*)
      "no-restricted-syntax": [
        "error",
        {
          selector: "Identifier[name=/^warehouse_(code|id)$/]",
          message: "Use delivery_place_id or delivery_place_code instead of warehouse_*",
        },
      ],

      // Feature boundary enforcement
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            // features/* cannot import from other features' internal modules
            {
              target: "./src/features/*/!(index).{ts,tsx}",
              from: "./src/features/*/!(index).{ts,tsx}",
              except: ["./index.ts"],
              message:
                "Features must not directly import from other features' internals. Use the public API (index.ts) instead.",
            },
          ],
        },
      ],

      // Enforce API layer usage (no direct fetch/axios in features)
      // Allowed in: lib/, services/, hooks/ (infrastructure layer)
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "axios",
              importNames: ["default"],
              message:
                "Direct axios usage in features is forbidden. Use the API layer (features/*/api.ts) instead.",
            },
          ],
          patterns: [
            {
              group: ["node-fetch"],
              message:
                "Direct fetch usage in features is forbidden. Use the API layer (features/*/api.ts) instead.",
            },
          ],
        },
      ],
    },
  },

  // vite.config.ts は未使用の引数（_req/_res 等）を許容
  {
    files: ["vite.config.ts"],
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // Allow axios in infrastructure layer and relax complexity rules
  {
    files: [
      "src/lib/**/*.{ts,tsx}",
      "src/shared/libs/**/*.{ts,tsx}",
      "src/services/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": "off",
      "unused-imports/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "max-lines": "off",
      "max-lines-per-function": "off",
      complexity: "off",
      "react-hooks/rules-of-hooks": "off", // Allow experimental hook patterns in this directory
    },
  },

  // Temporary overrides for function length/complexity
  // TODO: Refactor these files to split into smaller components/hooks
  {
    files: [
      // Factory files with high complexity
      "src/factories/order-factory.ts",
      // Admin pages
      "src/features/admin/pages/SeedDataPage.tsx",
      // Allocation components
      "src/features/allocations/components/OrderCard.tsx",
      "src/features/allocations/components/OrderLineCard.tsx",
      "src/features/allocations/components/LotAllocationPane.tsx",
      "src/features/allocations/components/LotAllocationPanel.tsx",
      "src/features/allocations/components/OrderDetailPane.tsx",
      "src/features/allocations/components/WarehouseAllocationModal.tsx",
      "src/features/allocations/pages/LotAllocationPage.tsx",
      "src/features/allocations/hooks/useAllocationMutation.ts",
      "src/features/allocations/hooks/useAutoSelection.ts",
      // API files
      "src/features/forecast/api.ts",
      "src/features/inventory/api.ts",
      "src/features/orders/api.ts",
      // Forecast pages
      "src/features/forecasts/pages/ForecastListPage.tsx",
      // Inventory pages
      "src/features/inventory/pages/InventoryPage.tsx",
      // Order components
      "src/features/orders/components/ForecastSection.tsx",
      "src/features/orders/components/LotListWithAllocation.tsx",
      "src/features/orders/components/OrderLineCard/index.tsx",
      "src/features/orders/pages/OrderDetailPage.tsx",
      "src/features/orders/pages/OrderPage.tsx",
      "src/features/orders/pages/OrdersListPage.tsx",
      "src/features/orders/hooks/useOrderLineComputed.ts",
      // Shared components
      "src/shared/components/data/DataTable.tsx",
      "src/shared/components/data/TablePagination.tsx",
      "src/shared/components/form/FormDialog.tsx",
    ],
    rules: {
      "max-lines-per-function": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      complexity: ["error", 52],
      "max-params": ["error", 6],
    },
  },

  eslintConfigPrettier,
];
