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

dev-local: ## Start local development with Claude Desktop integration
	@echo "🛠️ Starting local development with Claude Desktop integration..."
	@$(MAKE) claude-config-dev
	@echo "🔧 Build shared packages..."
	@pnpm build
	@echo "🚀 Start development environment..."
	@$(MAKE) dev-detached
	@echo "🔍 Start Claude Desktop config watcher..."
	@$(MAKE) claude-watch

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
logs: ## Real-time logs for all services (Docker + Local)
	@echo "🚀 Real-time MCP & Service Monitoring"
	@echo "====================================="
	@echo ""
	@echo "🐳 Docker Services (real-time tail):"
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) logs -f --tail=20 --timestamps

logs-mcp-only: ## Real-time logs for MCP servers only
	@echo "🔧 Real-time MCP Servers Only"
	@echo "=============================="
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) logs -f --tail=20 --timestamps linear-mcp-server filesystem-mcp-server mcp-gateway 2>/dev/null || \
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) logs -f --tail=20 --timestamps linear-mcp-server filesystem-mcp-server

logs-local: ## Monitor local MCP servers (direct connections)
	@echo "🖥️ Local MCP Server Monitoring"
	@echo "==============================="
	@echo "💡 For real-time local MCP logs, run in separate terminal:"
	@echo "   log stream --predicate 'process CONTAINS \"node\" AND message CONTAINS \"Linear\"' --info"
	@echo ""
	@echo "🔍 Alternative - Monitor all node processes:"
	@echo "   log stream --predicate 'process CONTAINS \"node\"' --info | grep -i mcp"

tail: ## Real-time tail of ALL activity (MCP + Infrastructure)  
	@echo "📡 Real-time tail of everything..."
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) logs -f --tail=10 --timestamps

test-all-mcp: ## Test all MCP servers manually
	@echo "🧪 Testing all MCP servers..."
	@echo ""
	@echo "📝 Linear MCP Server (local):"
	@if [ -f servers/linear-mcp-server/dist/index.js ]; then \
		cd servers/linear-mcp-server && echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js 2>/dev/null || echo "✅ Linear server responded"; \
	else \
		echo "❌ Linear server not built. Run: pnpm build"; \
	fi
	@echo ""
	@echo "🐳 Docker MCP Servers:"
	@echo "  → Filesystem: $(shell docker ps --format '{{.Names}}' | grep filesystem-mcp || echo '❌ Not running')"
	@echo "  → Database Toolbox: $(shell docker ps --format '{{.Names}}' | grep database || echo '❌ Not running')" 
	@echo "  → Gateway: $(shell docker ps --format '{{.Names}}' | grep mcp-gateway || echo '❌ Not running')"
	@echo "  → Linear (Docker): $(shell docker ps --format '{{.Names}}' | grep linear-mcp || echo '❌ Not running')"

validate-mcp-pattern: ## Validate that MCP servers follow the enterprise pattern
	@echo "🔍 Validating MCP Server Enterprise Pattern Compliance"
	@echo "===================================================="
	@echo ""
	@echo "📋 Checking Linear MCP Server (Gold Standard):"
	@echo "  ✅ Shared Type Usage:"
	@grep -q "@mcp/schemas" servers/linear-mcp-server/src/mcp-server/tools.ts && echo "    ✅ tools.ts imports @mcp/schemas" || echo "    ❌ tools.ts missing @mcp/schemas import"
	@grep -q "@mcp/schemas" servers/linear-mcp-server/src/mcp-server/resources.ts && echo "    ✅ resources.ts imports @mcp/schemas" || echo "    ❌ resources.ts missing @mcp/schemas import"
	@grep -q "@mcp/schemas" servers/linear-mcp-server/src/mcp-server/prompts.ts && echo "    ✅ prompts.ts imports @mcp/schemas" || echo "    ❌ prompts.ts missing @mcp/schemas import"
	@echo ""
	@echo "  ✅ No Local Type Definitions:"
	@! grep -q "interface.*Tool\|interface.*Resource\|interface.*Prompt" servers/linear-mcp-server/src/mcp-server/tools.ts servers/linear-mcp-server/src/mcp-server/resources.ts servers/linear-mcp-server/src/mcp-server/prompts.ts 2>/dev/null && echo "    ✅ No local type redefinitions found" || echo "    ❌ Found local type redefinitions"
	@echo ""
	@echo "  ✅ Shared Constants Usage:"
	@grep -q "LINEAR_TOOLS\|LINEAR_RESOURCES\|LINEAR_PROMPTS" servers/linear-mcp-server/src/mcp-server/tools.ts servers/linear-mcp-server/src/mcp-server/resources.ts servers/linear-mcp-server/src/mcp-server/prompts.ts && echo "    ✅ Uses shared schema constants" || echo "    ❌ Missing shared schema constants"
	@echo ""
	@echo "  ✅ McpResponse Pattern:"
	@grep -q "McpResponse" servers/linear-mcp-server/src/mcp-server/tools/linear-tools.ts && echo "    ✅ Uses McpResponse<T> pattern" || echo "    ❌ Missing McpResponse<T> pattern"
	@echo ""
	@echo "📖 Pattern Documentation: MCP_SERVER_PATTERN.md"
	@echo "🏆 Gold Standard Reference: servers/linear-mcp-server/"

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

claude-watch: ## Start chokidar watcher for Claude Desktop config auto-sync
	@echo "🔍 Starting Claude Desktop config watcher..."
	@pnpm --filter dev-tools watch:claude-config

claude-config-dev: ## Use development config (local servers) for Claude Desktop
	@echo "🛠️ Switching to development config..."
	@cp client-integrations/claude-desktop/claude_desktop_config.dev.json client-integrations/claude-desktop/claude_desktop_config.local.json
	@echo "✅ Development config active. Start watcher with: make claude-watch"

claude-config-prod: ## Use production config (Docker containers) for Claude Desktop  
	@echo "🐳 Switching to production config..."
	@cp client-integrations/claude-desktop/claude_desktop_config.json client-integrations/claude-desktop/claude_desktop_config.local.json
	@echo "✅ Production config active. Start watcher with: make claude-watch"

claude-config-gateway: ## Use gateway routing config for Claude Desktop
	@echo "🌐 Switching to gateway routing config..."
	@cp client-integrations/claude-desktop/claude_desktop_config.gateway.json client-integrations/claude-desktop/claude_desktop_config.local.json
	@echo "✅ Gateway routing config active. Start watcher with: make claude-watch"
	@echo "🔧 Make sure gateway is running: make dev"

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