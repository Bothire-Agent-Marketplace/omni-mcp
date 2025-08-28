#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as babelParser from "@babel/parser";
import generate from "@babel/generator";
import traverseModule from "@babel/traverse";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const IGNORED_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  ".next",
  "coverage",
  "build",
  "out",
  "generated",
  "logs",
]);

const VALID_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.has(ext)) return false;
  if (filePath.endsWith(".d.ts")) return false;
  return true;
}

function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIR_NAMES.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.isFile()) {
      if (shouldProcessFile(fullPath)) yield fullPath;
    }
  }
}

function parse(code) {
  return babelParser.parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx", "classProperties", "decorators-legacy"],
    errorRecovery: true,
    ranges: true,
    attachComment: true,
  });
}

const traverseFn = traverseModule.default || traverseModule;

function removeUnusedUnderscoreBindings(ast) {
  traverseFn(ast, {
    VariableDeclaration(path) {
      const toRemoveDeclarators = [];

      path.node.declarations.forEach((decl, index) => {
        const id = decl.id;

        // Identifier: const _foo = ...
        if (id.type === "Identifier" && id.name.startsWith("_")) {
          const binding = path.scope.getBinding(id.name);
          if (!binding || binding.referencePaths.length === 0) {
            toRemoveDeclarators.push(index);
          }
          return;
        }

        // ObjectPattern: const { _unused, used, a: _x } = obj
        if (id.type === "ObjectPattern") {
          id.properties = id.properties.filter((prop) => {
            if (prop.type !== "ObjectProperty") return true;
            // Key could be Identifier or StringLiteral; binding name is value side
            if (prop.value.type === "Identifier" && prop.value.name.startsWith("_")) {
              const binding = path.scope.getBinding(prop.value.name);
              return Boolean(binding && binding.referencePaths.length > 0);
            }
            return true;
          });
          // If pattern became empty, mark declarator for removal
          if (id.properties.length === 0) {
            toRemoveDeclarators.push(index);
          }
          return;
        }

        // ArrayPattern: const [ _a, used ] = arr
        if (id.type === "ArrayPattern") {
          id.elements = id.elements.filter((el) => {
            if (!el || el.type !== "Identifier") return true;
            if (!el.name.startsWith("_")) return true;
            const binding = path.scope.getBinding(el.name);
            return Boolean(binding && binding.referencePaths.length > 0);
          });
          if (id.elements.length === 0) {
            toRemoveDeclarators.push(index);
          }
          return;
        }
      });

      if (toRemoveDeclarators.length > 0) {
        // Remove from last to first to keep indices stable
        toRemoveDeclarators.sort((a, b) => b - a).forEach((i) => {
          path.node.declarations.splice(i, 1);
        });
      }

      // If there are no declarators left, remove whole declaration
      if (path.node.declarations.length === 0) {
        path.remove();
      }
    },
  });
}

let changed = 0;
for (const file of walk(repoRoot)) {
  const original = fs.readFileSync(file, "utf8");
  let ast;
  try {
    ast = parse(original);
  } catch {
    continue;
  }

  const before = original;
  removeUnusedUnderscoreBindings(ast);
  const { code } = generate.default
    ? generate.default(ast, { retainLines: true, comments: true }, original)
    : generate(ast, { retainLines: true, comments: true }, original);

  if (code !== before) {
    fs.writeFileSync(file, code, "utf8");
    changed += 1;
  }
}

console.log(`Removed underscore-prefixed unused bindings in ${changed} files`);


