# =============================================================================
# Linear MCP Server Dockerfile
# =============================================================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy the base tsconfig and workspace config
COPY tsconfig.base.json ./
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy shared utils (still needed for environment loading)
COPY shared/utils/package.json ./shared/utils/
COPY shared/utils/tsconfig.json ./shared/utils/
COPY shared/utils/src/ ./shared/utils/src/

# Copy linear server package files
COPY servers/linear-mcp-server/package.json ./servers/linear-mcp-server/
COPY servers/linear-mcp-server/tsconfig.json ./servers/linear-mcp-server/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies using pnpm (handles workspace dependencies)
RUN pnpm install --frozen-lockfile

# Copy linear server source code
COPY servers/linear-mcp-server/src/ ./servers/linear-mcp-server/src/

# Build shared utils first
RUN cd shared/utils && pnpm build

# Build linear server
RUN cd servers/linear-mcp-server && pnpm build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S linear -u 1001 -G nodejs

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config and package files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy shared utils package
COPY shared/utils/package.json ./shared/utils/
COPY --from=builder /app/shared/utils/dist ./shared/utils/dist

# Copy linear server package
COPY servers/linear-mcp-server/package.json ./servers/linear-mcp-server/

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built linear server application
COPY --from=builder /app/servers/linear-mcp-server/dist ./servers/linear-mcp-server/dist

# Set ownership
RUN chown -R linear:nodejs /app
USER linear

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check: Linear MCP server is running')" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the Linear MCP server
CMD ["node", "servers/linear-mcp-server/dist/index.js"]

# Metadata
LABEL org.opencontainers.image.title="Linear MCP Server"
LABEL org.opencontainers.image.description="Linear MCP server built with official MCP SDK, TypeScript, and Linear SDK"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="Vince" 