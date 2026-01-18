# Sample Data Seeding - Quick Reference

## Quick Start

```bash
# 1. Start database
npm run db:up

# 2. Start webhook logger (in separate terminal)
npm run test-lab:webhooks

# 3. Seed the database
npm run seed
```

## What You Get

### 3 Organizations
- **Acme Corporation** - Webhook, n8n, Slack integrations
- **TechStart Inc** - Make.com, Discord, Webhook integrations
- **Creative Studios** - Telegram, n8n, Discord integrations

### 7 Users
- Super Admin: `admin@formflow.dev` / `admin123`
- 6 Organization users (2 per org):
  - `admin@{org-slug}.dev` / `password123`
  - `user@{org-slug}.dev` / `password123`

### 16-18 Forms
- 5-6 forms per organization
- Each with unique submitHash for testing
- All configured to use org integrations

## Testing Webhooks

### Recommended: Test Lab UI
1. **Open**: `http://localhost:5177` in browser
2. **Login**: `admin@acme-corp.dev` / `password123`
3. **Load Forms**: Click "Refresh Data"
4. **Select & Submit**: Choose form, fill data, click "Submit"
5. **Watch Webhooks**: See real-time deliveries in terminal

📖 **[Complete Test Lab Guide](../docs/TEST_LAB_GUIDE.md)**

### Alternative: Direct API Submission
```bash
# Get submitHash from seed output, then:
curl -X POST http://localhost:3100/submit/{SUBMIT_HASH} \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com"}'
```

### Alternative: Direct Webhook Test
```bash
./scripts/test-webhook.sh acme
```

### Alternative: Via Dashboard UI
1. Login to `http://localhost:4200`
2. Use any seeded credentials
3. View forms and copy submitHash
4. Use Test Lab or curl to submit

## Webhook Logger Output

The Test Lab server (`npm run test-lab:webhooks`) shows:
```
============================================================
📨 WEBHOOK RECEIVED
============================================================
Time:         2025-01-18T10:30:45.123Z
Type:         N8N
Organization: acme
============================================================
```

## Files Created

- `scripts/seed-sample-data.ts` - Main seeding script
- `scripts/test-webhook.sh` - Webhook testing utility
- `apps/test-lab/server-webhooks.js` - Webhook logger server
- `docs/SAMPLE_DATA.md` - Complete documentation

## NPM Scripts

- `npm run seed` - Run the seeding script
- `npm run test-lab:webhooks` - Start webhook logger
- `npm run db:reset` - Reset database (destructive!)

## See Also

- [Complete Documentation](../docs/SAMPLE_DATA.md)
- [Seed Script README](./README-SEED.md)
