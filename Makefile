# =============================================================================
# Omni MCP - Modern Development Makefile
# =============================================================================
# This Makefile provides a modern developer experience with proper
# environment management and standardized Docker operations

.DEFAULT_GOAL := help
.PHONY: help setup dev prod build test clean logs status

# =============================================================================
# Configuration
# =============================================================================
PROJECT_NAME := omni-mcp
COMPOSE_FILE := docker-compose.yml
COMPOSE_DEV_FILE := docker-compose.dev.yml
ENV_FILE := .env.development.local

# =============================================================================
# Help & Information
# =============================================================================
help: ## Show this help message
	@echo "🚀 $(PROJECT_NAME) - Development Commands"
	@echo "=========================================="
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ 🏗️  Environment Setup
setup: ## Initial project setup with environment files
	@echo "🏗️  Setting up Omni MCP development environment..."
	@mkdir -p data/files data/uploads secrets logs
	@if [ ! -f .env.development.local ]; then \
		cp .env.development .env.development.local; \
		echo "✅ Created .env.development.local"; \
	fi
	@if [ ! -f .env.production.local ]; then \
		cp .env.production .env.production.local; \
		echo "✅ Created .env.production.local"; \
	fi
	@echo "📝 Please update your .env.*.local files with actual values"
	@echo "🔗 Linear API key: https://linear.app/settings/api"

setup-env: setup ## Alias for setup

##@ 🚀 Development
dev: ## Start development environment with hot reload
	@echo "🚀 Starting development environment..."
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) --env-file .env.development.local up --build

dev-detached: ## Start development environment in background
	@echo "🚀 Starting development environment (detached)..."
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) --env-file .env.development.local up --build -d

dev-down: ## Stop development environment
	@echo "🛑 Stopping development environment..."
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) down

##@ 🏭 Production
prod: ## Start production environment
	@echo "🏭 Starting production environment..."
	@docker-compose -f $(COMPOSE_FILE) --env-file .env.production.local up -d

prod-down: ## Stop production environment
	@echo "🛑 Stopping production environment..."
	@docker-compose -f $(COMPOSE_FILE) down

##@ 🔧 Build & Development Tools
build: ## Build all Docker images
	@echo "🔧 Building all Docker images..."
	@docker-compose -f $(COMPOSE_FILE) build --parallel

build-no-cache: ## Build all Docker images without cache
	@echo "🔧 Building all Docker images (no cache)..."
	@docker-compose -f $(COMPOSE_FILE) build --no-cache --parallel

dev-tools: ## Start only development tools (pgAdmin, mailhog, etc.)
	@echo "🔧 Starting development tools..."
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) --env-file .env.development.local up pgadmin mailhog redis -d

##@ 📊 Monitoring & Logs
logs: ## Show logs from all services
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) logs -f

logs-gateway: ## Show logs from MCP gateway only
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) logs -f mcp-gateway

logs-linear: ## Show logs from Linear MCP server only
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) logs -f linear-mcp-server

status: ## Show status of all services
	@echo "📊 Service Status:"
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) --env-file .env.development.local ps

health: ## Check health of all services
	@echo "🏥 Health Check:"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter "name=$(PROJECT_NAME)"

##@ 🧪 Testing & Quality
test: ## Run all tests
	@echo "🧪 Running tests..."
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) exec mcp-gateway pnpm test
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) exec linear-mcp-server pnpm test

test-gateway: ## Run gateway tests only
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) exec mcp-gateway pnpm test

test-linear: ## Run Linear server tests only
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) exec linear-mcp-server pnpm test

lint: ## Run linting on all services
	@echo "🔍 Running linters..."
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) exec mcp-gateway pnpm lint
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) exec linear-mcp-server pnpm lint

##@ 🔧 Database Operations
db-shell: ## Connect to PostgreSQL shell
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) exec postgres psql -U postgres -d omni_mcp_dev

db-reset: ## Reset development database
	@echo "🗃️  Resetting development database..."
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) stop postgres
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) rm -f postgres
	@docker volume rm omni-postgres-data || true
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) up postgres -d

##@ 🧹 Cleanup
clean: ## Clean up containers and images
	@echo "🧹 Cleaning up..."
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) down --remove-orphans
	@docker system prune -f

clean-all: ## Clean up everything including volumes
	@echo "🧹 Cleaning up everything..."
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) down --volumes --remove-orphans
	@docker system prune -af
	@docker volume prune -f

##@ 🔐 Security & Keys
generate-secrets: ## Generate secure secrets for production
	@echo "🔐 Generated secrets:"
	@echo "JWT_SECRET=$$(openssl rand -hex 64)"
	@echo "MCP_API_KEY=$$(openssl rand -hex 32)"
	@echo "POSTGRES_PASSWORD=$$(openssl rand -base64 32)"

##@ 🎯 Quick Actions
restart: ## Quick restart of development environment
	@$(MAKE) dev-down
	@$(MAKE) dev

shell-gateway: ## Open shell in gateway container
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) exec mcp-gateway sh

shell-linear: ## Open shell in Linear server container
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) exec linear-mcp-server sh

##@ 📱 Client Integration
claude-config: ## Generate Claude Desktop configuration
	@echo "📱 Generating Claude Desktop configuration..."
	@mkdir -p client-integrations/claude-desktop
	@echo "Please check client-integrations/claude-desktop/ directory"

##@ 🐳 Docker Management
docker-images: ## List all project Docker images
	@docker images | grep -E "(omni|$(PROJECT_NAME))" || echo "No project images found"

docker-containers: ## List all project containers
	@docker ps -a | grep -E "(omni|$(PROJECT_NAME))" || echo "No project containers found"

##@ ℹ️  Information
version: ## Show version information
	@echo "📦 Omni MCP Project Information"
	@echo "=============================="
	@echo "Docker version: $$(docker --version)"
	@echo "Docker Compose version: $$(docker-compose --version)"
	@echo "Node.js version (in gateway): $$(docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) exec mcp-gateway node --version 2>/dev/null || echo 'Not running')"

urls: ## Show important URLs for development
	@echo "🔗 Development URLs"
	@echo "=================="
	@echo "MCP Gateway:      http://localhost:37373"
	@echo "pgAdmin:          http://localhost:8080"
	@echo "Mailhog:          http://localhost:8025"
	@echo "PostgreSQL:       localhost:5432"
	@echo "Redis:            localhost:6379" 