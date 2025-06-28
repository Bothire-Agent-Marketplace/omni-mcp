# Secrets Management

This directory contains sensitive configuration files that are **never committed to git**.

## Setup

### Linear MCP Server

1. Copy the example file:

   ```bash
   cp linear.env.example linear.env
   ```

2. Edit the file with your actual secrets:

   ```bash
   nano linear.env
   ```

3. Get your Linear API key from: https://linear.app/settings/api

### Adding New Secrets

When adding new MCP servers that require secrets:

1. Create a `.env.example` file with placeholder values
2. Add the actual `.env` file to `.gitignore` (already configured for `*.env`)
3. Update the Claude Desktop configuration to use `--env-file`
4. Document the setup process in this README

## Security Notes

- **Never commit actual secrets to git**
- Use `.env.example` files to show the required format
- The entire `secrets/` directory is gitignored except for this README and `.example` files
- Use environment files with Docker: `--env-file /path/to/secrets/service.env`

## Files in this directory

- `linear.env.example` - Template for Linear API configuration
- `linear.env` - Actual Linear secrets (gitignored)
- `README.md` - This documentation file
