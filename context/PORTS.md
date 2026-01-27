# Port Allocation Guide

This document defines the port allocation scheme for all FormFlow services.

## Quick Reference

| Service | Port | Environment | Description |
|---------|------|-------------|-------------|
| **Dashboard UI** | 4200 | Development | React frontend application |
| **Dashboard API** | 3000 | Development/Production | Authentication and admin backend |
| **Collector API** | 3001 | Development/Production | Public form submission endpoint |
| **Test Lab** | 4200 | Development | Testing and experimentation environment |
| **PostgreSQL** | 5432 | Docker Internal | Database (internal to Docker network) |
| **PostgreSQL** | 5433 | Development | Database (exposed for local development) |
| **Mailpit SMTP** | 1025 | Development | Email testing SMTP server |
| **Mailpit UI** | 8025 | Development | Email testing web interface |

---

## Port Details

### Frontend Services

#### Dashboard UI - Port 4200
```bash
pnpm dashboard-ui   # nx run dashboard-ui:serve
# Access: http://localhost:4200
```

**Configuration:**
- Development: `http://localhost:4200`
- Production: Typically served via CDN or nginx (no direct port)
- Configured in: `apps/dashboard/project.json`

**When to access:**
- Local development
- Testing UI changes
- Manual integration testing

---

### Backend Services

#### Dashboard API - Port 3000
```bash
pnpm dashboard-api   # nx run dashboard-api:dev
# Access: http://localhost:3000
```

**Endpoints:**
- `/auth/*` - Telegram OAuth authentication
- `/admin/*` - Super admin endpoints
- `/org/*` - Organization management
- `/forms/*` - Form configuration
- `/integrations/*` - Integration management
- `/health` - Health check

**Configuration:**
- Environment: `PORT=3000`
- Configured in: `apps/dashboard-api/src/index.ts`

**When to access:**
- Called by Dashboard UI
- Admin operations
- Organization setup
- Health checks

#### Collector API - Port 3001
```bash
pnpm collector-api   # nx run collector-api:dev
# Access: http://localhost:3001
```

**Endpoints:**
- `/submit/:formId` - New submission endpoint (v2)
- `/health` - Health check

**Configuration:**
- Environment: `PORT=3001`
- Configured in: `apps/collector-api/src/index.ts`

**When to access:**
- Form submissions from client websites
- CAPTCHA challenges
- Public API calls
- Health checks

---

### Development Tools

#### Test Lab - Port 4200
```bash
pnpm test-lab    # nx run test-lab:dev
# Access: http://localhost:4200
```

**Purpose:**
- Manual form submission testing
- Integration testing
- CSRF token workflow testing
- Session management testing

**Configuration:**
- Environment: `PORT=4200`
- Configured in: `apps/test-lab/project.json`

**When to access:**
- Testing form submissions locally
- Debugging submission flow
- Testing CAPTCHA integration
- Manual QA

---

### Database

#### PostgreSQL - Port 5432 (Docker Internal)
```bash
# Internal Docker network port
# Only accessible between Docker containers
```

**Configuration:**
- Used by: `docker-compose.yml`, `docker-compose.stage.yml`
- Connection string: `postgresql://formflow:password@postgres:5432/formflow`
- Environment: `DB_HOST=postgres`, `DB_PORT=5432`

**When to access:**
- Never directly from host machine
- Only from other Docker containers

#### PostgreSQL - Port 5433 (Development)
```bash
# Exposed for local development tools
# Maps to internal port 5432
```

**Configuration:**
- Used by: `docker-compose.dev.yml` (db + mailpit) and `docker-compose.stage.yml`
- Connection: `postgresql://formflow:password@localhost:5433/formflow`
- Exposed to host machine for database tools

**When to access:**
- Database GUI tools (TablePlus, pgAdmin, DBeaver)
- Direct database queries during development
- Database migrations
- Data inspection/debugging

**Why 5433?**
- Avoids conflicts with local PostgreSQL installations (default: 5432)
- Allows running both Docker and local Postgres simultaneously

---

### Email Testing

#### Mailpit SMTP - Port 1025
```bash
# SMTP server for email testing
# Configured in nodemailer transporter
```

**Configuration:**
- Used by: `apps/dashboard-api`, `apps/collector-api`
- SMTP settings: `host: localhost, port: 1025, secure: false`

**When to access:**
- Never directly accessed
- Configured in email transporter settings
- Receives outbound emails from backend services

#### Mailpit UI - Port 8025
```bash
# Web interface for viewing test emails
# Access: http://localhost:8025
```

**Configuration:**
- Part of development environment
- Captures all emails sent during development
- ARM64 compatible (alternative to Mailhog)

**When to access:**
- Viewing test emails during development
- Verifying email content and formatting
- Testing email integrations
- Debugging email delivery

---

## Port Usage by Environment

### Local Development (Native)
```bash
pnpm dev
```

