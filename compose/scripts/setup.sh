#!/bin/bash

# MCP Orchestrator Setup Script
set -e

echo "🚀 Setting up MCP Orchestrator..."

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data/files data/uploads secrets

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please create one based on the template:"
    echo "   cp .env.example .env"
    echo "   # Then edit .env with your actual values"
    exit 1
fi

# Source environment variables
source .env

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Pull required MCP server images
echo "📦 Pulling MCP server images..."
docker pull us-central1-docker.pkg.dev/database-toolbox/toolbox/toolbox:0.7.0
docker pull mcp/filesystem-server:latest

# Check if GCP credentials exist (if using Google Cloud)
if [ ! -f secrets/gcp-creds.json ]; then
    echo "⚠️  GCP credentials not found at secrets/gcp-creds.json"
    echo "   If you're using Google Cloud databases, please add your service account key."
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your .env file with actual database credentials"
echo "2. If using Google Cloud, add your service account key to secrets/gcp-creds.json"
echo "3. Run 'make up' or 'mcp-compose up' to start the services"
echo "4. Test with 'make test'" 