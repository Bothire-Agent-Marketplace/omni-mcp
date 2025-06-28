# =============================================================================
# Linear MCP Server Dockerfile
# =============================================================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S linear -u 1001 -G nodejs

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R linear:nodejs /app
USER linear

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check: Linear MCP server is running')" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the Linear MCP server
CMD ["node", "dist/index.js"]

# Metadata
LABEL org.opencontainers.image.title="Linear MCP Server"
LABEL org.opencontainers.image.description="Linear MCP server built with TypeScript, Zod validation, and Linear SDK"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="Vince" 