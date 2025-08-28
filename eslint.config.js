import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

const relativeExtPlugin = {
  rules: {
    "require-js-extension": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Require .js extension on relative imports (NodeNext ESM). Ignore type-only imports.",
        },
        schema: [],
      },
      create(context) {
        return {
          ImportDeclaration(node) {
            const source = node.source && node.source.value;
            if (typeof source !== "string") return;
            if (!source.startsWith(".")) return;
            // @ts-expect-error - ESLint AST typing in JS config
            if (node.importKind === "type") return;
            if (/(\.js|\.mjs|\.cjs|\.json)$/i.test(source)) return;
            context.report({
              node: node.source,
              message:
                "Relative imports must include a .js extension for NodeNext ESM.",
            });
          },
        };
      },
    },
  },
};

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/generated/**",
      "**/.next/**",
      "**/*.d.ts",
      ".prettierrc.js",
      "vitest.config.mts",

      "**/*.cjs",
      ".eslintrc.js",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        AbortController: "readonly",
      },
    },
    plugins: {
      import: importPlugin,
      "unused-imports": unusedImports,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],

      "no-empty": ["error", { allowEmptyCatch: true }],

      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],

          pathGroups: [
            {
              pattern: "@mcp/**",
              group: "internal",
              position: "before",
            },
          ],

          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "never",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],

      "import/first": "error",
      // Disable extensions rule; we'll add custom check for relative .js later
      "import/extensions": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-require-imports": "off",
    },
    settings: {
      "import/resolver": {
        typescript: true,
        node: true,
      },
    },
  },
  {
    files: [
      "packages/**/src/**/*.ts",
      "apps/gateway/src/**/*.ts",
      "apps/devtools-mcp-server/src/**/*.ts",
      "apps/linear-mcp-server/src/**/*.ts",
      "apps/notion-mcp-server/src/**/*.ts",
      "apps/perplexity-mcp-server/src/**/*.ts",
    ],
    plugins: {
      "relative-ext": relativeExtPlugin,
    },
    rules: {
      "relative-ext/require-js-extension": "error",
    },
  },

  {
    files: ["**/*.cjs"],
    languageOptions: {
      globals: {
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  }
);
