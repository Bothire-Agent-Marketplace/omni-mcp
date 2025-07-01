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
ENV_FILE := secrets/.env.development.local

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
		cp .env.development.local.example .env.development.local; \
		echo "✅ Created .env.development.local from example"; \
	fi
	@echo "📝 Please update .env.development.local with your actual API keys:"
	@echo "   🔗 Linear API key: https://linear.app/settings/api"
	@echo "⚠️  NEVER commit .env.*.local files - they contain secrets!"

setup-prod: ## Setup production environment file
	@echo "🏭 Setting up production environment..."
	@if [ ! -f .env.production.local ]; then \
		cp .env.production.local.example .env.production.local; \
		echo "✅ Created .env.production.local from example"; \
	fi
	@echo "📝 Please update .env.production.local with your production values"
	@echo "⚠️  NEVER commit .env.production.local - it contains secrets!"

setup-env: setup ## Alias for setup

##@ 🚀 Development
dev: ## Start development environment with hot reload
	@echo "🚀 Starting development environment..."
	@echo "🧹 Cleaning up any existing processes..."
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) down 2>/dev/null || true
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) --env-file $(ENV_FILE) up --build

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
	@echo "🧹 Cleaning up any existing processes..."
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) down 2>/dev/null || true
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) --env-file $(ENV_FILE) up --build -d

dev-gateway: ## Start only the MCP Gateway for on-demand server spawning
	@echo "🚀 Starting MCP Gateway in on-demand mode..."
	@echo "🧹 Cleaning up any existing gateway processes..."
	@pkill -f "tsx src/index.ts" 2>/dev/null || true
	@lsof -ti:37373 | xargs kill -9 2>/dev/null || true
	@sleep 1
	@echo "🔧 Ensuring Linear server is built..."
	@cd servers/linear-mcp-server && pnpm build
	@echo "🌐 Starting gateway with on-demand server spawning..."
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "❌ $(ENV_FILE) not found. Run 'make setup' first."; \
		exit 1; \
	fi
	@export $$(grep -v '^#' $(ENV_FILE) | grep -v '^$$' | xargs) && cd gateway && pnpm dev

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
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) --env-file $(ENV_FILE) up pgadmin mailhog redis -d

##@ 📊 Unified Logging & Request Tracing
logs: ## Real-time unified logs for all services with request correlation
	@echo "🚀 Unified MCP Request Tracing & Service Monitoring"
	@echo "=================================================="
	@echo "🔍 Showing structured logs from all MCP services"
	@echo "📡 Request correlation via requestId tracking"
	@echo "⚡ Real-time tail with JSON parsing"
	@echo ""
	@$(MAKE) logs-unified

logs-unified: ## Unified structured logging with request correlation
	@echo "🌐 Starting unified MCP logging (Ctrl+C to stop)..."
	@echo ""
	@pnpm dev 2>&1 | \
	while IFS= read -r line; do \
		timestamp=$$(date '+%H:%M:%S.%3N'); \
		if echo "$$line" | grep -q '"timestamp".*"level".*"message"'; then \
			service=$$(echo "$$line" | jq -r '.serverName // "unknown"' 2>/dev/null || echo "unknown"); \
			level=$$(echo "$$line" | jq -r '.level // "info"' 2>/dev/null || echo "info"); \
			message=$$(echo "$$line" | jq -r '.message // "no message"' 2>/dev/null || echo "no message"); \
			requestId=$$(echo "$$line" | jq -r '.requestId // empty' 2>/dev/null || echo ""); \
			method=$$(echo "$$line" | jq -r '.method // empty' 2>/dev/null || echo ""); \
			phase=$$(echo "$$line" | jq -r '.phase // empty' 2>/dev/null || echo ""); \
			if [ "$$level" = "error" ]; then \
				printf "\033[31m[$$timestamp]\033[0m \033[91m$$level\033[0m \033[36m$$service\033[0m"; \
			elif [ "$$level" = "warn" ]; then \
				printf "\033[33m[$$timestamp]\033[0m \033[93m$$level\033[0m \033[36m$$service\033[0m"; \
			elif [ "$$level" = "info" ]; then \
				printf "\033[32m[$$timestamp]\033[0m \033[92m$$level\033[0m \033[36m$$service\033[0m"; \
			else \
				printf "\033[37m[$$timestamp]\033[0m \033[37m$$level\033[0m \033[36m$$service\033[0m"; \
			fi; \
			if [ -n "$$requestId" ]; then \
				printf " \033[35mreq:$$requestId\033[0m"; \
			fi; \
			if [ -n "$$method" ]; then \
				printf " \033[34m$$method\033[0m"; \
			fi; \
			if [ -n "$$phase" ]; then \
				printf " \033[90m($$phase)\033[0m"; \
			fi; \
			printf " $$message\n"; \
		else \
			service=$$(echo "$$line" | sed -n 's/.*@\([^:]*\):dev:.*/\1/p' | head -1); \
			if [ -n "$$service" ]; then \
				clean_line=$$(echo "$$line" | sed 's/.*@[^:]*:dev: //'); \
				printf "\033[37m[$$timestamp]\033[0m \033[90mraw\033[0m \033[36m$$service\033[0m $$clean_line\n"; \
			else \
				printf "\033[37m[$$timestamp]\033[0m \033[90msystem\033[0m $$line\n"; \
			fi; \
		fi; \
	done

