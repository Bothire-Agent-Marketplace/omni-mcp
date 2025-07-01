
# Use the official builder image from the linear-mcp-server
# This ensures a consistent build environment for all our servers
FROM omni/linear-mcp-server:builder AS builder

# Copy the source code for this specific server
# We assume the context is the root of the monorepo
COPY servers/query-quill-mcp-server/ ./servers/query-quill-mcp-server/

# Build the TypeScript code
# This relies on the builder having all workspace dependencies installed
RUN cd servers/query-quill-mcp-server && pnpm build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy dependency manifests for this server
COPY servers/query-quill-mcp-server/package.json ./

# Install only production dependencies for this server
# Using 'npm' because it's simpler and doesn't require the full workspace setup
RUN npm install --omit=dev

# Copy built code and production node_modules from builder stage
COPY --from=builder /app/servers/query-quill-mcp-server/dist ./dist
# We need to copy the shared utils dist code as well
# This path is based on the builder image's structure
COPY --from=builder /app/shared/utils/dist ./shared/utils/dist
COPY --from=builder /app/shared/utils/package.json ./shared/utils/

# Expose the port the server will run on
# The actual port is controlled by the .env file, but this is good practice
EXPOSE 3002

# Command to run the service
# The PORT can be overridden by docker-compose environment variables
CMD ["node", "dist/index.js"]
