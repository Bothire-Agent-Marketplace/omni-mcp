#!/usr/bin/env node

import { Command } from "commander";
import { create } from "./commands/create.js";
import { list } from "./commands/list.js";
import { remove } from "./commands/remove.js";
import { validate } from "./commands/validate.js";

const program = new Command();

program
  .name("omni")
  .description(
    "🚀 Omni MCP Development CLI - Enterprise-grade MCP server management"
  )
  .version("1.0.0");

// Add commands from their own files
program.addCommand(create);
program.addCommand(list);
program.addCommand(remove);
program.addCommand(validate);

program.parse();
