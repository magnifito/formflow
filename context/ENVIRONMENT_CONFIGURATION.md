# Environment Configuration Guide

## Overview

FormFlow uses environment-specific configuration files to manage different deployment scenarios. This guide explains how environment variables are loaded and configured for development, production, and Docker deployments.

## Environment Files

### File Structure

```
formflow/
├── .env.example                  # Basic template (legacy)
├── .env.development.example      # Development template
├── .env.production.example       # Production template
├── .env.development              # Your dev config (git-ignored)
├── .env.production               # Your prod config (git-ignored)
└── .env                          # Fallback config (git-ignored)
```

### File Priority

The environment loader (`libs/shared/env/src/index.ts`) loads files in this order:

1. **Environment-specific file**: `.env.{NODE_ENV}` (e.g., `.env.development`, `.env.production`)
2. **Base file**: `.env` (fallback for any missing variables)

**Example for NODE_ENV=development**:
```
1. Loads .env.development (if exists)
2. Loads .env (for any missing variables)
```

This allows you to have environment-specific overrides while keeping common variables in `.env`.

---

## Quick Start

### Development Setup

1. **Copy the development template**:
   ```bash
   cp .env.development.example .env.development
   ```

2. **Update values** (optional for local dev):
   ```bash
   # Most defaults work out of the box for local development
   # Only change if you need custom ports or database settings
   ```

3. **Start services**:
   ```bash
   npm run dev
   ```

### Production Setup

1. **Copy the production template**:
   ```bash
   cp .env.production.example .env.production
   ```

2. **Update all values** (required):
   ```bash
   # Edit .env.production and replace ALL placeholder values:
   # - Database credentials
   # - JWT secret (32+ characters)
   # - Encryption key (32+ characters)
   # - Domain URLs
   # - API keys for integrations
   ```

3. **Deploy**:
   ```bash
   docker-compose up -d
   ```

---

## Environment Variables Reference

### Critical Variables (Required)

| Variable | Development Default | Production | Description |
|----------|---------------------|------------|-------------|
| `NODE_ENV` | development | production | Environment mode |
| `PORT` | 3000 | 3000 | Dashboard API port |
| `DB_HOST` | localhost | your_host | PostgreSQL host |
| `DB_PORT` | 5433 | 5432 | PostgreSQL port |
| `DB_NAME` | formflow | formflow | Database name |
| `DB_USER` | formflow | formflow | Database user |
| `DB_PASSWORD` | formflow_dev_password | **CHANGE ME** | Database password |
| `JWT_SECRET` | dev_jwt_secret | **CHANGE ME** | JWT signing secret (32+ chars) |
| `ENCRYPTION_KEY` | dev_encryption_key | **CHANGE ME** | Data encryption key (32+ chars) |

### Application URLs

| Variable | Development Default | Production | Description |
|----------|---------------------|------------|-------------|
| `REDIRECT_URL` | http://localhost:4200 | https://your-domain.com | Dashboard UI URL |
| `DASHBOARD_API_URL` | http://localhost:3000 | https://api.your-domain.com | Dashboard API URL |
| `EMAIL_USER` | test@localhost | your-email@example.com | Email sender address |

### Security (Optional but Recommended)

| Variable | Development Default | Production | Description |
|----------|---------------------|------------|-------------|
| `CSRF_SECRET` | dev_csrf_secret | **CHANGE ME** | CSRF token secret |
| `CSRF_TTL_MINUTES` | 15 | 15 | CSRF token lifetime |
| `HMAC` | dev_hmac_secret | **CHANGE ME** | CAPTCHA HMAC secret |

