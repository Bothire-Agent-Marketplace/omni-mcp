#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import generate from "@babel/generator";
import * as babelParser from "@babel/parser";

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

function isFunctionLikeVariableDeclaration(node) {
  if (node.type !== "VariableDeclaration") return false;
  if (!node.declarations || node.declarations.length === 0) return false;
  if (node.declarations.length !== 1) return false;
  const decl = node.declarations[0];
  if (!decl || !decl.init) return false;
  return (
    decl.init.type === "ArrowFunctionExpression" ||
    decl.init.type === "FunctionExpression"
  );
}

function filterCommentsOnNode(node) {
  if (!node) return;

  const isKeepTarget =
    node.type === "FunctionDeclaration" ||
    node.type === "ClassDeclaration" ||
    isFunctionLikeVariableDeclaration(node);

  if (node.leadingComments && node.leadingComments.length > 0) {
    node.leadingComments = node.leadingComments.filter((c) => {
      const isJsDoc = c.type === "CommentBlock" && c.value.startsWith("*");
      return isKeepTarget && isJsDoc;
    });
    if (node.leadingComments.length === 0) delete node.leadingComments;
  }

  if (node.innerComments) delete node.innerComments;
  if (node.trailingComments) delete node.trailingComments;
}

function traverse(node, visitor) {
  if (!node || typeof node !== "object") return;
  visitor(node);
  for (const key of Object.keys(node)) {
    const value = node[key];
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const item of value) traverse(item, visitor);
    } else if (value && typeof value.type === "string") {
      traverse(value, visitor);
    }
  }
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  let ast;
  try {
    ast = babelParser.parse(original, {
      sourceType: "module",
      plugins: ["typescript", "jsx", "classProperties", "decorators-legacy"],
      allowReturnOutsideFunction: true,
      ranges: true,
      attachComment: true,
      errorRecovery: true,
    });
  } catch {
    // Skip files that fail to parse (rare)
    return false;
  }

  // Remove global comments; only keep those attached to nodes we preserve
  ast.comments = [];

  traverse(ast, filterCommentsOnNode);

  const { code } = generate.default
    ? generate.default(ast, { comments: true, retainLines: true }, original)
    : generate(ast, { comments: true, retainLines: true }, original);

  if (code !== original) {
    fs.writeFileSync(filePath, code, "utf8");
    return true;
  }
  return false;
}

let changedCount = 0;
for (const file of walk(repoRoot)) {
  const didChange = processFile(file);
  if (didChange) changedCount += 1;
}

console.log(`Stripped comments in ${changedCount} files`);
