# FormFlow Example Forms

Ready-to-use HTML form templates for static websites. These examples demonstrate how to integrate FormFlow as a form backend for your static site.

## Quick Start

1. Create a form in your FormFlow dashboard
2. Copy the **Submit Hash** from the form settings
3. Download any example HTML file
4. Replace `YOUR_FORM_SUBMIT_HASH` with your actual submit hash
5. Host the file on your static site

## Available Examples

### 1. Contact Form with ALTCHA
**File:** `contact-form-with-captcha.html`

A simple contact form with ALTCHA proof-of-work CAPTCHA for spam protection. Perfect for:
- Company websites
- Personal portfolios
- Landing pages

**Features:**
- Name, email, subject, message fields
- ALTCHA proof-of-work CAPTCHA (privacy-friendly, no tracking)
- CSRF protection
- Responsive design
- Success/error feedback

### 2. Resource Download Form (Lead Generation)
**File:** `resource-download-form.html`

A gated content form for downloadable resources (eBooks, guides, whitepapers). Collects company information before allowing download. Perfect for:
- Marketing lead generation
- Gated content distribution
- Newsletter signups with incentive

**Features:**
- Company and contact information fields
- Job title and company size dropdowns
- Newsletter opt-in checkbox
- Instant download after submission
- Professional two-column layout

### 3. Job Application Form
**File:** `job-application-form.html`

A comprehensive job application form with file upload support. Perfect for:
- Career pages
- Recruitment websites
- HR departments

**Features:**
- Personal and professional information sections
- Resume upload (with drag & drop)
- Cover letter text area
- Work preference and salary expectation fields
- GDPR-compliant consent checkboxes

### 4. Newsletter Signup
**File:** `newsletter-signup.html`

A minimal, high-converting newsletter signup form. Perfect for:
- Blog sidebars
- Landing pages
- Exit-intent popups

**Features:**
- Clean, focused design
- Optional first name field
- Benefits list to boost conversions
- Success confirmation view

### 5. Webinar/Event Registration
**File:** `webinar-registration.html`

A professional event registration form with speaker info and event details. Perfect for:
- Webinar signups
- Conference registration
- Workshop enrollments

**Features:**
- Event details sidebar (date, time, speakers)
- Company and role information
- Timezone selection
- "Add to Calendar" after registration
- Spots remaining counter

### 6. Demo Request
**File:** `demo-request.html`

A B2B demo request form with social proof. Perfect for:
- SaaS products
- Enterprise software
- Sales-led businesses

**Features:**
- Split-screen layout with feature highlights
- Company size and use case fields
- Testimonial section for social proof
- Professional, trust-building design

### 7. Waitlist / Early Access
**File:** `waitlist-signup.html`

A sleek, modern waitlist form for product launches. Perfect for:
- Product launches
- Beta signups
- Coming soon pages

**Features:**
- Animated gradient background
- Minimal friction (email only required)
- Position number after signup
- Social share buttons (Twitter, LinkedIn, copy link)
- Waitlist count display

## Configuration

Each form requires minimal configuration:

```javascript
// ====================
// CONFIGURATION
// ====================
const FORMFLOW_API_URL = 'https://api.formflow.fyi';  // Change if self-hosting
const FORM_SUBMIT_HASH = 'YOUR_FORM_SUBMIT_HASH';     // Replace with your form's submit hash
```

### Self-Hosted FormFlow

If you're self-hosting FormFlow, update the API URL:

```javascript
const FORMFLOW_API_URL = 'https://your-formflow-instance.com';
```

## How It Works

1. **CSRF Protection**: Before submitting, the form fetches a CSRF token from `/s/{submitHash}/csrf`
2. **Form Submission**: Data is posted to `/s/{submitHash}` with the CSRF token
3. **Integrations**: FormFlow processes the submission and triggers configured integrations (email, Slack, webhooks, etc.)

## Customization

### Styling

All examples use inline CSS for easy customization. Key CSS variables you might want to adjust:

- Primary colors (buttons, accents)
- Border radius values
- Font family
- Max-width of the form container

### Fields

Add or remove fields as needed. The form data is sent as JSON, so any field with a `name` attribute will be included:

```html
<input type="text" name="customField" placeholder="Your custom field">
```

### Validation

Examples include basic HTML5 validation. Add custom JavaScript validation as needed:

```javascript
// Example: Custom email domain validation
const email = document.getElementById('email').value;
if (!email.endsWith('@yourcompany.com')) {
    showStatus('Please use your company email', true);
    return;
}
```

## Domain Whitelisting

For security, configure allowed domains in your FormFlow dashboard:

1. Go to Organization Settings > Whitelisted Domains
2. Add your website domain (e.g., `example.com`)
3. Forms will only accept submissions from whitelisted domains

Note: `localhost` is always allowed for development.

## File Uploads

The job application example demonstrates file handling. For production use:

1. Consider uploading files to a separate storage service (S3, Cloudflare R2, etc.)
2. Include the file URL in the form submission
3. Or use the resume URL field for candidates to provide their own links

## ALTCHA Spam Protection

The contact form example uses [ALTCHA](https://altcha.org), a privacy-friendly proof-of-work CAPTCHA:

- **No tracking** - Unlike reCAPTCHA, ALTCHA doesn't track users
- **Privacy-first** - No cookies, no fingerprinting
- **Invisible** - Users just click once, no puzzles to solve
- **Lightweight** - Only ~17KB compressed

The widget automatically fetches a challenge from FormFlow and solves it in the background using Web Workers.

### How it works:
1. Widget loads and fetches a challenge from `/s/{submitHash}/challenge`
2. User's browser solves the proof-of-work challenge in the background
3. Solution is submitted with the form data via `x-altcha-spam-filter` header
4. Server validates the solution before processing the submission

## Support

- Documentation: https://docs.formflow.fyi
- Issues: https://github.com/formflow/formflow/issues
