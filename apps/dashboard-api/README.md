# FormFlow Dashboard API

The Dashboard API is the backend service for the FormFlow dashboard. It handles user authentication, organization management, form configuration, and integration setup.

## Features

- User authentication and session management (JWT)
- Organization and multi-tenant support
- Form creation and management
- Integration configuration (Email, Telegram, Webhooks, n8n, Make.com, Discord)
- Super admin functionality
- Whitelisted domain management
- Submission viewing and analytics
- Role-based access control

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with bcrypt password hashing
- **Email**: Nodemailer

## Quick Start

### From Root Directory (Recommended)

```bash
# Install dependencies
npm install

# Start database
npm run db:up

# Run dashboard API
npm run dashboard-api
```

### From Dashboard API Directory

```bash
cd apps/dashboard-api

# Install dependencies
npm install

# Start the server
npm run dev
```

The API will be available at `http://localhost:3000`.

## Environment Configuration

Copy `.env.development.example` to `.env.development` (or `.env.example` to `.env`) and configure:

```bash
# Development/Production Mode
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5433
DB_USER=formflow
DB_PASSWORD=formflow_password
DB_NAME=formflow_dev

# JWT Secret
JWT_SECRET=your-secret-key-here

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Super Admin Setup
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=your-secure-password
SUPER_ADMIN_NAME=System Administrator

# CORS
ALLOWED_ORIGINS=http://localhost:4200,https://yourdomain.com
```

### Database Configuration

The datasource reads `DB_*` from your active env file (`.env.development` or `.env.production`).

## Initial Setup

### 1. Start the Database

```bash
# From root directory
npm run db:up
```

This starts a PostgreSQL instance in Docker on port 5433.

### 2. Create Super Admin Account

```bash
# From root directory
npm run migrate:create-super-admin
```

This creates your first super admin user using the credentials in your env file.

See [docs/SUPER_ADMIN_SETUP.md](../../docs/SUPER_ADMIN_SETUP.md) for detailed setup instructions.

## Project Structure

```
apps/dashboard-api/
├── src/
│   ├── controller/           # Route controllers
│   │   ├── AdminController.ts
│   │   └── OrganizationController.ts
│   ├── middleware/           # Express middleware
│   │   ├── auth.ts           # JWT authentication
│   │   ├── orgContext.ts     # Organization context
│   │   └── superAdmin.ts     # Super admin guard
│   ├── migrations/           # Database migrations
│   ├── data-source.ts        # TypeORM data source
│   └── index.ts              # Express app entry point
├── dockerfile                # Docker configuration
├── package.json
└── tsconfig.json
```

## API Endpoints

### Authentication

- `POST /login` - User login
- `GET /verify-session` - Verify JWT token

### Organizations

- `GET /organizations` - Get user's organizations
- `GET /organizations/:id` - Get organization details
- `GET /organizations/:id/stats` - Get organization statistics
- `GET /organizations/:id/forms` - Get organization forms
- `GET /organizations/:id/submissions` - Get organization submissions
- `GET /organizations/:id/integrations` - Get organization integrations
- `POST /organizations/:id/integrations` - Create integration

### Admin (Super Admin Only)

- `GET /admin/users` - List all users
- `POST /admin/users` - Create new user
- `GET /admin/organizations` - List all organizations
- `POST /admin/organizations` - Create organization
- `GET /admin/submissions` - View all submissions

### Forms

- `GET /forms/:id` - Get form details
- `POST /forms` - Create new form
- `PUT /forms/:id` - Update form
- `DELETE /forms/:id` - Delete form

## Shared Libraries

This API uses shared entities and utilities from the monorepo:

- `@formflow/entities` - TypeORM entities (User, Organization, Form, Submission, etc.)
- `@formflow/data-source` - Database connection configuration
- `@formflow/utils-encryption` - Encryption utilities for sensitive data

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Docker

### Build

```bash
# From root
npm run docker:build:dashboard-api

# Or manually
docker build -t formflow-dashboard-api -f apps/dashboard-api/dockerfile .
```

### Run

```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-secret \
  -e DB_HOST=your-db-host \
  formflow-dashboard-api
```

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Role-based access control (User, Super Admin)
- Organization-scoped data access
- Sensitive integration credentials are encrypted

## Multi-Organization Architecture

The API supports multiple organizations with proper data isolation:

- Each user can belong to multiple organizations
- Data is scoped to the current organization context
- Super admins can access all organizations
- Regular users only see their organization's data

See [docs/SECURITY.md](../../docs/SECURITY.md) for security best practices.

## Development

### Adding a New Endpoint

1. Create/update controller in `src/controller/`
2. Add route in `src/index.ts`
3. Add middleware as needed (auth, orgContext, superAdmin)
4. Test the endpoint

### Database Migrations

```bash
# Generate migration
npm run typeorm migration:generate -- -n MigrationName

# Run migrations
npm run typeorm migration:run

# Revert migration
npm run typeorm migration:revert
```

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `npm run db:up`
- Check environment variables match your setup
- Ensure the database exists: `formflow_dev` or `formflow_prod`

### Authentication Issues

- Verify `JWT_SECRET` is set
- Check token expiration
- Ensure user exists in database

### Port Already in Use

```bash
# Find process on port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

## Further Reading

- [TypeORM Documentation](https://typeorm.io)
- [Express.js Documentation](https://expressjs.com)
- [JWT Documentation](https://jwt.io)
