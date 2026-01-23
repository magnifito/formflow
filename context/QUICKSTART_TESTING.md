# FormFlow - Complete Testing Workflow

**Goal**: Test the entire FormFlow platform including form submissions and webhook integrations in under 5 minutes.

## Prerequisites

- Node.js and npm installed
- Docker Desktop running
- Repository cloned and dependencies installed (`npm install`)

## Step-by-Step Testing Guide

### 1️⃣ Start All Services (4 terminals)

```bash
# Terminal 1: Database
npm run db:up

# Terminal 2: Collector API (Port 3100)
npm run collector-api

# Terminal 3: Dashboard API (Port 3000)
npm run dashboard-api

# Terminal 4: Test Lab with Webhook Logging (Port 5177)
npm run test-lab:webhooks
```

Wait for all services to start (~30 seconds).

### 2️⃣ Seed Sample Data (Terminal 5)

```bash
npm run seed
```

**Output**: You'll see a summary of created data:
- ✅ 3 Organizations (Acme Corp, TechStart Inc, Creative Studios)
- ✅ 7 Users (1 super admin + 6 org users)
- ✅ 16-18 Forms with unique submitHash values
- ✅ All integrations configured

**Save the credentials** shown in the output!

### 3️⃣ Open Test Lab UI

**In your browser**: Visit `http://localhost:5177`

You'll see the FormFlow Lab interface with:
- Login panel
- Form selection
- Comprehensive form fields
- Request preview
- Response viewer

### 4️⃣ Login and Load Forms

1. **Enter credentials** (left panel):
   ```
   Email: admin@acme-corp.dev
   Password: password123
   ```

2. **Click "Login"** - You'll see "Logged in as Acme Corporation Admin"

3. **Click "Refresh Data"** - This loads all forms for Acme Corp

4. **Forms dropdown** will show:
   - Contact Form
   - Newsletter Signup
   - Support Request
   - Feedback Form
   - Event Registration
   - Job Application (possibly)

### 5️⃣ Prepare Submission

1. **Select a form** from the dropdown (e.g., "Contact Form")

2. **Click "Use Selected Form"** - This auto-fills the submit hash

3. **Verify endpoint preview** shows:
   ```
   POST http://localhost:3100/submit/{hash}
   ```

4. **Click "Fill Sample Data"** - Auto-populates all form fields with realistic data

### 6️⃣ Submit the Form

1. **Review the Request Preview** - Shows the exact JSON payload

2. **Click the big "Submit" button**

3. **Watch the Response panel** - You'll see:
   ```json
   {
     "success": true,
     "submissionId": 1,
     "message": "Form submitted successfully",
     "timestamp": "2025-01-18T10:30:45.123Z"
   }
   ```

### 7️⃣ Verify Webhook Deliveries

**Switch to Terminal 4** (Test Lab webhooks). You'll see **THREE** colorful webhook logs:

```
============================================================
📨 WEBHOOK RECEIVED
============================================================
Type:         WEBHOOK
Organization: acme
============================================================

[Full JSON payload displayed]

============================================================
📨 WEBHOOK RECEIVED
============================================================
Type:         N8N
Organization: acme
============================================================

[Full JSON payload displayed]

============================================================
📨 WEBHOOK RECEIVED
============================================================
Type:         SLACK
Organization: acme
============================================================

[Full JSON payload displayed]
```

**Success!** Your form submission triggered all three integrations configured for Acme Corp:
- ✅ Generic Webhook
- ✅ n8n Automation
- ✅ Slack Notification

## Test Other Organizations

### TechStart Inc (Make.com + Discord + Webhook)

```
1. Logout (if logged in)
2. Login: admin@techstart-inc.dev / password123
3. Refresh Data
4. Select form, fill, submit
5. Verify 3 webhooks: make, discord, webhook
```

### Creative Studios (Telegram + n8n + Discord)

```
1. Logout (if logged in)
2. Login: admin@creative-studios.dev / password123
3. Refresh Data
4. Select form, fill, submit
5. Verify 3 webhooks: telegram, n8n, discord
```

## Advanced Testing

### Test Custom Fields

1. Scroll to "Custom Fields" section
2. Click "Add Field"
3. Enter: `department` = `Engineering`
4. Submit - Custom field included in payload

### Test Raw JSON