### Initial Admin Account

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPER_ADMIN_EMAIL` | admin@example.com | Super admin email |
| `SUPER_ADMIN_PASSWORD` | changeme123456 | Super admin password |
| `SUPER_ADMIN_NAME` | System Administrator | Super admin display name |

**Usage**: Run `npm run migrate:create-super-admin` to create the initial admin account.

### Integrations (Optional)

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret |
| `GMAIL_CLIENT` | Gmail OAuth2 client ID |
| `GMAIL_SECRET` | Gmail OAuth2 client secret |
| `GMAIL_EMAIL` | Gmail email address |
| `GMAIL_REFRESH` | Gmail OAuth2 refresh token |
| `GMAIL_ACCESS` | Gmail OAuth2 access token |
| `STRIPE_TEST_KEY` | Stripe API test key |
| `STRIPE_WHSEC` | Stripe webhook secret |
| `TELEGRAM_API_TOKEN` | Telegram bot API token |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

---

## Docker Configuration

### Development Docker Compose

File: `docker-compose.dev.yml`

**Environment handling**:
- Hardcoded development values in the compose file
- No `.env` file needed for basic development
- Hot reload enabled with volume mounts

**Start**:
```bash
docker-compose -f docker-compose.dev.yml up
```

**Configuration**:
```yaml
environment:
  NODE_ENV: development
  DB_HOST: postgres
  DB_PASSWORD: formflow_dev_password  # Hardcoded dev value
  JWT_SECRET: dev_jwt_secret_not_for_production
  # ... other dev defaults
```

### Production Docker Compose

File: `docker-compose.yml`

**Environment handling**:
- Reads from `.env.production` or `.env` file
- Uses Docker variable substitution (`${VAR:-default}`)
- Required variables fail if not set (`${VAR:?error message}`)

**Start**:
```bash
# Ensure .env.production exists or .env with production values
docker-compose up -d
```

**Configuration**:
```yaml
environment:
  NODE_ENV: production
  DB_PASSWORD: ${DB_PASSWORD:?Database password required}  # Must be set
  JWT_SECRET: ${JWT_SECRET:?JWT secret required}            # Must be set
  ENCRYPTION_KEY: ${ENCRYPTION_KEY:?Encryption key required} # Must be set
  DB_USER: ${DB_USER:-formflow}                             # Default: formflow
  # ... other variables
```

### Docker Variable Substitution Syntax

| Syntax | Meaning | Example |
|--------|---------|---------|
| `${VAR}` | Use environment variable | `${DB_HOST}` |
| `${VAR:-default}` | Use VAR or default if not set | `${DB_USER:-formflow}` |
| `${VAR:?error}` | Use VAR or fail with error | `${DB_PASSWORD:?required}` |

---

## Testing Environment Configuration

Run the automated test script:

```bash
npx ts-node --esm scripts/test-env-config.ts
```

**This tests**:
- ✅ Development environment file (all required variables present)
- ✅ Production environment file (all required variables present)
- ✅ Docker Compose variable substitution (proper defaults and required vars)

**Expected output**:
```
✅ All environment configuration tests passed!

Environment files are properly configured for:
  • Development (.env.development)
  • Production (.env.production)
  • Docker Compose (both dev and prod)
```

---

## Environment Loading Logic

### How It Works

The `@formflow/shared/env` module (`libs/shared/env/src/index.ts`) provides:

1. **`loadEnv()`**: Loads environment files based on `NODE_ENV`
2. **`getEnv(key)`**: Gets environment variable with undefined check

**Load sequence**:
```typescript
// 1. Determine NODE_ENV (defaults to "development")
const nodeEnv = process.env.NODE_ENV || "development";

// 2. Try to load .env.{NODE_ENV}
// Examples: .env.development, .env.production, .env.test

// 3. Try to load .env (fallback)

// 4. Return first found file
```

**Search paths**:
The loader searches up to 5 directory levels from the current working directory:
```
/Users/you/formflow/apps/dashboard-api  (current directory)
/Users/you/formflow/apps                (parent)
/Users/you/formflow                     (project root - usually finds here)
/Users/you                              (parent)
/Users                                  (parent)
```

### Usage in Code

```typescript
import { loadEnv, getEnv } from '@formflow/shared/env';

// Load environment variables
loadEnv();

// Get specific variable (returns undefined if not set or empty)
const dbHost = getEnv('DB_HOST');        // string | undefined
const dbPort = getEnv('DB_PORT') || '5432'; // with default
```

---

## Best Practices

### Security

1. **Never commit real secrets**: All `.env`, `.env.development`, `.env.production` files are git-ignored
2. **Use strong secrets in production**:
   - JWT_SECRET: 32+ random characters
   - ENCRYPTION_KEY: 32+ random characters
   - DB_PASSWORD: Strong password
3. **Rotate secrets periodically**: Especially for production
4. **Use different secrets per environment**: Don't reuse development secrets in production

### Secret Generation

Generate strong secrets:

```bash
# Generate 32-byte random secret (64 hex characters)
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Development

