// frontend/eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importX from "eslint-plugin-import-x";
import unusedImports from "eslint-plugin-unused-imports";
// Note: tailwindcss eslint plugin removed due to Tailwind v4 incompatibility
// Tailwind class ordering is handled by prettier-plugin-tailwindcss instead
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

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
      "src/shared/types/openapi.d.ts",
      "src/types/api.d.ts",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic, // Enforce consistent styling as well

  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    ignores: [
      "src/shared/types/openapi.d.ts", // OpenAPI generated file
      "src/types/api.d.ts", // OpenAPI generated file
    ],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      import: importX,
      "unused-imports": unusedImports,
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // TypeScript strict rules
      "@typescript-eslint/no-unused-vars": "off", // Disabled in favor of unused-imports
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // Disable crashing rule (typescript-eslint bug?)
      "@typescript-eslint/consistent-generic-constructors": "off",

      // Relax strict rules for existing code
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/no-extraneous-class": "off",
      "no-useless-assignment": "off",
      "@typescript-eslint/prefer-for-of": "off",
      "@typescript-eslint/no-dynamic-delete": "off",

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

      // Circular dependency detection
      "import/no-cycle": [
        "error",
        {
          maxDepth: Infinity,
          ignoreExternal: true,
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
  // 現在: 44ファイル | 目標(2026-Q1): 0ファイル (順次解消) | 進捗: docs/project/BACKLOG.md参照
  {
    files: [
      // Core components
      "src/components/layouts/TopNav.tsx",
      "src/factories/order-factory.ts",

      // Admin
      "src/features/admin/pages/AdminPage.tsx",

      // Adjustments
      "src/features/adjustments/components/AdjustmentForm.tsx",
      "src/features/adjustments/pages/AdjustmentsListPage.tsx",

      "src/features/allocations/components/lots/LotAllocationHeaderView.tsx",
      "src/features/allocations/components/lots/LotAllocationPanel.tsx",
      "src/features/allocations/components/lots/AllocationRowContainer.tsx",
      "src/features/allocations/components/orders/OrderCard.tsx",
      "src/features/allocations/components/orders/AllocationOrderLineCard.tsx",
      "src/features/allocations/components/orders/OrderLinesPaneView.tsx",
      "src/features/allocations/components/orders/OrderLinesPane.tsx",
      "src/features/allocations/components/orders/OrdersPane.tsx",
      "src/features/allocations/components/shared/WarehouseAllocationModal.tsx",

      // Admin
      "src/features/admin/pages/SeedDataPage.tsx",

      // Business Rules
      "src/features/business-rules/pages/BusinessRulesPage.tsx",

      // Customer Items
      "src/features/customer-items/components/CustomerItemForm.tsx",
      "src/features/customer-items/pages/CustomerItemsListPage.tsx",

      // Customers
      "src/features/customers/components/CustomerBulkImportDialog.tsx",
      "src/features/customers/utils/customer-csv.ts",

      // Forecasts
      "src/features/forecasts/components/ForecastDetailCard/ForecastDetailCard.tsx",
      "src/features/forecasts/components/ForecastDetailCard/hooks/use-forecast-calculations.ts",
      "src/features/forecasts/pages/ForecastDetailPage.tsx",
      "src/features/forecasts/pages/ForecastListPage.tsx",

      // Inventory
      "src/features/inventory/pages/InventoryPage.tsx",

      "src/features/inbound-plans/components/InboundPlansList.tsx",
      "src/features/inbound-plans/components/ReceiveModal.tsx",

      "src/features/operation-logs/pages/OperationLogsPage.tsx",

      // Orders
      "src/features/orders/components/allocation/ForecastSection.tsx",
      "src/features/orders/components/allocation/LotListWithAllocation.tsx",
      "src/features/orders/components/OrderLineCard/index.tsx",
      "src/features/orders/pages/OrderPage.tsx",
      "src/features/orders/pages/OrdersListPage.tsx",
      "src/features/orders/pages/OrdersListPage/columns.tsx",

      // Roles
      "src/features/roles/components/RoleForm.tsx",
      "src/features/roles/pages/RolesListPage.tsx",

      // Suppliers
      "src/features/suppliers/components/SupplierBulkImportDialog.tsx",
      "src/features/suppliers/utils/supplier-csv.ts",

      // Users
      "src/features/users/components/UserForm.tsx",

      // Warehouses
      "src/features/warehouses/components/WarehouseForm.tsx",
      "src/features/warehouses/utils/warehouse-csv.ts",
      // RPA
      // Shared
      "src/shared/components/data/DataTable.tsx",
      "src/shared/components/data/TablePagination.tsx",
      "src/shared/components/form/FormDialog.tsx",
    ],
    rules: {
      "max-lines-per-function": ["error", { max: 600, skipBlankLines: true, skipComments: true }],
      "max-lines": ["error", { max: 600, skipBlankLines: true, skipComments: true }],
      complexity: ["error", 60],
      "max-params": ["error", 6],
    },
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      sourceType: "module",
      ecmaVersion: 2022,
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
      },
    },
  },

  // Test files: relax strict rules
  {
    files: [
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
      "src/test/**/*.{ts,tsx}",
      "e2e/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn", // テストでも型安全性を推奨（error → warn）
      "max-lines-per-function": "off",
      "max-lines": "off",
      complexity: "off",
      "no-useless-assignment": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-invalid-void-type": "off",
      "preserve-caught-error": "off",
    },
  },

  eslintConfigPrettier,

  // Workaround for crashing rule in typescript-eslint v8 + ESLint v10
  {
    rules: {
      "@typescript-eslint/consistent-generic-constructors": "off",
    },
  },
  // 段階的移行期間中の any 緩和設定
  // 目標: 2026-Q1末までに解消
  {
    files: [
      "src/shared/components/data/DataTable.tsx",
      "src/shared/components/data/DataTable/**/*.ts",
      "src/shared/components/data/DataTable/**/*.tsx",
      "src/features/customers/**/*.ts",
      "src/features/customers/**/*.tsx",
      "src/features/suppliers/**/*.ts",
      "src/features/suppliers/**/*.tsx",
      "src/features/warehouses/**/*.ts",
      "src/features/warehouses/**/*.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