logs-mcp-only: ## Real-time logs for MCP servers with request tracing
	@echo "🔧 MCP Servers Request Tracing"
	@echo "=============================="
	@echo "🎯 Filtering: Linear server, Gateway, Tool executions"
	@echo ""
	@pnpm dev 2>&1 | grep -E "(linear-mcp-server|mcp-gateway|toolExecution|mcpRequest)" | \
	while IFS= read -r line; do \
		timestamp=$$(date '+%H:%M:%S.%3N'); \
		if echo "$$line" | grep -q '"requestId"'; then \
			requestId=$$(echo "$$line" | jq -r '.requestId // "no-id"' 2>/dev/null); \
			method=$$(echo "$$line" | jq -r '.method // .toolName // "unknown"' 2>/dev/null); \
			printf "\033[35m[$$timestamp] 🔗 $$requestId\033[0m \033[34m$$method\033[0m\n"; \
		fi; \
		printf "\033[37m[$$timestamp]\033[0m $$line\n"; \
	done

logs-trace: ## Trace specific request by ID (usage: make logs-trace REQ_ID=req_123)
	@if [ -z "$(REQ_ID)" ]; then \
		echo "❌ Please specify REQ_ID: make logs-trace REQ_ID=req_123456"; \
		exit 1; \
	fi
	@echo "🔍 Tracing request: $(REQ_ID)"
	@echo "=========================="
	@pnpm dev 2>&1 | grep "$(REQ_ID)" | \
	while IFS= read -r line; do \
		timestamp=$$(date '+%H:%M:%S.%3N'); \
		phase=$$(echo "$$line" | jq -r '.phase // "unknown"' 2>/dev/null); \
		service=$$(echo "$$line" | jq -r '.serverName // "unknown"' 2>/dev/null); \
		printf "\033[35m[$$timestamp] 🔗 $(REQ_ID)\033[0m \033[36m$$service\033[0m \033[90m$$phase\033[0m\n"; \
		echo "$$line" | jq . 2>/dev/null || echo "$$line"; \
	done

logs-performance: ## Monitor performance metrics and timing
	@echo "⚡ MCP Performance Monitoring"
	@echo "============================="
	@echo "🎯 Tracking: Tool execution times, request durations"
	@echo ""
	@pnpm dev 2>&1 | grep -E "(duration|timing|completed|performance)" | \
	while IFS= read -r line; do \
		timestamp=$$(date '+%H:%M:%S.%3N'); \
		if echo "$$line" | grep -q '"duration"'; then \
			duration=$$(echo "$$line" | jq -r '.duration // 0' 2>/dev/null); \
			toolName=$$(echo "$$line" | jq -r '.toolName // .method // "unknown"' 2>/dev/null); \
			if [ "$$duration" -gt 1000 ]; then \
				printf "\033[31m[$$timestamp] ⚠️  SLOW ($$duration ms)\033[0m \033[34m$$toolName\033[0m\n"; \
			elif [ "$$duration" -gt 500 ]; then \
				printf "\033[33m[$$timestamp] ⚡ $$duration ms\033[0m \033[34m$$toolName\033[0m\n"; \
			else \
				printf "\033[32m[$$timestamp] ✅ $$duration ms\033[0m \033[34m$$toolName\033[0m\n"; \
			fi; \
		else \
			printf "\033[37m[$$timestamp]\033[0m $$line\n"; \
		fi; \
	done

