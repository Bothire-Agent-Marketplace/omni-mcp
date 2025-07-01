# Data Directory

This directory contains sample databases and data files used by the MCP servers.

## Contents

### `pagila/` (Auto-downloaded)

PostgreSQL sample database used by the `query-quill-mcp-server`. This directory is automatically created when you run:

```bash
./scripts/setup-pagila-local-db.sh
```

The large SQL files in this directory are gitignored to keep the repository size manageable. The setup script automatically downloads them from the [official Pagila repository](https://github.com/devrimgunduz/pagila).

## Adding New Sample Databases

When adding new sample databases:

1. Create a subdirectory for the database (e.g., `data/northwind/`)
2. Add the large data files to `.gitignore`
3. Update or create setup scripts to download the data automatically
4. Document the setup process in the main README.md
