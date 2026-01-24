# Test Lab - Complete Testing Guide

The Test Lab is a comprehensive testing interface for the FormFlow platform. It provides a full-featured form submission UI and webhook logging server.

## Overview

The Test Lab consists of two components:

1. **Web UI** (`http://localhost:5177`) - Form submission interface
2. **Webhook Server** (`server-webhooks.js`) - Logs all webhook deliveries

## Quick Start - Complete Flow

### 1. Start All Services

```bash
# Terminal 1: Database
npm run db:up

# Terminal 2: Collector API (handles submissions)
npm run collector-api

# Terminal 3: Dashboard API (manages forms/orgs)
npm run dashboard-api

# Terminal 4: Test Lab with Webhook Logging
npm run test-lab:webhooks
```

### 2. Seed Sample Data

```bash
# Terminal 5: Run seed script
npm run seed
```

This creates:
- 3 organizations with different integrations
- 7 users with login credentials
- 16-18 forms ready to test
- All integrations pointing to Test Lab webhooks

### 3. Open Test Lab UI

Visit `http://localhost:5177` in your browser.

## Using the Test Lab UI

### Step 1: Login to Load Forms

The Test Lab can authenticate with the Dashboard API to load your forms automatically.

1. **Enter Credentials**:
   ```
   Email: admin@acme-corp.dev
   Password: password123
   ```

2. **Click "Login"**

3. **Click "Refresh Data"** - This loads all forms for your organization

4. **Select a Form** from the dropdown - You'll see:
   - Contact Form
   - Newsletter Signup
   - Support Request
   - Feedback Form
   - Event Registration
   - Job Application (if seeded)

5. **Click "Use Selected Form"** - This auto-fills the submit hash

### Step 2: Configure Submission Target

The endpoint preview shows: `POST http://localhost:3100/submit/{hash}`

**Default Settings** (recommended):
- Base URL: `http://localhost:3100`
- Mode: `/submit/:submitHash` (radio selected)
- Format: `JSON` (radio selected)

**Alternative**: You can also test with API key mode or multipart/form-data.

### Step 3: Fill Form Data

The Test Lab provides extensive form fields:

**Quick Fill Options**:
1. **Click "Fill Sample Data"** - Auto-fills all fields with realistic test data
2. **Or manually fill**:
   - Full Name: `John Doe`
   - Email: `john@formflow.fyi`
   - Message: `Testing FormFlow integrations`
   - Company: `Acme Corporation`
   - etc.

**Advanced Fields Available**:
- Identity (name, email, phone, company, job title, website)
- Preferences (contact method, priority, interests, tags, newsletter)
- Metrics (budget, team size, rating, satisfaction)
- Dates (start date, meeting time, meeting datetime)
- Address (full 6-field address)
- UTM tracking parameters
- File uploads (with metadata options)
- Custom fields (add your own)

### Step 4: Submit the Form

1. **Review the Request Preview** - Shows exactly what will be sent:
   ```json
   {
     "fullName": "John Doe",
     "email": "john@formflow.fyi",
     "message": "Testing FormFlow integrations",
     "company": "Acme Corporation",
     ...
   }
   ```

2. **Click "Submit"**

3. **Watch the Response** - Displays:
   - HTTP status code
   - Response headers
   - Response body (submission ID, timestamp, etc.)

### Step 5: Verify Webhook Deliveries

**Switch to the Terminal running Test Lab webhooks**. You'll see:

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
  "formId": 1,
  "formName": "Contact Form",
  "submissionId": 42,
  "organizationId": 1,
  "data": {
    "fullName": "John Doe",
    "email": "john@formflow.fyi",
    "message": "Testing FormFlow integrations",
    ...
  },
  "submittedAt": "2025-01-18T10:30:45.000Z"
}
============================================================
```

**For Acme Corp**, you'll see THREE webhook deliveries:
1. Generic Webhook → `/webhook/acme`
2. n8n Integration → `/n8n/acme`
3. Slack Integration → `/slack/acme`

## Testing Different Organizations

### Acme Corporation
```
Login: admin@acme-corp.dev / password123
Integrations: Webhook, n8n, Slack
Expect: 3 webhook deliveries per submission
```

### TechStart Inc
```
Login: admin@techstart-inc.dev / password123
Integrations: Make.com, Discord, Webhook
Expect: 3 webhook deliveries per submission
```

### Creative Studios
```
Login: admin@creative-studios.dev / password123
Integrations: Telegram, n8n, Discord
Expect: 3 webhook deliveries per submission
```

## Advanced Features

### Raw JSON Override

For testing edge cases:

1. **Check "Use raw JSON payload"**
2. **Enter custom JSON**:
   ```json
   {
     "customField": "custom value",
     "nestedObject": {
       "key": "value"
     },
     "arrayField": [1, 2, 3]
   }
   ```
3. **Submit** - This overrides all form fields

### Custom Fields

Add fields not in the default form:

1. **Click "Add Field"**
2. **Enter field name**: `department`
3. **Enter field value**: `Engineering`
4. **Submit** - Custom fields are included in the payload

### CSRF Testing

If CSRF is enabled:

1. **Click "Fetch Token"** - Gets a CSRF token
2. **Or enable "Auto-fetch before submit"** - Automatic
3. **Submit** - Token is included automatically

### File Uploads

Test file upload handling:

1. **Select a file** using the file input
2. **Configure options**:
   - Include file metadata (name, size, type)
   - Include base64 data (for small files)
3. **Submit** - File info included in JSON payload

**Note**: Actual file uploads require multipart/form-data mode.

### Manual Webhook Testing

Send webhooks directly without form submission:

```bash
# Test n8n webhook for Acme
curl -X POST http://localhost:5177/n8n/acme \
  -H "Content-Type: application/json" \
  -d '{
    "event": "manual_test",
    "data": {"message": "Direct webhook test"}
  }'
