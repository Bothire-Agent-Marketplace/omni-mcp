# MCP Architecture Refactoring Plan

This document tracks our progress in refactoring the repository to align with the "Current Best Architecture for Large-Scale MCP Deployments."

---

## 1. Repository Structure & Organization

Our goal is a clean, scalable monorepo that separates concerns and makes it easy to find and manage different parts of the system.

### Completed Tasks:

- [x] **Establish Root-Level Monorepo**: The entire project is now managed as a single monorepo using `pnpm` and `Turborepo`. All commands are run from the root.
- [x] **Create `servers/` Workspace**: A dedicated directory for all custom MCP server packages (e.g., `@mcp/linear-server`).
- [x] **Create `packages/` Workspace**: A dedicated directory for utility packages that are not servers (e.g., `dev-tools`).
- [x] **Create `shared/` Workspace**: A dedicated directory for code shared across multiple packages (e.g., `@mcp/schemas`).
- [x] **Modularize Shared Schemas**: The `@mcp/schemas` package is now organized by domain (`linear/`, etc.) to prevent a single large schema file.
- [x] **Refactor Server Internal Structure**: The `@mcp/linear-server` has been refactored to use a modular internal layout (`config/`, `mcp-server/`, `mcp-server/tools/`), serving as a template for future servers.

### Pending Tasks:

- [ ] **Create `gateway/` Directory**: Create a new top-level directory to house the MCP Gateway/Hub service.
- [ ] **Create `monitoring/` Directory**: Create a placeholder directory for a future observability stack (e.g., Prometheus, Grafana).
- [ ] **Formalize `deployment/` Subdirectories**: Create specific subdirectories within `deployment/` for different environments (e.g., `helm-charts`, `terraform`).

---

## 2. Hub-and-Spoke Architecture

The core of the refactor is to introduce a central gateway that manages and exposes all backend MCP servers through a single, unified interface.

### Completed Tasks:

_None yet._

### Pending Tasks:

- [ ] **Implement MCP Gateway Service**: Create a new Node.js service in the `gateway/` directory that will act as a reverse proxy.
- [ ] **Create Master Config File**: The gateway will be driven by a `master.config.json` that lists all available MCP servers (both internal and external) and their connection details.
- [ ] **Implement Routing Logic**: The gateway needs to route incoming MCP requests to the correct backend server based on the method call.
- [ ] **Implement Capability Namespacing**: The gateway should automatically prefix capabilities from different servers (e.g., `linear/create_issue`) to avoid naming collisions.
- [ ] **Simplify Client Configuration**: Update `claude_desktop_config.local.json` to connect _only_ to the gateway's endpoint.

---

## 3. Containerized Microservices & Deployment

We need to ensure our containerization and deployment strategy fully supports the new hub-and-spoke model.

### Completed Tasks:

- [x] **Containerize Custom Servers**: The `linear-mcp-server` has a `Dockerfile`.
- [x] **Establish Layered Docker Compose Setup**: We have a `docker-compose.yml` for base services and a `docker-compose.dev.yml` for local development.
- [x] **Unified Build System**: The `pnpm build:all` command handles TypeScript compilation, Docker image builds, and pulling external images.

### Pending Tasks:

- [ ] **Add Gateway to Docker Compose**: The new `gateway` service needs to be added to `docker-compose.dev.yml`.
- [ ] **Route Traffic Through Gateway**: Refactor the Docker Compose setup to expose only the gateway's port to the host machine. All inter-service communication should happen on the internal Docker network.
- [ ] **Add Health Checks**: Implement `healthcheck` directives for all services in the Docker Compose files.
- [ ] **Create Production Compose File**: Create a `docker-compose.prod.yml` as a template for production deployments.

---

## 4. Server Design & Best Practices

Ensuring each server is well-designed, secure, and observable is critical for long-term maintenance.

### Completed Tasks:

- [x] **Single Responsibility (Initial)**: The `linear-mcp-server` is focused on a single domain.
- [x] **Centralized Configuration**: The `linear-mcp-server` now loads its configuration from a dedicated `config.ts` file.

### Pending Tasks:

- [ ] **Structured Logging**: Implement a structured logging library (e.g., `pino`) in all custom servers and the gateway for better observability.
- [ ] **Robust Input Validation**: While we use TypeScript types, we should enforce runtime validation on all incoming data at the gateway or server level.
- [ ] **Comprehensive Error Handling**: Enhance the error handling to provide standardized error responses across all servers.
- [ ] **Transport Security**: Enforce mTLS between the gateway and backend services for zero-trust networking.

---

## 5. Documentation

Clear documentation is key to making the project easy to understand, use, and contribute to.

### Completed Tasks:

- [x] **Create Initial `ARCHITECTURE.md`**: A document outlining the high-level architecture exists.

### Pending Tasks:

- [ ] **Overhaul `ARCHITECTURE.md`**: Completely rewrite the architecture document to reflect the new hub-and-spoke model, including updated diagrams and workflow descriptions.
- [ ] **Create Gateway Documentation**: Add a `gateway/README.md` that explains how the gateway works, how to configure it, and how to add new servers to the `master.config.json`.
- [ ] **Create Runbooks**: Add operational guides to a new `docs/runbooks/` directory, explaining common tasks like "How to add a new MCP server."
- [ ] **Generate API/Tool Documentation**: Create a script to automatically generate a list of all available tools and their schemas from the master config file.
