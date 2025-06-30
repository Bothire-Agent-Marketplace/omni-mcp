# Omni MCP - Local Development Guide

This guide provides instructions for setting up and running the Omni MCP project in a local development environment. Our goal is to provide a smooth and efficient developer experience.

The local development environment is managed via Docker Compose and a `Makefile` that provides convenient commands for common tasks.

## Prerequisites

Before you begin, ensure you have the following tools installed on your system:

- **Git:** For cloning the repository.
- **Docker & Docker Compose:** For running the containerized services.
- **Make:** For using the simplified commands in the `Makefile`.
- **pnpm:** For managing Node.js dependencies.

## First-Time Setup

Follow these steps to set up the project for the first time:

**1. Clone the Repository**

```bash
git clone <repository-url>
cd omni
```

**2. Install Dependencies**

Install all the necessary Node.js packages using `pnpm`:

```bash
pnpm install
```

**3. Configure Environment Variables**

The project uses environment variables for configuration. We use a `.env.development.local` file for development, which is ignored by Git.

Run the setup command to create the initial environment file:

```bash
make setup
```

This will create a `.env.development.local` file by copying `.env.development`. You must now edit this file and provide the necessary secrets.

**Essential Variables in `.env.development.local`:**

| Variable            | Description                                                                               | Default          |
| ------------------- | ----------------------------------------------------------------------------------------- | ---------------- |
| `LINEAR_API_KEY`    | Your personal API key for the Linear API. [Get it here](https://linear.app/settings/api). | `""`             |
| `POSTGRES_PASSWORD` | The password for the development database user. Can be any value.                         | `postgres`       |
| `PGADMIN_EMAIL`     | The email address to use for logging into the pgAdmin interface.                          | `admin@omni.dev` |
| `PGADMIN_PASSWORD`  | The password for the pgAdmin user.                                                        | `admin`          |

**4. Start the Development Environment**

Once your environment variables are configured, you can start all the services:

```bash
make dev
```

This command will build the Docker images and start all the development services with hot reloading enabled.

## Daily Workflow

The `Makefile` provides commands to simplify your daily development tasks.

- **Start the environment:** `make dev`
- **Stop the environment:** `make dev-down`
- **View real-time logs:** `make logs`
- **Run all tests:** `make test`
- **Restart the environment:** `make restart`
- **View service status:** `make status`
- **Show all available commands:** `make help`

## Development Environment Services

The `make dev` command starts the following services. The `make urls` command will print the URLs for easy access.

| Service               | URL                          | Description                                                                                       |
| --------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| **MCP Gateway**       | `http://localhost:37373`     | The central gateway that routes requests to the appropriate MCP server. Hot-reloading is enabled. |
| **Linear MCP Server** | Direct access on port `3001` | The MCP server for Linear integration. Hot-reloading is enabled.                                  |
| **PostgreSQL**        | `localhost:5432`             | The development database.                                                                         |
| **pgAdmin**           | `http://localhost:8080`      | A web-based administration tool for the PostgreSQL database.                                      |
| **Mailhog**           | `http://localhost:8025`      | An email testing tool that captures emails sent by the application.                               |
| **Redis**             | `localhost:6379`             | An in-memory data store, used for caching.                                                        |

## Hot Reloading & Debugging

**Hot Reloading**

The `mcp-gateway` and `linear-mcp-server` are configured for hot reloading. When you make changes to the source code in the `gateway/src`, `servers/linear-mcp-server/src`, or `shared/` directories, the corresponding service will automatically restart to apply the changes.

**Debugging**

The Node.js debugger is enabled for the gateway and the Linear server. You can attach your IDE's debugger to the following ports:

- **MCP Gateway:** `9229`
- **Linear MCP Server:** `9230`

## Database Management

- **Connect via shell:** You can get a SQL shell inside the Postgres container using `make db-shell`.
- **Connect via pgAdmin:** Use the web interface at `http://localhost:8080`.
- **Reset the database:** To completely wipe the database and start fresh, run `make db-reset`. This will remove the data volume and re-initialize the database on the next start.

## Advanced Topics

### What about the `deployment/` directory?

The `docker-compose.yml` files in the `deployment/` directory are for a specialized, legacy, or client-specific setup (e.g., for Claude Desktop integration where the client manages the server lifecycle). **For general development, you should always use the `Makefile` and `docker-compose.yml` files in the root of the project.**

### Running in Detached Mode

To run the development environment in the background, use `make dev-detached`.

### Cleaning the Docker Environment

- `make clean`: Stops and removes containers.
- `make clean-all`: Stops and removes containers, volumes, and networks. Use with caution, as this will delete your database data.
