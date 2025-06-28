#!/bin/bash

# =============================================================================
# Claude Desktop Configuration Setup Script
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🔧 Claude Desktop MCP Configuration Setup${NC}"
echo "=================================================="

# Detect OS
OS=""
CLAUDE_CONFIG_DIR=""

if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
    CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    OS="Windows"
    CLAUDE_CONFIG_DIR="$APPDATA/Claude"
else
    echo -e "${RED}❌ Unsupported operating system: $OSTYPE${NC}"
    exit 1
fi

echo -e "${BLUE}📱 Detected OS: ${OS}${NC}"
echo -e "${BLUE}📁 Claude config directory: ${CLAUDE_CONFIG_DIR}${NC}"

# Check if Claude Desktop is installed
if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
    echo -e "${YELLOW}⚠️  Claude Desktop config directory not found.${NC}"
    echo -e "${YELLOW}   Please make sure Claude Desktop is installed and has been run at least once.${NC}"
    read -p "Do you want to create the directory? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mkdir -p "$CLAUDE_CONFIG_DIR"
        echo -e "${GREEN}✅ Created Claude Desktop config directory${NC}"
    else
        echo -e "${RED}❌ Aborted${NC}"
        exit 1
    fi
fi

# Source and destination files
SOURCE_CONFIG="$PROJECT_ROOT/client-integrations/claude-desktop/claude_desktop_config.json"
LOCAL_CONFIG="$PROJECT_ROOT/client-integrations/claude-desktop/claude_desktop_config.local.json"
DEST_CONFIG="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

# Check if local config exists (preferred), otherwise use main config
if [ -f "$LOCAL_CONFIG" ]; then
    SOURCE_CONFIG="$LOCAL_CONFIG"
    echo -e "${GREEN}✅ Using local configuration with secrets${NC}"
elif [ -f "$SOURCE_CONFIG" ]; then
    echo -e "${YELLOW}⚠️  Using template configuration (you'll need to add secrets manually)${NC}"
else
    echo -e "${RED}❌ No configuration file found${NC}"
    exit 1
fi

# Backup existing config if it exists
if [ -f "$DEST_CONFIG" ]; then
    BACKUP_FILE="${DEST_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${YELLOW}📋 Backing up existing configuration to: $(basename "$BACKUP_FILE")${NC}"
    cp "$DEST_CONFIG" "$BACKUP_FILE"
fi

# Copy the configuration
echo -e "${BLUE}📄 Copying MCP configuration...${NC}"
cp "$SOURCE_CONFIG" "$DEST_CONFIG"

echo -e "${GREEN}✅ Configuration copied successfully!${NC}"
echo

# Validate the JSON
if command -v python3 &> /dev/null; then
    if python3 -m json.tool "$DEST_CONFIG" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Configuration file is valid JSON${NC}"
    else
        echo -e "${RED}❌ Configuration file contains invalid JSON${NC}"
        exit 1
    fi
elif command -v node &> /dev/null; then
    if node -e "JSON.parse(require('fs').readFileSync('$DEST_CONFIG', 'utf8'))" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Configuration file is valid JSON${NC}"
    else
        echo -e "${RED}❌ Configuration file contains invalid JSON${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Could not validate JSON (no python3 or node found)${NC}"
fi

# Show configured servers
echo
echo -e "${BLUE}🔧 Configured MCP Servers:${NC}"
if command -v jq &> /dev/null; then
    jq -r '.mcpServers | keys[]' "$DEST_CONFIG" | while read server; do
        echo -e "  ${GREEN}• ${server}${NC}"
    done
else
    echo -e "${YELLOW}  (install jq to see server list)${NC}"
fi

echo
echo -e "${GREEN}🎉 Setup complete!${NC}"

# Check if secrets need to be configured
LINEAR_SECRET_FILE="$PROJECT_ROOT/secrets/linear.env"
if [ ! -f "$LINEAR_SECRET_FILE" ]; then
    echo
    echo -e "${YELLOW}⚠️  Linear API Key Setup Required:${NC}"
    echo -e "  1. Copy: ${BLUE}cp secrets/linear.env.example secrets/linear.env${NC}"
    echo -e "  2. Edit: ${BLUE}nano secrets/linear.env${NC}"
    echo -e "  3. Add your Linear API key from: ${BLUE}https://linear.app/settings/api${NC}"
fi

echo
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. ${YELLOW}Restart Claude Desktop${NC} (Cmd+Q then reopen)"
echo -e "  2. ${YELLOW}Start your database${NC}: cd deployment && docker-compose up -d postgres"
echo -e "  3. ${YELLOW}Test the integration${NC} by asking Claude to:"
echo -e "     • 'List files in my projects directory'"
echo -e "     • 'Show me all customers in the database'"
echo -e "     • 'Search for Linear issues'"
echo
echo -e "${BLUE}📖 For troubleshooting, see: ${PROJECT_ROOT}/CLAUDE_DESKTOP_SETUP.md${NC}" 