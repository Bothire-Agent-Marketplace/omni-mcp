import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default [
  {
    ignores: ["dist", ".next", "node_modules", "**/*.d.ts", "**/*.cjs"],
  },
  js.configs.recommended,
  ...compat.extends("next/core-web-vitals"),
];
