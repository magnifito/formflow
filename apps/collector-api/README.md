# FormFlow Collector API

The Collector API is the public-facing backend service that handles form submissions. It processes incoming form data, validates submissions, triggers integrations, and stores submission records.

## Features

- Public form submission endpoints
- Proof of Work (PoW) CAPTCHA validation
- CSRF token protection (optional)
- Domain whitelist validation
- Multi-format support (JSON, multipart/form-data)
- Integration triggers:
  - Email notifications
  - Telegram messages
  - Webhooks
  - n8n workflows
  - Make.com scenarios
  - Discord webhooks
- Automatic return emails
- Submission storage and tracking

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Email**: Nodemailer
- **Anti-Spam**: Custom Proof of Work (Alcha) CAPTCHA

## Quick Start

### From Root Directory (Recommended)

```bash
# Install dependencies
npm install

# Start database
npm run db:up

# Run form API
npm run collector-api
```

### From Collector API Directory

```bash
cd apps/collector-api

# Install dependencies
npm install

# Start the server
npm run dev
```

The API will be available at `http://localhost:3001`.

## Environment Configuration

Configure in your env file (`.env.development` or `.env`):

```bash
# Development/Production Mode
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5433
DB_USER=formflow
DB_PASSWORD=formflow_password
DB_NAME=formflow_dev

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# CSRF Protection (Optional)
CSRF_SECRET=your-csrf-secret

# CORS
ALLOWED_ORIGINS=http://localhost:4200,https://yourdomain.com
```

## API Endpoints

### Form Submission

#### New Endpoint (Recommended)

```
POST /s/:submitHash
Content-Type: application/json
```

Submit a form using its unique submit hash. Always uses JSON format.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@formflow.fyi",
  "message": "Hello!",
  "_pow": "optional-proof-of-work-solution",
  "_csrf": "optional-csrf-token"
}
```

### CSRF Tokens

```
GET /s/:identifier/csrf
```

Get a CSRF token for protected form submissions. Use either `submitHash` or `slug` as identifier.

### Health Check

```
GET /health
```

Check API status.

## Project Structure

```
apps/collector-api/
├── src/
│   ├── Alcha/                # Proof of Work CAPTCHA
│   │   └── Challenge.js      # PoW challenge validation
│   ├── controller/           # Route controllers
│   │   └── SubmissionController.ts
│   ├── db.ts                 # Drizzle database client
│   └── index.ts              # Express app entry point
├── dockerfile                # Docker configuration
├── package.json
└── tsconfig.json
```

## Form Submission Flow

1. **Request Received**
   - Validate request format (JSON or multipart)
   - Extract form data and metadata

2. **Security Checks**
   - Verify CSRF token (if enabled)
   - Validate Proof of Work challenge (if required)
   - Check origin against whitelisted domains

3. **Form Lookup**
   - Find form by submit hash (for POST) or slug (for GET CSRF)
   - Verify form is active

4. **Create Submission**
   - Store submission in database
   - Link to form and organization

5. **Trigger Integrations**
   - Email notifications
   - Telegram messages
   - Webhooks
   - Third-party integrations (n8n, Make.com, Discord)

6. **Send Return Email** (if configured)
   - Send automatic reply to submitter

7. **Return Response**
   - Success or error message

## Anti-Spam Protection

### Proof of Work (PoW) CAPTCHA

FormFlow uses a custom Proof of Work challenge to prevent spam:

1. Client fetches a challenge from the form
2. Client solves the cryptographic puzzle
3. Solution is submitted with form data
4. Server validates the solution

Implementation is in [src/Alcha/Challenge.js](src/Alcha/Challenge.js).

### CSRF Protection

When `CSRF_SECRET` is configured:

1. Client requests a token from `/s/:submitHash/csrf`
2. Token is included in submission as `_csrf` field
3. Server validates token before processing

### Domain Whitelisting

Forms can restrict submissions to specific domains:

- Configure whitelisted domains in dashboard
- Collector API checks `Origin` header
- Unauthorized domains receive 403 Forbidden

## Integrations

### Email

Configure in dashboard with SMTP credentials. Supports:
- HTML templates
- Attachments
- Custom from/reply-to addresses

### Telegram

Send submissions to Telegram chats:
- Configure bot token and chat ID
- Supports formatted messages
- Instant notifications

### Webhooks

POST submission data to custom URLs:
- JSON payload
- Custom headers
- Retry logic

### n8n

Trigger n8n workflows:
- Webhook integration
- Full submission data
- Workflow automation

### Make.com

Send data to Make scenarios:
- Webhook endpoint
- Scenario automation
- Data transformation

### Discord

Post to Discord channels:
- Webhook integration
- Embed formatting
- Channel notifications

## Shared Libraries

This API uses shared libraries from the monorepo:

- `@formflow/drizzle` - Drizzle ORM schema and database client
- `@formflow/utils-encryption` - Decryption utilities for integration credentials

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Use the [Lab](../lab/README.md) app for integration testing.

## Docker

### Build

```bash
# From root
npm run docker:build:collector-api

# Or manually
docker build -t formflow-collector-api -f apps/collector-api/dockerfile .
```

### Run

```bash
docker run -p 3001:3001 \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  formflow-collector-api
```

## Security Considerations

- All integration credentials are encrypted in database
- CORS configured for allowed origins
- Rate limiting recommended for production
- CSRF protection available
- PoW CAPTCHA prevents automated spam
- Domain whitelisting prevents unauthorized use

## Development

### Adding a New Integration

1. Add integration configuration in dashboard
2. Store encrypted credentials in database
3. Implement integration logic in `SubmissionController.ts`
4. Test with Lab app

### Debugging Submissions

1. Check database for submission records
2. Review integration logs
3. Test with Lab app
4. Verify CORS and domain whitelist

## Troubleshooting

### Submissions Not Received

- Check database connection
- Verify form is active
- Check domain whitelist
- Verify CORS configuration

### Integration Not Triggering

- Check integration credentials (decrypted correctly)
- Verify integration is enabled
- Check network connectivity
- Review error logs

### CSRF Token Errors

- Ensure token is fresh (not expired)
- Verify `CSRF_SECRET` is set
- Check token is sent in request

### PoW Validation Failing

- Ensure client solved challenge correctly
- Check challenge hasn't expired
- Verify challenge difficulty settings

## Performance

- Submissions are processed asynchronously
- Database queries are optimized with Drizzle ORM
- Integration triggers run in parallel
- Consider adding Redis for caching in production

## Further Reading

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Express.js Documentation](https://expressjs.com)
- [Nodemailer Documentation](https://nodemailer.com)
