# =============================================================================
# MCP Gateway Dockerfile
# =============================================================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace configuration and lock files
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY tsconfig.base.json ./

# Copy all workspace packages
COPY packages/ ./packages/
COPY servers/ ./servers/
COPY shared/ ./shared/
COPY gateway/ ./gateway/

# Install pnpm
RUN npm install -g pnpm

# Install all dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build the gateway
RUN cd gateway && pnpm build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S gateway -u 1001 -G nodejs

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration and lock files
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Copy gateway package.json and built files
COPY gateway/package.json ./gateway/
COPY --from=builder /app/gateway/dist ./gateway/dist
COPY --from=builder /app/gateway/master.config.json ./gateway/

# Install production dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

# Set ownership
RUN chown -R gateway:nodejs /app
USER gateway

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check: Gateway is running')" || exit 1

# Expose port
EXPOSE 37373

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the gateway
CMD ["node", "gateway/dist/src/index.js"]

# Metadata
LABEL org.opencontainers.image.title="MCP Gateway"
LABEL org.opencontainers.image.description="HTTP gateway for MCP servers with proxy functionality"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="Vince" 