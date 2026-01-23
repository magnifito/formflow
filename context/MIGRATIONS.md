# Database Migrations Guide

This document explains how to work with TypeORM migrations in FormFlow.

## Table of Contents
- [Overview](#overview)
- [Quick Reference](#quick-reference)
- [Development Workflow](#development-workflow)
- [Production Deployment](#production-deployment)
- [Migration Commands](#migration-commands)
- [Synchronize vs Migrations](#synchronize-vs-migrations)
- [Troubleshooting](#troubleshooting)

## Overview

FormFlow uses **TypeORM migrations** to manage database schema changes in a controlled, versioned manner. This ensures:

- **Reproducibility**: Same schema across all environments
- **Version Control**: All schema changes tracked in Git
- **Rollback Capability**: Ability to revert problematic changes
- **Production Safety**: No accidental schema changes

### Current Migration Strategy

- **Development**: `synchronize: true` (optional) for rapid prototyping
- **Production**: `synchronize: false` + migrations (mandatory)
- **Auto-run**: Migrations automatically run on production startup

## Quick Reference

```bash
# Run pending migrations
npm run db:migrate

# Revert last migration
npm run db:migrate:revert

# Show migration status
npm run db:migrate:show

# Generate new migration from entity changes
npm run db:migrate:generate -- -n MigrationName

# Reset database with fresh schema (development only)
npm run db:reset
```

## Development Workflow

### Option 1: Using Synchronize (Rapid Prototyping)

When `NODE_ENV=development`, TypeORM automatically syncs your entities to the database:

```bash
# Start development environment
npm run dev
```

**Pros:**
- Instant schema updates when you change entities
- No migration files needed during rapid development

**Cons:**
- Can't track schema changes in version control
- Can lose data if column types change
- Not suitable for shared development databases

**When to use:** Early development, experimenting with schema

### Option 2: Using Migrations (Recommended)

For collaborative development or preparing for production:

1. **Make changes to entity files** (e.g., add a new column)

2. **Generate migration from changes:**
   ```bash
   npm run db:migrate:generate -- -n AddUserPhone
   ```

3. **Review the generated migration:**
   ```bash
   # Migration created at: apps/dashboard-api/src/migrations/1234567890000-AddUserPhone.ts
   cat apps/dashboard-api/src/migrations/1234567890000-AddUserPhone.ts
   ```

4. **Edit if needed**, then apply:
   ```bash
   npm run db:migrate
   ```

5. **Commit the migration:**
   ```bash
   git add apps/dashboard-api/src/migrations/
   git commit -m "Add phone column to User entity"
   ```

## Production Deployment

### Pre-Deployment

1. **Ensure all migrations are committed:**
   ```bash
   git status apps/dashboard-api/src/migrations/
   ```

2. **Test migrations on staging database:**
   ```bash
   NODE_ENV=production npm run db:migrate
   ```

3. **Verify schema:**
   ```bash
   npm run db:migrate:show
   ```

### Deployment Process

**Automatic (Recommended):**

FormFlow automatically runs pending migrations on startup when `NODE_ENV=production`:

```typescript
// libs/shared/data-source/src/index.ts
migrationsRun: isProduction  // Auto-run migrations
```

Just deploy the new code and migrations will run automatically.

**Manual (Alternative):**

If you prefer manual control:

1. Set `migrationsRun: false` in DataSource config
2. Run migrations before starting the app:
   ```bash
   npm run db:migrate
   npm start
   ```

### Rollback Strategy

If a migration causes issues in production:

```bash
# Revert the last migration
npm run db:migrate:revert

# Restart the application
npm restart
```

**Important:** Only revert migrations on empty databases or in emergencies. Reverting migrations with data may cause data loss.

## Migration Commands

### Run Migrations

```bash
# From root
npm run db:migrate

# From dashboard-api workspace
cd apps/dashboard-api
npm run migration:run
```

Applies all pending migrations in order.

### Revert Migration

```bash
# From root
npm run db:migrate:revert

# From dashboard-api workspace
cd apps/dashboard-api
npm run migration:revert
```

Reverts the most recently applied migration.

### Show Migration Status

```bash
# From root
npm run db:migrate:show

# From dashboard-api workspace
cd apps/dashboard-api
npm run migration:show
```

Shows which migrations have been run and which are pending.

### Generate Migration

```bash
# From root (recommended way)
npm run db:migrate:generate -- -n MigrationName

# From dashboard-api workspace
cd apps/dashboard-api
npm run migration:generate -- -n MigrationName
```

Compares entities to current database schema and generates a migration file.

**Example output:**
```
Migration /path/to/apps/dashboard-api/src/migrations/1737227400123-MigrationName.ts has been generated successfully.
```

## Synchronize vs Migrations

### What is `synchronize`?

TypeORM's `synchronize: true` option automatically updates your database schema to match your entity definitions every time the application starts.

**How it works:**
```typescript
export const AppDataSource = new DataSource({
    synchronize: true,  // Auto-sync entities → schema
    // ...
});
```

### When to Use Each

| Feature | Development | Production |
|---------|-------------|------------|
| `synchronize` | ✅ Optional (rapid prototyping) | ❌ **Never** |
| Migrations | ✅ Recommended (team work) | ✅ **Always** |

### Why Not Synchronize in Production?

1. **Data Loss Risk**: Can drop columns if you rename/remove them
2. **Unpredictable Changes**: No control over when schema changes
3. **No Rollback**: Can't undo automatic changes
4. **No Audit Trail**: No record of what changed and when
5. **Race Conditions**: Multiple instances may conflict

### Current Configuration

```typescript
// libs/shared/data-source/src/index.ts
synchronize: NODE_ENV === 'development',  // Only in dev
migrationsRun: isProduction,              // Auto-run in prod
```

## Troubleshooting

### Migration Already Applied

**Error:** `QueryFailedError: relation "table_name" already exists`

**Cause:** Migration trying to create tables that already exist

**Solution:**
```bash
# Show migration status
npm run db:migrate:show

# If migration shows as pending but tables exist, mark it as run manually
# Connect to database and insert into migrations table:
docker-compose exec postgres psql -U formflow -d formflow -c \
  "INSERT INTO migrations (timestamp, name) VALUES (1737227400000, 'InitialSchema1737227400000');"
```

### Schema Drift

**Issue:** Entities don't match database schema

**Solution:**
```bash
# Generate migration to fix differences
npm run db:migrate:generate -- -n FixSchemaDrift

# Review generated migration
cat apps/dashboard-api/src/migrations/*-FixSchemaDrift.ts

# Apply migration
npm run db:migrate
```

### Can't Generate Migration

**Error:** `No changes in database schema were found`

**Cause:** Entities already match database

**Solution:** This is normal. No migration needed.

### Migration Conflicts

**Issue:** Multiple developers created migrations with same timestamp

**Solution:**
```bash
# Rename migration file to have unique timestamp
mv apps/dashboard-api/src/migrations/1234567890000-Name.ts \
   apps/dashboard-api/src/migrations/1234567890001-Name.ts

# Update class name inside file to match:
# export class Name1234567890001 implements MigrationInterface
```

### Reset Development Database

**Complete reset (destroys all data):**
```bash
# Stop database, delete volumes, restart, run migrations
npm run db:reset
```

This runs:
1. `docker-compose down -v` - Stop and delete database volumes
2. `docker-compose up -d --wait` - Start fresh database
3. `npm run db:migrate` - Run all migrations

### Encrypted Fields Not Working

**Error:** Data stored in encrypted fields is garbled

**Cause:** `ENCRYPTION_KEY` environment variable not set or incorrect

**Solution:**
```bash
# Check if ENCRYPTION_KEY is set
echo $ENCRYPTION_KEY

# Set in .env.development or .env.production
ENCRYPTION_KEY=your_32_character_encryption_key

# Restart application
```

## Best Practices

### 1. Always Review Generated Migrations

TypeORM's auto-generated migrations are good but not perfect:

```bash
npm run db:migrate:generate -- -n AddUserAge
cat apps/dashboard-api/src/migrations/*-AddUserAge.ts
```

Check for:
- Unnecessary index drops/recreations
- Missing default values
- Incorrect column types

### 2. Test Migrations Before Committing

```bash
# Apply migration
npm run db:migrate

# Test application
npm run dev

# If issues, revert and fix
npm run db:migrate:revert
```

### 3. One Logical Change Per Migration

Don't combine unrelated changes:

**Good:**
- `AddUserPhoneColumn` - adds phone column
- `AddEmailIndex` - adds index to email

**Bad:**
- `UpdateUserAndFormAndOrganization` - changes multiple unrelated tables

### 4. Use Descriptive Names

```bash
# Good
npm run db:migrate:generate -- -n AddUserPhoneNumber
npm run db:migrate:generate -- -n CreateInvoicesTable
npm run db:migrate:generate -- -n IndexSubmissionsByDate

# Bad
npm run db:migrate:generate -- -n Update
npm run db:migrate:generate -- -n Fix
npm run db:migrate:generate -- -n Changes
```

### 5. Never Edit Applied Migrations

Once a migration is applied (especially in production), **never edit it**.

Instead:
```bash
# Create a new migration to fix the issue
npm run db:migrate:generate -- -n FixPreviousMigrationIssue
```

## File Structure

```
formflow/
├── apps/
│   └── dashboard-api/
│       └── src/
│           └── migrations/
│               ├── 1737227400000-InitialSchema.ts
│               └── 1737227450000-AddUserPhone.ts
└── libs/
    └── shared/
        ├── data-source/
        │   └── src/
        │       └── index.ts                    # DataSource with migration config
        └── entities/
            └── src/
                ├── User.ts                     # Entity definitions
                ├── Organization.ts
                └── ...
```

## Environment Variables

Required for migrations:

```bash
# Database connection
DB_HOST=postgres
DB_PORT=5432
DB_NAME=formflow
DB_USER=formflow
DB_PASSWORD=formflow_dev_password

# Required for encrypted field transformers
ENCRYPTION_KEY=your_32_character_key_here

# Environment (controls synchronize behavior)
NODE_ENV=development  # or 'production'
```

## Related Documentation

- [Testing Guide](./TESTING.md) - How to test migrations
- [Docker Setup](./DOCKER.md) - Database container configuration
- [Environment Configuration](./ENVIRONMENT_CONFIGURATION.md) - Environment variables

## Support

For migration issues:

1. Check this documentation
2. Review TypeORM migration docs: https://typeorm.io/migrations
3. Check project issues: https://github.com/your-org/formflow/issues
4. Ask the team in #formflow-dev channel
