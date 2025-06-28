# MCP Orchestrator with DVD Rental Database

A complete Model Context Protocol (MCP) setup with filesystem and database servers, featuring a PostgreSQL DVD rental sample database.

## 🚀 Quick Start

### 1. Start All Services

```bash
cd deployment
docker-compose up -d
```

### 2. Verify Everything is Running

```bash
docker-compose ps
```

You should see:

- `mcp-postgres` (healthy)
- `mcp-database-toolbox` (running)
- `mcp-filesystem-server` (running)

### 3. Test Database Connection

```bash
docker exec mcp-postgres psql -U postgres -d dvdrental -c "SELECT COUNT(*) FROM customer;"
```

## 🔧 Claude Desktop Integration

### Option 1: Direct Docker Integration (Recommended)

Copy this configuration to your Claude Desktop config file:

**Location:**

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--mount",
        "type=bind,src=/Users/vince/Projects/omni/data/files,dst=/projects/files",
        "--mount",
        "type=bind,src=/Users/vince/Projects/omni/data/uploads,dst=/projects/uploads",
        "mcp/filesystem",
        "/projects"
      ]
    },
    "database-toolbox": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--network",
        "mcp-network",
        "-v",
        "/Users/vince/Projects/omni/compose/configs/database-tools.yaml:/config/tools.yaml:ro",
        "us-central1-docker.pkg.dev/database-toolbox/toolbox/toolbox:0.7.0",
        "./toolbox",
        "--tools-file",
        "/config/tools.yaml",
        "--stdio"
      ]
    }
  }
}
```

**⚠️ Important:** Update the file paths in the configuration to match your actual project location.

### Option 2: Using Running Containers

If you prefer to connect to already running containers, you can use a simpler approach with MCP proxy tools.

## 📊 Available Tools

### Database Tools (DVD Rental)

- **query-customers**: Search customer data with filters
- **get-customer-rentals**: Get rental history for customers
- **search-films**: Search films by title, category, or actor
- **get-store-inventory**: Check available inventory by store

### Filesystem Tools

- **read_file**: Read file contents
- **write_file**: Create or update files
- **list_directory**: List directory contents
- **create_directory**: Create new directories
- **move_file**: Move/rename files and directories
- **search_files**: Search for files by pattern
- **get_file_info**: Get detailed file metadata

## 🎬 Sample Database

The PostgreSQL database contains a simplified DVD rental schema with:

- **5 customers** (John Doe, Jane Smith, etc.)
- **5 films** (The Matrix, Finding Nemo, The Godfather, Toy Story, Pulp Fiction)
- **16 categories** (Action, Animation, Comedy, Drama, etc.)
- **10 actors** (Johnny Depp, Brad Pitt, etc.)
- **Sample rental transactions**

### Example Queries

Ask Claude to:

- "Show me all customers and their recent rentals"
- "Find all action movies in store 1"
- "List customers who haven't returned their movies"
- "Search for films with 'Matrix' in the title"

## 🛠 Development Commands

```bash
# Start all services
make up
# or
cd deployment && docker-compose up -d

# Stop all services
make down

# View logs
make logs

# Check status
make test

# Pull latest images
make pull-images

# Generate new API key
make generate-key
```

## 📁 Project Structure

```
omni/
├── client-integrations/
│   ├── claude-desktop/           # Claude Desktop configs
│   └── cursor/                   # Cursor IDE configs
├── compose/
│   ├── mcp-compose.yaml          # MCP-Compose orchestration
│   └── configs/
│       └── database-tools.yaml   # Database tool definitions
├── data/
│   ├── files/                    # Filesystem server files
│   ├── uploads/                  # Upload directory
│   └── dvdrental/               # DVD rental database files
├── deployment/
│   └── docker-compose.yml        # Docker Compose setup
└── docs/
    ├── ARCHITECTURE.md           # Detailed architecture
    ├── setup.md                  # Setup instructions
    └── usage.md                  # Usage examples
```

## 🔒 Security Notes

- Filesystem server is restricted to `/data/files` and `/data/uploads` directories
- Database tools use read-only queries for safety
- All containers run with minimal privileges
- API keys should be rotated regularly

## 🚨 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL status
docker logs mcp-postgres

# Test database connectivity
docker exec mcp-postgres pg_isready -U postgres
```

### MCP Server Issues

```bash
# Check all container status
cd deployment && docker-compose ps

# View specific service logs
docker logs mcp-database-toolbox
docker logs mcp-filesystem-server
```

### Claude Desktop Connection

1. Ensure Docker containers are running
2. Verify file paths in config are correct
3. Check Claude Desktop logs for connection errors
4. Restart Claude Desktop after config changes

## 📚 Next Steps

1. **Customize Database**: Add your own tables and data to the PostgreSQL database
2. **Extend Tools**: Modify `database-tools.yaml` to add custom queries
3. **File Operations**: Use the filesystem tools to manage project files
4. **Integration**: Connect other AI tools using the same MCP servers

## 🤝 Contributing

Feel free to extend this setup with additional MCP servers or database schemas. The architecture is designed to be modular and extensible.
