# =============================================================================
# FormFlow Test Lab Dockerfile
# =============================================================================

# -----------------------------------------------------------------------------
# Base stage
# -----------------------------------------------------------------------------
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy source code (entire monorepo context)
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set working directory to the app
WORKDIR /app/apps/test-lab

# Expose port
EXPOSE 4200

# Run the application (default command, can be overridden)
CMD ["npm", "run", "dev", "--", "--host"]
