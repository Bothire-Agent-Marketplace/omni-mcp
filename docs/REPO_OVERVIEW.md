# Omni Monorepo Overview

This document provides a high-level overview of the Omni monorepo, including its structure, technologies, Docker setup, and environment management.

## 1. Repository Structure

The repository is a TypeScript monorepo managed with **PNPM workspaces** and **Turbo**. The structure is organized into several key directories:

- `client-integrations/`: Configurations for client applications that interact with the system.
- `compose/`: Docker Compose configurations for various services.
- `data/`: SQL schema, sample data, and other data files.
- `deployment/`: Production deployment scripts and configurations.
- `docs/`: Project documentation.
- `gateway/`: The main entry point for the system, an Express-based API Gateway.
- `packages/`: Shared packages and tools used across the monorepo.
  - `dev-tools/`: Contains CLI scripts for development tasks like building Docker images.
- `servers/`: Individual MCP (Model Context Protocol) servers for specific integrations (e.g., Linear).
- `shared/`: Shared code used by multiple packages.
  - `schemas/`: Zod schemas for data validation.
  - `utils/`: Common utilities like logging and environment variable management.
- `secrets/`: Example environment files.

## 2. Technologies

The project utilizes a modern TypeScript-based stack.

### Core Technologies

- **TypeScript**: For static typing across the entire monorepo.
- **Node.js**: As the runtime environment.
- **PNPM**: For managing dependencies and workspaces.
- **Turbo**: As a high-performance build system for the monorepo.
- **Docker**: For containerization of services.

### Backend & API

- **Express.js**: Used in the `gateway` to create the main REST/WebSocket API.
- **ws**: For WebSocket communication in the `gateway`.
- **Zod**: For schema declaration and validation, used heavily in `shared/schemas` and the MCP servers.
- **jsonwebtoken (JWT)**: For handling authentication tokens.

### Integrations

- **@linear/sdk**: The official Linear SDK for interacting with the Linear API in `linear-mcp-server`.

### Development & Tooling

- **Jest**: As the testing framework, with configurations for unit and integration tests in the `gateway`.
- **tsx**: For running TypeScript files directly without pre-compiling during development.
- **Commander.js**: Used in `packages/dev-tools` to build the `omni` CLI tool.
- **Winston**: For logging, configured in `shared/utils`.
- **dotenv**: For loading environment variables from `.env` files.

## 3. Docker Setup

The project has a robust Docker setup for both development and production environments, following best practices.

### Docker Compose

- **`docker-compose.yml`**: Defines the production services, including `mcp-gateway`, `linear-mcp-server`, and `postgres`. It uses a custom bridge network (`mcp-network`) and named volumes for data persistence. It's configured to use the `production` stage of the Dockerfiles.
- **`docker-compose.dev.yml`**: Overrides the production setup for local development. It mounts local source code for hot-reloading, exposes debug ports, and adds development-specific services like `pgadmin`, `mailhog`, and `redis`.

### Dockerfiles

- Dockerfiles (e.g., `gateway/Dockerfile`) use **multi-stage builds** to create lean production images.
- A `builder` stage is used to install all dependencies and build the TypeScript code.
- A `production` stage then copies only the built artifacts and production dependencies.
- Services are run by a **non-root user** for improved security.
- `dumb-init` is used to ensure proper signal handling and process management within containers.
- `HEALTHCHECK` instructions are included in the images to allow Docker to monitor service health.

## 4. Environment Variable Management

Environment variables are managed through a centralized and strongly-typed system located in `shared/utils/src/env.ts`.

- **Centralized Logic**: The `EnvironmentManager` class handles loading, parsing, and validating all environment variables.
- **.env Files**: The system loads variables from `.env` files (e.g., `.env.development.local`), with intelligent resolution based on the service and environment.
- **Typed Configuration**: An `EnvironmentConfig` interface provides type safety for all environment variables.
- **Validation**: The system performs validation on variables, such as checking for valid port numbers and ensuring that default development secrets are not used in production.
- **Defaults**: Sensible default values are provided for development, reducing configuration overhead.
- **Secrets Management**: The `docker-compose.yml` file expects secrets like `LINEAR_API_KEY` and `POSTGRES_PASSWORD` to be provided to the environment. The `secrets/` directory contains templates for these files.
