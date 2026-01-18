# Docker Configuration

## Overview

FormFlow uses Docker for both development and production deployments. All applications are located in the `apps/` directory.

### Applications

| App | Description | Port | Location |
|-----|-------------|------|----------|
| **dashboard-api** | Dashboard and admin API backend with TypeORM/PostgreSQL | 3000 | `apps/dashboard-api/` |
| **collector-api** | Public form submission API backend | 3001 | `apps/collector-api/` |
| **dashboard-ui** | Angular frontend (built, served via nginx/CDN) | - | `apps/dashboard-ui/` |

---

## Quick Start

### Development

Start the full development environment with hot reload:

```bash
npm run dev
```

This starts:
- PostgreSQL database on port 5432
- Dashboard API on port 3000
- Collector API on port 3001
- Dashboard UI on port 4200
- Test Lab on port 5177
- Mailpit (email testing) on port 8025

### Production

```bash
# Build images
npm run docker:build

# Start production containers
npm run docker:up
```

---

## Docker Compose Files

### docker-compose.yml (Production)

Production configuration with:
- PostgreSQL with persistent volume
- Health checks on all services
- Resource limits
- Restart policies

### docker-compose.dev.yml (Development)

Development configuration with:
- PostgreSQL for local development
- Volume mounts for hot reload
- Mailpit for email testing (ARM64 compatible)
- Debug logging enabled

---

## Building Images

### Using npm scripts (recommended)

```bash
# Build all images
npm run docker:build

# Build specific image
npm run docker:build:dashboard-api
npm run docker:build:collector-api
```

### Using Nx directly

```bash
nx docker:build dashboard-api
nx docker:build collector-api
```

### Using Docker directly

```bash
# Dashboard API
cd apps/dashboard-api
docker build -t formflow-dashboard-api .

# Collector API
cd apps/collector-api
docker build -t formflow-collector-api .
```

---

## Dashboard API

The main authentication and admin API backend:

### Features
- TypeORM/PostgreSQL database
- Telegram OAuth authentication
- Organization management
- Form configuration
- User management
- Integration management

### Dockerfile Features
- Multi-stage build for smaller image
- Non-root user for security
- Health check endpoint at `/health`
- Uses ts-node for TypeScript execution

### Environment Variables

See `.env.development.example` / `.env.production.example` for full list. Key variables:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `REDIRECT_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`

---

## Collector API

Public form submission service:

### Features
- Form submission endpoint
- Proof of Work CAPTCHA (Alcha)
- CSRF protection
- Domain whitelisting
- Integration webhooks (n8n, Zapier, Telegram, Discord, Email)
- Encrypted field support

### Dockerfile Features
- Multi-stage build
- Non-root user
- Health check at `/health`
- Uses ts-node for TypeScript execution

### Environment Variables

```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=formflow
DB_USER=formflow
DB_PASSWORD=your_password

# Security
ENCRYPTION_KEY=your-32-character-encryption-key
CSRF_SECRET=your-csrf-secret
CSRF_TTL_MINUTES=15
HMAC=your-hmac-secret

# Integration
DASHBOARD_API_URL=http://dashboard-api:3000

# Optional
PORT=3001
LOG_LEVEL=info
```

---

## Health Checks

All services expose health endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Basic health status |
| `GET /health/ready` | Readiness check (includes dependencies) |

### Example Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "service": "formflow-server"
}
```

---

## Networking

### Default Ports

| Service | Internal | External (dev) | External (prod) |
|---------|----------|----------------|-----------------|
| PostgreSQL | 5432 | 5433 | - |
| Dashboard API | 3000 | 3000 | 3000 |
| Collector API | 3001 | 3001 | 3001 |
| Dashboard UI | 4200 | 4200 | - |
| Test Lab | 5177 | 5177 | - |
| Mailpit SMTP | 1025 | 1025 | - |
| Mailpit UI | 8025 | 8025 | - |

### Docker Networks

- `formflow-network` (production)
- `formflow-dev-network` (development)

---

## Volumes

### Production

- `postgres_data` - PostgreSQL data persistence

### Development

- `postgres_dev_data` - Development database
- Source code mounts for hot reload

---

## Common Commands

```bash
# View logs
npm run docker:logs          # Production
npm run docker:dev:logs      # Development

# View container status
npm run docker:ps

# Stop containers
npm run docker:down          # Production
npm run docker:dev:down      # Development
npm run dev:stop             # Stop dev environment

# Clean up (removes volumes and images)
npm run clean:docker
```

---

## Troubleshooting

### Container won't start

1. Check logs: `npm run docker:logs`
2. Verify environment: Ensure `.env` file exists
3. Check ports: Ensure ports 3000, 3001, 5432 are available

### Database connection failed

1. Wait for PostgreSQL health check to pass
2. Verify `DB_HOST=postgres` in Docker Compose
3. Check database credentials match

### Port already in use

If you see "port already allocated" errors:
1. Check what's using the port: `lsof -i :3000`
2. Stop conflicting services
3. Or change the port in docker-compose files