**Active Ports:**
- 4200 - Dashboard UI (React dev server)
- 3000 - Dashboard API (ts-node-dev with hot reload)
- 3001 - Collector API (ts-node-dev with hot reload)
- 4200 - Test Lab (node server)
- 5433 - PostgreSQL (Docker, mapped from 5432)
- 1025 - Mailpit SMTP (Docker)
- 8025 - Mailpit UI (Docker)

### Docker Dev/Stage (full stack containers)
```bash
pnpm stage   # uses docker-compose.stage.yml
```

**Active Ports:**
- 3000 - Dashboard API (Docker container)
- 3001 - Collector API (Docker container)
- 5433 - PostgreSQL (Docker, mapped from 5432)
- 1025 - Mailpit SMTP (Docker)
- 8025 - Mailpit UI (Docker)

**Note:** Dashboard UI runs inside the stage stack; for host-served UI use `pnpm dashboard-ui`.

### Production (Docker)
```bash
pnpm docker:up
```

**Active Ports:**
- 3000 - Dashboard API (public facing)
- 3001 - Collector API (public facing)
- 5432 - PostgreSQL (internal network only, NOT exposed)

**Note:** Dashboard UI is built and served via CDN/nginx.

---

## Port Conflicts

### Common Conflicts

**Port 3000:**
- Often used by: Node.js apps, React dev server, other Express apps
- Solution: Stop conflicting service or change FormFlow port

**Port 4200:**
- React CLI default port
- Usually available unless running multiple React apps
- Solution: Use `ng serve --port 4201` for other apps

**Port 5432:**
- Default PostgreSQL port
- Conflict if local Postgres is running
- Solution: FormFlow uses 5433 for exposed port to avoid conflicts

**Port 5433:**
- Rarely conflicts
- Some PostgreSQL secondary instances
- Solution: Change Docker port mapping in `docker-compose.dev.yml`

### Checking Port Usage

**macOS/Linux:**
```bash
# Check if port is in use
lsof -i :3000

# Find process using port
lsof -i :3000 | grep LISTEN

# Kill process using port
kill -9 $(lsof -t -i:3000)
```

**Windows:**
```powershell
# Check if port is in use
netstat -ano | findstr :3000

# Kill process using port (use PID from netstat)
taskkill /PID <PID> /F
```

### Changing Ports

**Dashboard UI:**
```json
// apps/dashboard/project.json
{
  "targets": {
    "serve": {
      "options": {
        "port": 4201  // Change here
      }
    }
  }
}
```

**Dashboard API:**
```typescript
// apps/dashboard-api/src/index.ts
const PORT = process.env.PORT || 3000;  // Change default or set PORT env var
```

**Collector API:**
```typescript
// apps/collector-api/src/index.ts
const PORT = process.env.PORT || 3001;  // Change default or set PORT env var
```

**Test Lab:**
```json
// apps/test-lab/project.json
{
  "targets": {
    "dev": {
      "options": {
        "env": {
          "PORT": "4200"  // Change here
        }
      }
    }
  }
}
```

**PostgreSQL (Development):**
```yaml
# docker-compose.dev.yml
services:
  postgres:
    ports:
      - "5433:5432"  # Change 5433 to another port
```

---

## Security Considerations

### Development Ports

All development ports (4200, 3000, 3001, 4200, 5433, 8025) should:
- Only bind to `localhost` (not `0.0.0.0`)
- Never be exposed to the internet
- Use firewall rules to restrict access
- Be documented for team awareness

### Production Ports

Only expose necessary ports:
- **3000** - Dashboard API (requires authentication)
- **3001** - Collector API (public, rate limited)
- **NOT 5432** - Database should NEVER be exposed

**Best Practices:**
- Use reverse proxy (nginx/Caddy) for HTTPS
- Configure firewall rules (ufw, iptables)
- Use environment-specific configs
- Monitor access logs

### Health Check Ports

Health checks (`/health`, `/health/ready`) on ports 3000 and 3001:
- Used by Docker health checks
- Used by load balancers
- Should be accessible by monitoring tools
- Don't require authentication
- Don't expose sensitive data

---

## Troubleshooting

### "Port already in use"

```bash
# 1. Find what's using the port
lsof -i :3000

# 2. Options:
#    a) Stop the other service
#    b) Change FormFlow port
#    c) Use Docker instead of native

# 3. If it's a zombie process
kill -9 <PID>
```

### Can't Connect to Database

```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# Check port mapping
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep postgres

# Test connection
psql -h localhost -p 5433 -U formflow -d formflow
```

### Services Won't Start

```bash
# Check all ports
pnpm docker:ps

# View logs
pnpm docker:logs

# Check for port conflicts
lsof -i :3000 -i :3001 -i :4200 -i :4200 -i :5433
```

---

## Additional Resources

- [DOCKER.md](DOCKER.md) - Docker configuration details
- [NX_SETUP.md](NX_SETUP.md) - Nx workspace commands
- [SECURITY.md](SECURITY.md) - Security best practices
- [React CLI Port Configuration](https://React.io/cli/serve)
- [Express.js Port Configuration](https://expressjs.com/en/4x/api.html#app.listen)
