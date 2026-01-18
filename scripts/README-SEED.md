# Sample Data Seeding Script

This script populates the FormFlow database with sample data for testing and development.

## What It Creates

### Organizations (3)
1. **Acme Corporation** (`acme-corp`)
   - Integrations: Webhook, n8n, Slack
   - Max submissions: 10,000/month

2. **TechStart Inc** (`techstart-inc`)
   - Integrations: Make.com, Discord, Webhook
   - Max submissions: 5,000/month

3. **Creative Studios** (`creative-studios`)
   - Integrations: Telegram, n8n, Discord
   - Max submissions: 3,000/month

### Users
- **1 Super Admin**: `admin@formflow.dev` / `admin123`
- **2 Users per Organization**:
  - Admin: `admin@{org-slug}.dev` / `password123`
  - Member: `user@{org-slug}.dev` / `password123`

### Forms
- **5-6 Forms per Organization**:
  - Contact Form
  - Newsletter Signup
  - Support Request
  - Feedback Form
  - Event Registration
  - Job Application (randomly included)

### Integrations
All integrations are configured to send webhooks to the Test Lab server at `http://localhost:5177`

## Prerequisites

1. Database must be running and migrated
2. Environment variables set (`.env` file)
3. Test Lab server should be running to receive webhooks

## Usage

### 1. Start the Database
```bash
docker-compose -f docker-compose.db.yml up -d
```

### 2. Run Migrations (if needed)
```bash
npm run typeorm:migration:run
```

### 3. Start the Test Lab Server
```bash
# Start the webhook-enabled server
npm run test-lab:webhooks
```

### 4. Run the Seed Script
```bash
npm run seed
```

Or directly:
```bash
npx ts-node scripts/seed-sample-data.ts
```

## Environment Variables

The script uses the following environment variables (with defaults):

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=formflow
DB_PASSWORD=formflow
DB_NAME=formflow
```

## Testing Webhooks

### Using the Test Lab UI (Recommended)

The easiest way to test is through the Test Lab web interface:

1. **Open Test Lab**: Visit `http://localhost:5177` in your browser
2. **Login**: Use any seeded credentials (e.g., `admin@acme-corp.dev` / `password123`)
3. **Load Forms**: Click "Refresh Data" to load all forms
4. **Select Form**: Choose a form from the dropdown
5. **Fill Data**: Click "Fill Sample Data" or enter manually
6. **Submit**: Click "Submit" and watch webhooks in the terminal

See the [Test Lab Guide](../docs/TEST_LAB_GUIDE.md) for complete instructions.

### Using curl (Alternative)

You can also submit directly via the API:

```bash
# Submit to a form (replace {submitHash} with actual hash from seed output)
curl -X POST http://localhost:3100/submit/{submitHash} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Test message"
  }'
```

### Using the Test Script

For direct webhook testing:
```bash
./scripts/test-webhook.sh acme
```

The Test Lab server will log all webhook deliveries with colorful formatting in real-time.

## Clean Up

To remove all seeded data:
```bash
# This will truncate all tables
npm run db:reset
```

## Integration Endpoints

The Test Lab server exposes these webhook endpoints:

- `POST /webhook/:org` - Generic webhook
- `POST /n8n/:org` - n8n automation
- `POST /make/:org` - Make.com automation
- `POST /discord/:org` - Discord webhook
- `POST /telegram/:org` - Telegram bot
- `POST /slack/:org` - Slack integration

Each endpoint logs the received data and responds with a success message.
