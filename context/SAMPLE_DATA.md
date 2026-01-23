# Sample Data & Testing Guide

This guide explains how to use the sample data seeding system and test the webhook integrations.

## Overview

The FormFlow platform includes a comprehensive seeding system that creates:
- 3 Organizations with different configurations
- Multiple users (super admin + org admins/members)
- 5-6 forms per organization
- All major integrations configured
- Test Lab server to receive and log webhooks

## Quick Start

### 1. Start the Database
```bash
npm run db:up
```

### 2. Start the Test Lab Server (Webhook Logger)
```bash
npm run test-lab:webhooks
```

This starts a webhook server at `http://localhost:5177` that:
- Accepts webhook POST requests
- Logs all received data with color formatting
- Responds with success confirmations

### 3. Run the Seed Script
```bash
npm run seed
```

This creates:
- **3 Organizations**: Acme Corp, TechStart Inc, Creative Studios
- **7 Users**: 1 super admin + 2 users per organization
- **16-18 Forms**: 5-6 forms per organization
- **All Integrations**: Configured to send to Test Lab

## What Gets Created

### Organizations

#### 1. Acme Corporation (`acme-corp`)
- **Max Submissions**: 10,000/month
- **Integrations**:
  - Generic Webhook → `http://localhost:5177/webhook/acme`
  - n8n → `http://localhost:5177/n8n/acme`
  - Slack (channel: form-submissions)
- **Forms**: Contact, Newsletter, Support, Feedback, Event Registration, Job Application

#### 2. TechStart Inc (`techstart-inc`)
- **Max Submissions**: 5,000/month
- **Integrations**:
  - Make.com → `http://localhost:5177/make/techstart`
  - Discord → `http://localhost:5177/discord/techstart`
  - Generic Webhook → `http://localhost:5177/webhook/techstart`
- **Forms**: Contact, Newsletter, Support, Feedback, Event Registration

#### 3. Creative Studios (`creative-studios`)
- **Max Submissions**: 3,000/month
- **Integrations**:
  - Telegram (Chat ID: 123456789)
  - n8n → `http://localhost:5177/n8n/creative`
  - Discord → `http://localhost:5177/discord/creative`
- **Forms**: Contact, Newsletter, Support, Feedback, Event Registration

### Users & Credentials

#### Super Admin
```
Email: admin@formflow.fyi
Password: password123
Role: Super Admin (access to all organizations)
```

#### Acme Corporation
```
Admin:  admin@acme-corp.dev / password123
Member: user@acme-corp.dev / password123
```

#### TechStart Inc
```
Admin:  admin@techstart-inc.dev / password123
Member: user@techstart-inc.dev / password123
```

#### Creative Studios
```
Admin:  admin@creative-studios.dev / password123
Member: user@creative-studios.dev / password123
```

## Testing Webhooks

### Manual Testing with curl

The seed script outputs form submit hashes. Use them to test submissions:

```bash
# Get the submitHash from seed output
SUBMIT_HASH="<hash-from-seed-output>"

# Submit a form
curl -X POST http://localhost:3100/submit/$SUBMIT_HASH \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Test submission"
  }'
```

### Using the Test Script

A convenience script is provided to test webhooks directly:

```bash
# Test webhooks for Acme Corp
./scripts/test-webhook.sh acme

# Test webhooks for TechStart Inc
./scripts/test-webhook.sh techstart

# Test webhooks for Creative Studios
./scripts/test-webhook.sh creative
```

This sends test payloads to all webhook endpoints for the specified organization.

### Watching Webhook Logs

The Test Lab server logs all received webhooks with:
- Timestamp
- Webhook type (webhook, n8n, make, discord, telegram, slack)
- Organization name
- Request headers
- Full payload (pretty-printed JSON)

Example output:
```
============================================================
📨 WEBHOOK RECEIVED
============================================================
Time:         2025-01-18T10:30:45.123Z
Type:         N8N
Organization: acme
============================================================
Headers:
  content-type: application/json
  user-agent: FormFlow/1.0

Payload:
{
  "formName": "Contact Form",
  "submissionId": 123,
  "data": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
============================================================
```

## Integration Testing Workflow

### Complete Testing Flow

1. **Start all services**:
   ```bash
   # Terminal 1: Database
   npm run db:up

   # Terminal 2: Test Lab (webhook logger)
   npm run test-lab:webhooks

   # Terminal 3: Collector API
   npm run collector-api

   # Terminal 4: Dashboard API
   npm run dashboard-api

   # Terminal 5: Dashboard UI
   npm run dashboard-ui
   ```

2. **Seed the database**:
   ```bash
   npm run seed
   ```

3. **Login to Dashboard**:
   - Visit: `http://localhost:4200`
   - Login as: `admin@acme-corp.dev` / `password123`
   - View forms and their submit hashes

4. **Submit a form**:
   ```bash
   curl -X POST http://localhost:3100/submit/<HASH> \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","email":"test@example.com"}'
   ```

5. **Watch Test Lab logs**:
   - See webhook deliveries in real-time
   - Verify payload data
   - Confirm all integrations fired

## Webhook Endpoints Reference

The Test Lab server exposes these endpoints:

| Endpoint | Purpose | Organizations Using |
|----------|---------|-------------------|
| `POST /webhook/:org` | Generic webhook | Acme, TechStart |
| `POST /n8n/:org` | n8n automation | Acme, Creative |
| `POST /make/:org` | Make.com automation | TechStart |
| `POST /discord/:org` | Discord notifications | TechStart, Creative |
| `POST /telegram/:org` | Telegram bot | Creative |
| `POST /slack/:org` | Slack notifications | Acme |

Replace `:org` with the organization identifier (e.g., `acme`, `techstart`, `creative`).

## Resetting Data

### Clean Database
```bash
npm run db:reset
```

This:
1. Stops the database
2. Removes all volumes (deletes all data)
3. Starts fresh database
4. You'll need to run migrations and seed again

### Re-seed Without Reset
```bash
# The seed script will fail if data exists
# Either reset the DB first, or manually truncate tables
```

## Environment Configuration

The seed script uses these environment variables:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=formflow
DB_PASSWORD=formflow
DB_NAME=formflow

# APIs
COLLECTOR_API_PORT=3100
DASHBOARD_API_PORT=3000
DASHBOARD_UI_PORT=4200
TEST_LAB_PORT=5177

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-32-character-encryption-key
```

## Troubleshooting

### Seed Script Fails
- Ensure database is running: `npm run db:up`
- Check database credentials in `.env`
- Verify migrations have run
- Check for port conflicts

### Webhooks Not Received
- Verify Test Lab is running: `npm run test-lab:webhooks`
- Check Test Lab is on port 5177
- Ensure collector-api is running
- Verify form submission was successful
- Check organization has integrations enabled

### Cannot Login
- Verify seed script completed successfully
- Check credentials match the documentation above
- Ensure dashboard-api is running
- Check JWT_SECRET is set in `.env`

## Additional Resources

- [Setup Guide](../README.md) - Initial setup instructions
- [Docker Guide](./DOCKER.md) - Docker deployment
- [Security Guide](./SECURITY.md) - Security best practices
- [Super Admin Setup](./SUPER_ADMIN_SETUP.md) - Manual admin creation
