.PHONY: up down build logs status clean

# Core commands
up:
	mcp-compose up

down:
	mcp-compose down

build:
	mcp-compose build

logs:
	mcp-compose logs

status:
	mcp-compose ls

# Individual server operations
up-db:
	mcp-compose up database-toolbox

up-filesystem:
	mcp-compose up filesystem

# Development tools
inspector:
	mcp-compose inspector

validate:
	mcp-compose validate

# Client configuration generation
client-configs:
	mcp-compose create-config --type claude --output ./client-integrations/claude-desktop/
	mcp-compose create-config --type cursor --output ./client-integrations/cursor/

# Cleanup
clean:
	mcp-compose down
	docker system prune -f

# Testing
test:
	@echo "Testing MCP servers..."
	@echo "Database toolbox status:"
	@docker ps --filter name=mcp-database-toolbox --format "table {{.Names}}\t{{.Status}}"
	@echo "Filesystem server status:"
	@docker ps --filter name=mcp-filesystem-server --format "table {{.Names}}\t{{.Status}}"

# Setup
setup:
	@echo "Creating required directories..."
	@mkdir -p data/files data/uploads secrets
	@echo "Please configure your .env file"

# Alternative Docker Compose commands
docker-up:
	cd deployment && docker-compose up -d

docker-down:
	cd deployment && docker-compose down

docker-logs:
	cd deployment && docker-compose logs -f

# Quick setup script
quick-setup:
	./compose/scripts/setup.sh

# Generate API key
generate-key:
	@echo "Generated API Key: $$(openssl rand -hex 32)"

# Pull required images
pull-images:
	docker pull us-central1-docker.pkg.dev/database-toolbox/toolbox/toolbox:0.7.0
	docker pull mcp/filesystem-server:latest 