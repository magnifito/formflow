# FormFlow Test Lab

A standalone testing environment for submitting forms and triggering integrations. The test lab provides a simple interface to test FormFlow's submission endpoints and verify your integration configurations.

## Features

- Form submission testing with both legacy and new endpoints
- Session management with automatic API key loading
- CSRF token support
- Multipart and JSON form data support
- Integration trigger testing
- Origin and domain whitelist testing

## Quick Start

```bash
# From the root directory
npm run test-lab

# Or from the test-lab directory
cd apps/test-lab
npm run dev
```

Open [http://localhost:5177](http://localhost:5177) in your browser.

## Usage

### Session Panel

1. Click "Login" to authenticate with the dashboard API
2. Your session will be saved and API keys/forms will auto-load
3. Select a form from the dropdown to populate the submit hash

### Form Submission

#### Using the New Endpoint (`/submit/:submitHash`)

- Always uses JSON format
- Requires a submit hash from your form configuration
- Endpoint: `http://localhost:3001/submit/:submitHash`

#### Using the Legacy Endpoint (`/formflow/:apiKey`)

- Supports both multipart/form-data and JSON
- Uses your organization's API key
- Endpoint: `http://localhost:3001/formflow/:apiKey`

### CSRF Protection

If your server has `CSRF_SECRET` configured:

1. Click "Fetch Token" to get a CSRF token
2. The token will be automatically included in subsequent requests
3. Tokens are valid for the duration of your session

### Domain Whitelisting

The origin is determined by the page URL. If you have whitelisted domains configured:

- Run the lab from an allowed origin, or
- Temporarily disable domain restrictions for testing

## Configuration

The lab connects to these endpoints by default:

- Dashboard API: `http://localhost:3000`
- Collector API: `http://localhost:3001`

Update these in [public/app.js](public/app.js) if your setup differs.

## Project Structure

```
apps/test-lab/
├── public/
│   ├── index.html    # Main UI
│   ├── app.js        # Client-side logic
│   └── styles.css    # Styling
├── server.js         # Simple Express server
└── package.json
```

## Testing Integrations

1. Set up an integration in the FormFlow dashboard
2. Select the corresponding form in the lab
3. Fill in the form fields
4. Submit and verify the integration triggers correctly (email sent, webhook called, etc.)

## Notes

- The test lab is for development and testing only
- No build step required - it uses vanilla HTML/CSS/JS
- Session data is stored in localStorage
- The server is a minimal Express app serving static files

## Troubleshooting

### 401 Unauthorized

- Check that you're logged in via the session panel
- Verify your API key is correct

### 403 Forbidden (CORS)

- Check that your origin matches a whitelisted domain
- Verify CORS is configured correctly on the API server

### CSRF Token Invalid

- Click "Fetch Token" to get a fresh token
- Ensure the token is being sent with your request
