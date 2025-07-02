module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "import", "unused-imports"],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  rules: {
    // Remove unused imports automatically
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
      },
    ],

    // Import ordering rules
    "import/order": [
      "error",
      {
        groups: [
          "builtin", // Node.js built-ins
          "external", // npm packages
          "internal", // workspace packages (@mcp/*)
          "parent", // ../
          "sibling", // ./
          "index", // ./index
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
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],

    // Ensure imports come before other statements
    "import/first": "error",

    // No duplicate imports
    "import/no-duplicates": "error",
  },
  ignorePatterns: [
    "dist/",
    "node_modules/",
    "*.d.ts",
    ".eslintrc.js",
    ".prettierrc.js",
  ],
  overrides: [
    {
      files: ["*.js"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
  ],
};