```

Or use the provided script:
```bash
./scripts/test-webhook.sh acme
```

## Submission History

The Test Lab tracks all submissions in the session:

- **History List** - Shows all previous submissions
- **Click any history item** - View full request/response
- **Persistent across page refresh** (stored in localStorage)

## Testing Scenarios

### Scenario 1: Basic Contact Form
```
1. Login as admin@acme-corp.dev
2. Select "Contact Form"
3. Fill Sample Data
4. Submit
5. Verify 3 webhooks received (webhook, n8n, slack)
```

### Scenario 2: Newsletter Signup
```
1. Login as admin@techstart-inc.dev
2. Select "Newsletter Signup"
3. Fill: email, interests checkboxes, newsletter checkbox
4. Submit
5. Verify 3 webhooks (make, discord, webhook)
```

### Scenario 3: Support Request with Priority
```
1. Login as admin@creative-studios.dev
2. Select "Support Request"
3. Fill: name, email, message, priority: "high"
4. Submit
5. Verify 3 webhooks (telegram, n8n, discord)
```

### Scenario 4: Complex Data Submission
```
1. Select any form
2. Fill all sections:
   - Identity (6 fields)
   - Preferences (5 fields)
   - Metrics (4 fields)
   - Dates (3 fields)
   - Message
   - Address (6 fields)
   - UTM params
3. Add custom field: "leadSource" = "webinar"
4. Submit
5. Verify all data in webhook payload
```

### Scenario 5: Rate Limiting Test
```
1. Select a form
2. Submit 10 times rapidly
3. Watch for rate limit errors (429)
4. Verify rate limit settings in form config
```

### Scenario 6: Invalid Data Test
```
1. Use Raw JSON Override
2. Enter: {"invalidEmail": "not-an-email"}
3. Submit
4. Verify validation errors
```

## Webhook Endpoint Reference

All webhooks are sent to `http://localhost:5177`:

| Endpoint | Integration Type | Organizations |
|----------|-----------------|---------------|
| `/webhook/:org` | Generic Webhook | Acme, TechStart |
| `/n8n/:org` | n8n Automation | Acme, Creative |
| `/make/:org` | Make.com | TechStart |
| `/discord/:org` | Discord | TechStart, Creative |
| `/telegram/:org` | Telegram | Creative |
| `/slack/:org` | Slack | Acme |

Replace `:org` with `acme`, `techstart`, or `creative`.

## Troubleshooting

### Cannot Login
- Ensure Dashboard API is running: `npm run dashboard-api`
- Verify credentials match seeded data
- Check Base URL is correct (default: `http://localhost:3000`)

### Forms Not Loading
- Click "Refresh Data" after login
- Check organization has forms in database
- Verify Dashboard API is responding

### Submissions Failing
- Ensure Collector API is running: `npm run collector-api`
- Check Base URL points to Collector API (default: `http://localhost:3100`)
- Verify submit hash is correct
- Check console for CORS errors

### Webhooks Not Received
- Ensure Test Lab webhooks server is running: `npm run test-lab:webhooks`
- Check server is on port 5177
- Verify organization has integrations enabled
- Look for errors in Collector API logs

### CSRF Errors
- Click "Fetch Token" before submitting
- Or enable "Auto-fetch before submit"
- Verify CSRF_SECRET is set in environment

## Tips & Best Practices

1. **Use Fill Sample Data** - Quickly populate all fields for testing
2. **Watch Terminal Output** - Real-time webhook delivery logs
3. **Test All Organizations** - Each has different integration setups
4. **Use Request Preview** - Verify payload before submitting
5. **Check History** - Review previous submissions
6. **Test Edge Cases** - Use Raw JSON Override for unusual data
7. **Monitor Rate Limits** - Watch for 429 responses
8. **Verify All Integrations** - Confirm all configured webhooks fire

## Next Steps

- **View Submissions**: Login to Dashboard UI at `http://localhost:4200`
- **Configure Forms**: Modify form settings via Dashboard
- **Add Integrations**: Configure additional webhook endpoints
- **Test Production**: Use Test Lab against staging/production environments

## Related Documentation

- [Sample Data Guide](./SAMPLE_DATA.md) - Complete seeding documentation
- [Seed Script README](../scripts/README-SEED.md) - Script details
- [Docker Guide](./DOCKER.md) - Docker deployment
- [Security Guide](./SECURITY.md) - Security best practices