1. **Use defaults**: Development defaults work out of the box
2. **Override when needed**: Create `.env.development` only if you need custom values
3. **Document changes**: If you change ports or hosts, document why

### Production

1. **Always set required variables**: Check the production template for all required fields
2. **Use environment-specific URLs**: Update all `*_URL` variables to production domains
3. **Enable security features**: Set `CSRF_SECRET` and other security variables
4. **Test before deploying**: Run `npm run test` with production env settings

### Docker

1. **Use `.env` for Docker Compose**: Docker Compose reads `.env` by default
2. **Set required variables**: Variables marked with `:?` must be set or Docker will fail to start
3. **Check defaults**: Variables with `:-` have safe defaults but can be overridden
4. **Use secrets management**: For production, consider Docker secrets or external secret managers

---

## Troubleshooting

### Issue: "Database connection failed"

**Check**:
1. DB_HOST is correct (localhost for local, postgres for Docker)
2. DB_PORT matches PostgreSQL port (5433 for local dev, 5432 for Docker)
3. DB_PASSWORD matches PostgreSQL password
4. Database is running: `docker ps` or `npm run db:up`

### Issue: "JWT token invalid"

**Check**:
1. JWT_SECRET is set and matches between services
2. Token hasn't expired
3. Same JWT_SECRET used in both dashboard-api and collector-api

### Issue: "Encryption key error"

**Check**:
1. ENCRYPTION_KEY is set
2. ENCRYPTION_KEY is at least 32 characters
3. Same key used across all services

### Issue: "Docker Compose fails to start"

**Check**:
1. Required variables are set in `.env`:
   ```bash
   cat .env | grep -E "DB_PASSWORD|JWT_SECRET|ENCRYPTION_KEY"
   ```
2. No syntax errors in `.env` file
3. Docker Compose version is up to date: `docker-compose --version`

### Issue: "Wrong environment variables loaded"

**Check**:
1. NODE_ENV is set correctly:
   ```bash
   echo $NODE_ENV
   ```
2. Correct `.env.{NODE_ENV}` file exists
3. Clear any cached environment variables:
   ```bash
   unset $(env | grep -E '^(DB_|JWT_|ENCRYPTION)' | cut -d= -f1)
   ```

---

## Migration from Old .env Format

If you're upgrading from the old single `.env` file approach:

1. **Keep `.env` as fallback**:
   ```bash
   # Your existing .env file will work as fallback
   # No immediate action needed
   ```

2. **Gradually migrate** (recommended):
   ```bash
   # Copy .env to environment-specific files
   cp .env .env.development
   cp .env .env.production

   # Update production values in .env.production
   # Keep development values in .env.development
   ```

3. **Update deployment scripts**:
   ```bash
   # Old: NODE_ENV=production npm start
   # New: Same! Environment files are auto-detected
   NODE_ENV=production npm start
   ```

---

## Environment File Templates

### Development (.env.development)

Use defaults from `.env.development.example`:
```bash
NODE_ENV=development
LOG_LEVEL=debug
DB_PORT=5433
# Development secrets (not for production!)
```

### Production (.env.production)

Customize from `.env.production.example`:
```bash
NODE_ENV=production
LOG_LEVEL=info
DB_PORT=5432
# Strong production secrets
JWT_SECRET=<64-char-random-string>
ENCRYPTION_KEY=<64-char-random-string>
```

### Testing (.env.test)

For running tests:
```bash
NODE_ENV=test
DB_NAME=formflow_test
# Test-specific configuration
```

---

## Summary

✅ **Development**: Copy `.env.development.example`, start coding
✅ **Production**: Copy `.env.production.example`, update ALL values, deploy
✅ **Docker**: Uses `.env` file, properly validates required variables
✅ **Testing**: Automated test script validates all configurations

**Key Points**:
- Environment files are auto-loaded based on `NODE_ENV`
- Development works with defaults
- Production requires explicit configuration
- Docker Compose validates required variables
- All secrets are git-ignored

For questions or issues, check the troubleshooting section or file an issue on GitHub.
