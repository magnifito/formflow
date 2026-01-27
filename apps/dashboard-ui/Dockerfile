# =============================================================================
# FormFlow Dashboard UI Dockerfile
# =============================================================================

# -----------------------------------------------------------------------------
# Build Stage
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY apps/dashboard-ui/package.json ./apps/dashboard-ui/

# Install dependencies
# Note: We need to install dependencies for the entire workspace or specific enough for the app
# Assuming pnpm workspace or simple npm structure. 
# Since root lock file exists, we should probably copy root config.
COPY . .

# Install dependencies
RUN npm install

# Build the application
# We need to run the build command for the specific project
WORKDIR /app
RUN npx nx build dashboard-ui --configuration=production

# -----------------------------------------------------------------------------
# Production Stage
# -----------------------------------------------------------------------------
FROM nginx:alpine

# Copy built assets from builder stage
# Adjust the path based on where nx output defaults to (apps/dashboard-ui/dist or dist/apps/dashboard-ui)
# The vite config showed: outDir: '../../dist/dashboard-ui'
COPY --from=builder /app/dist/dashboard-ui /usr/share/nginx/html

# Copy custom nginx config
COPY apps/dashboard-ui/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
