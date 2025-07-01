# =============================================================================
# Omni MCP - Simplified Development Makefile
# =============================================================================

.DEFAULT_GOAL := help
.PHONY: help setup dev down restart build logs clean clean-all shell-gateway shell-linear

# =============================================================================
# Configuration
# =============================================================================
COMPOSE_DEV_FILE := deployment/docker-compose.dev.yml
ENV_FILE := secrets/.env.development.local

# =============================================================================
# Core Commands
# =============================================================================
help: ## Show this help message
	@echo "🚀 Omni MCP - Essential Commands"
	@echo "================================="
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n\nTargets:\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

setup: ## Initial project setup (creates .env files)
	@echo "🏗️  Setting up development environment..."
	@mkdir -p secrets logs
	@if [ ! -f $(ENV_FILE) ]; then \
		cp secrets/.env.development.local.example $(ENV_FILE); \
		echo "✅ Created $(ENV_FILE) from example"; \
		echo "📝 Please update it with your actual API keys (e.g., LINEAR_API_KEY)"; \
	else \
		echo "✅ $(ENV_FILE) already exists."; \
	fi

dev: ## Start development environment (with hot-reloading)
	@echo "🚀 Starting development environment..."
	@docker-compose -f $(COMPOSE_DEV_FILE) up --build

down: ## Stop development environment
	@echo "🛑 Stopping development environment..."
	@docker-compose -f $(COMPOSE_DEV_FILE) down

restart: ## Restart development environment
	@$(MAKE) down
	@$(MAKE) dev

# =============================================================================
# Utility Commands
# =============================================================================
build: ## Build all Docker images without starting services
	@echo "🔧 Building all Docker images..."
	@docker-compose -f $(COMPOSE_DEV_FILE) build

logs: ## Stream logs from all running services
	@echo "📜 Streaming logs..."
	@docker-compose -f $(COMPOSE_DEV_FILE) logs -f

clean: ## Stop services and remove containers/networks
	@echo "🧹 Cleaning up containers and networks..."
	@docker-compose -f $(COMPOSE_DEV_FILE) down --remove-orphans

clean-all: ## Clean up everything, including volumes and images
	@echo "💣 Cleaning up everything (containers, networks, volumes)..."
	@docker-compose -f $(COMPOSE_DEV_FILE) down -v --remove-orphans

shell-gateway: ## Open a shell inside the gateway container
	@echo "🐚 Opening shell in mcp-gateway container..."
	@docker-compose -f $(COMPOSE_DEV_FILE) exec mcp-gateway sh

shell-linear: ## Open a shell inside the linear-mcp-server container
	@echo "🐚 Opening shell in linear-mcp-server container..."
	@docker-compose -f $(COMPOSE_DEV_FILE) exec linear-mcp-server sh 