logs-errors: ## Monitor errors and failures across all services
	@echo "🚨 Error Monitoring"
	@echo "=================="
	@echo "🎯 Tracking: Errors, failures, exceptions"
	@echo ""
	@pnpm dev 2>&1 | grep -E "(error|Error|ERROR|failed|Failed|exception)" | \
	while IFS= read -r line; do \
		timestamp=$$(date '+%H:%M:%S.%3N'); \
		if echo "$$line" | grep -q '"level":"error"'; then \
			service=$$(echo "$$line" | jq -r '.serverName // "unknown"' 2>/dev/null); \
			message=$$(echo "$$line" | jq -r '.message // "no message"' 2>/dev/null); \
			printf "\033[31m[$$timestamp] 🚨 ERROR\033[0m \033[36m$$service\033[0m $$message\n"; \
			errorStack=$$(echo "$$line" | jq -r '.errorStack // empty' 2>/dev/null); \
			if [ -n "$$errorStack" ]; then \
				echo "$$errorStack" | head -3 | sed 's/^/  \033[90m|\033[0m /'; \
			fi; \
		else \
			printf "\033[31m[$$timestamp] ❌\033[0m $$line\n"; \
		fi; \
	done

logs-json: ## Raw JSON logs for external processing
	@echo "📄 Raw JSON MCP Logs"
	@echo "===================="
	@pnpm dev 2>&1 | grep -E '"timestamp".*"level".*"message"' | \
	while IFS= read -r line; do \
		echo "$$line" | jq -c .; \
	done

logs-dev: ## Development-friendly logs with syntax highlighting
	@echo "🛠️  Development Logs"
	@echo "==================="
	@pnpm dev 2>&1 | \
	while IFS= read -r line; do \
		timestamp=$$(date '+%H:%M:%S.%3N'); \
		if echo "$$line" | grep -q '"timestamp"'; then \
			echo "$$line" | jq . 2>/dev/null | sed "s/^/\033[37m[$$timestamp]\033[0m /" || echo "$$line"; \
		else \
			printf "\033[37m[$$timestamp]\033[0m $$line\n"; \
		fi; \
	done

##@ 🔍 Request Testing & Tracing
test-linear-with-trace: ## Test Linear API with full request tracing
	@echo "🧪 Testing Linear MCP with Request Tracing"
	@echo "=========================================="
	@echo "🚀 Starting services..."
	@$(MAKE) dev-detached
	@sleep 8
	@echo ""
	@echo "🔍 Making Linear API call with trace..."
	@REQUEST_ID=$$(date +%s)_test; \
	echo "📡 Request ID: $$REQUEST_ID"; \
	curl -X POST http://localhost:37373/mcp \
		-H "Content-Type: application/json" \
		-H "X-Request-ID: $$REQUEST_ID" \
		-d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"linear_search_issues","arguments":{"limit":3}}}' \
		2>/dev/null | jq . && \
	echo "" && \
	echo "🔍 Checking logs for request: $$REQUEST_ID" && \
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) logs --since=30s | grep "$$REQUEST_ID" || echo "No trace found in Docker logs"

test-all-endpoints: ## Test all MCP endpoints with tracing
	@echo "🧪 Testing All MCP Endpoints"
	@echo "============================"
	@$(MAKE) dev-detached
	@sleep 8
	@echo ""
	@echo "📋 Testing tools/list..."
	@curl -s -X POST http://localhost:37373/mcp -H "Content-Type: application/json" \
		-d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | jq '.data.tools[].name'
	@echo ""
	@echo "📋 Testing resources/list..."
	@curl -s -X POST http://localhost:37373/mcp -H "Content-Type: application/json" \
		-d '{"jsonrpc":"2.0","id":2,"method":"resources/list","params":{}}' | jq '.data.resources[].name'
	@echo ""
	@echo "📋 Testing prompts/list..."
	@curl -s -X POST http://localhost:37373/mcp -H "Content-Type: application/json" \
		-d '{"jsonrpc":"2.0","id":3,"method":"prompts/list","params":{}}' | jq '.data.prompts[].name'

