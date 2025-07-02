# Query-quill MCP Server

> Queries several kinds of SQL databases

## 🚀 Running the Server

This server runs as a standalone HTTP microservice and is managed by the main MCP Gateway.

1.  **Environment Variables**: Create a `.env` file in this directory or add the required variables
    to the root `secrets/.env.development.local` file. See `.env.example` for required variables.
2.  **Run with Docker**: The recommended way to run this server is via the root
    `docker-compose.dev.yml`.
    ```bash
    make dev
    ```
3.  **Run Standalone (for debugging)**:
    ```bash
    pnpm dev
    ```

## API

- **Health Check**: `GET /health`
- **MCP Endpoint**: `POST /mcp`