1. Check "Use raw JSON payload"
2. Enter custom JSON:
   ```json
   {
     "customData": "test",
     "nestedObject": {
       "key": "value"
     }
   }
   ```
3. Submit - Overrides all form fields

### Test Rate Limiting

1. Select a form
2. Click Submit 10 times rapidly
3. Watch for rate limit responses (429)
4. Observe time-based restrictions

### View in Dashboard UI

```bash
# Terminal 6: Dashboard UI (Port 4200)
npm run dashboard-ui
```

1. Visit `http://localhost:4200`
2. Login with same credentials
3. View submissions in the dashboard
4. See real-time submission data

## What You've Tested

✅ **Form Submission Flow**
- API authentication
- Form data validation
- Submission processing
- Response handling

✅ **Webhook Integrations**
- Generic webhook delivery
- n8n automation triggers
- Slack notifications
- Make.com integration
- Discord webhooks
- Telegram bot messages

✅ **Multi-Organization Setup**
- Organization-scoped forms
- Different integration configs
- User authentication per org
- Isolated data access

✅ **Real-Time Logging**
- Webhook delivery tracking
- Payload inspection
- Timestamp verification
- Header analysis

## Common Testing Scenarios

### Scenario 1: Contact Form with All Fields
```
Form: Contact Form
Fill: All identity + preferences + message + address
Result: Complete data in webhooks
```

### Scenario 2: Newsletter Signup (Minimal)
```
Form: Newsletter Signup
Fill: Email + newsletter checkbox
Result: Minimal payload sent to integrations
```

### Scenario 3: Support Request (Priority)
```
Form: Support Request
Fill: Name, email, message, priority="high"
Result: Priority field visible in webhooks
```

### Scenario 4: Event Registration (Dates)
```
Form: Event Registration
Fill: All date/time fields + contact info
Result: Date fields properly formatted
```

## Troubleshooting

### No Webhooks Received
- ✅ Check Terminal 4 is running Test Lab webhooks
- ✅ Verify collector-api is running (Terminal 2)
- ✅ Check submission was successful (200 response)
- ✅ Confirm organization has integrations enabled

### Cannot Login to Test Lab
- ✅ Verify dashboard-api is running (Terminal 3)
- ✅ Check credentials match seeded data
- ✅ Ensure database has seeded data

### Submission Fails (404)
- ✅ Verify collector-api is running on port 3100
- ✅ Check submitHash is correct
- ✅ Ensure Base URL is `http://localhost:3100`

### Forms Not Loading
- ✅ Click "Refresh Data" after login
- ✅ Verify organization has forms in database
- ✅ Check browser console for errors

## Next Steps

### Explore Dashboard UI
```bash
npm run dashboard-ui
# Visit http://localhost:4200
# View submissions, manage forms, configure integrations
```

### Test Different Integration Types
```bash
# Try all 3 organizations
# Each has different integration configurations
# Observe different webhook patterns
```

### Modify Integration Settings
```bash
# Login to Dashboard UI
# Navigate to Integrations
# Add/remove/modify webhook URLs
# Test changes via Test Lab
```

### Create New Forms
```bash
# Dashboard UI → Forms → Create New
# Configure form settings
# Test via Test Lab
```

### Production Testing
```bash
# Update Base URL in Test Lab to staging/production
# Use production credentials
# Test real integrations
```

## Clean Up

```bash
# Stop all services
Ctrl+C in each terminal

# Reset database (deletes all data)
npm run db:reset

# Re-seed if needed
npm run seed
```

## Documentation

- 📖 [Test Lab Complete Guide](docs/TEST_LAB_GUIDE.md) - Detailed UI walkthrough
- 📖 [Sample Data Guide](docs/SAMPLE_DATA.md) - Full seeding documentation
- 📖 [Seed Script README](scripts/README-SEED.md) - Script technical details
- 📖 [Quick Reference](scripts/USAGE.md) - Command cheat sheet

## Success Checklist

After completing this guide, you should have:

- ✅ All services running
- ✅ Database seeded with sample data
- ✅ Submitted forms via Test Lab UI
- ✅ Verified webhook deliveries in terminal
- ✅ Tested multiple organizations
- ✅ Observed different integration types
- ✅ Understood the complete submission flow

**Congratulations!** You've successfully tested the entire FormFlow platform end-to-end. 🎉