##@ 📊 Service Monitoring
monitor: ## Real-time service monitoring dashboard
	@echo "📊 MCP Service Monitoring Dashboard"
	@echo "==================================="
	@while true; do \
		clear; \
		echo "📊 MCP Services Status - $$(date '+%H:%M:%S')"; \
		echo "=========================================="; \
		echo ""; \
		echo "🐳 Docker Services:"; \
		docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  No Docker services running"; \
		echo ""; \
		echo "🌐 Network Endpoints:"; \
		curl -s http://localhost:37373/health 2>/dev/null | jq -r '"  Gateway: " + .status' || echo "  Gateway: ❌ Not responding"; \
		echo ""; \
		echo "📈 Recent Activity (last 10 lines):"; \
		docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) logs --tail=10 --timestamps 2>/dev/null | tail -5 | sed 's/^/  /' || echo "  No recent activity"; \
		echo ""; \
		echo "Press Ctrl+C to stop monitoring..."; \
		sleep 5; \
	done

##@ 🧪 Advanced Testing
stress-test: ## Stress test MCP services with concurrent requests
	@echo "⚡ MCP Stress Testing"
	@echo "==================="
	@$(MAKE) dev-detached
	@sleep 8
	@echo "🚀 Sending 10 concurrent Linear search requests..."
	@for i in $$(seq 1 10); do \
		(curl -s -X POST http://localhost:37373/mcp \
			-H "Content-Type: application/json" \
			-d "{\"jsonrpc\":\"2.0\",\"id\":$$i,\"method\":\"tools/call\",\"params\":{\"name\":\"linear_search_issues\",\"arguments\":{\"limit\":2}}}" \
			> /tmp/mcp_test_$$i.json &); \
	done; \
	wait; \
	echo "✅ All requests completed. Results:"; \
	for i in $$(seq 1 10); do \
		if [ -f /tmp/mcp_test_$$i.json ]; then \
			success=$$(cat /tmp/mcp_test_$$i.json | jq -r '.success // false'); \
			echo "  Request $$i: $$success"; \
			rm -f /tmp/mcp_test_$$i.json; \
		fi; \
	done

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

##@ 🛠️  MCP Server Management (CLI)
create-mcp: ## Create new MCP server (usage: make create-mcp SERVICE=github)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Please specify SERVICE name: make create-mcp SERVICE=github"; \
		exit 1; \
	fi
	@echo "🏗️  Creating $(SERVICE) MCP server..."
	@cd packages/dev-tools && pnpm build && node dist/cli/index.js create $(SERVICE)

list-mcp: ## List all MCP servers in the project
	@echo "📋 Listing MCP servers..."
	@cd packages/dev-tools && pnpm build && node dist/cli/index.js list

list-mcp-verbose: ## List all MCP servers with detailed information
	@echo "📋 Listing MCP servers (verbose)..."
	@cd packages/dev-tools && pnpm build && node dist/cli/index.js list --verbose

validate-mcp: ## Validate MCP server compliance (usage: make validate-mcp SERVICE=github)
	@if [ -z "$(SERVICE)" ]; then \
		echo "🔍 Validating all MCP servers..."; \
		cd packages/dev-tools && pnpm build && node dist/cli/index.js validate; \
	else \
		echo "🔍 Validating $(SERVICE) MCP server..."; \
		cd packages/dev-tools && pnpm build && node dist/cli/index.js validate $(SERVICE); \
	fi

remove-mcp: ## Remove MCP server (usage: make remove-mcp SERVICE=github)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Please specify SERVICE name: make remove-mcp SERVICE=github"; \
		exit 1; \
	fi
	@echo "🗑️  Removing $(SERVICE) MCP server..."
	@cd packages/dev-tools && pnpm build && node dist/cli/index.js remove $(SERVICE) --force

omni-cli: ## Access the full Omni CLI (usage: make omni-cli ARGS="create github")
	@echo "🚀 Omni MCP CLI..."
	@cd packages/dev-tools && pnpm build && node dist/cli/index.js $(ARGS)

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