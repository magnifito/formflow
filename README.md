# FormFlow

## The Problem

You built a website. You need forms. Now you're stuck choosing between:

1. **Paying $29-99/month** for a form backend service that holds your data hostage
2. **Building your own backend** and spending 20+ hours on something that should be simple
3. **Using free services** that sell your users' data and plaster their branding everywhere

All three options suck.

## The Solution

FormFlow is a form backend you can deploy in 10 minutes and own forever. No monthly fees. No data mining. No vendor lock-in.

**What it does:**
- Receives form submissions from your website
- Sends them wherever you want (Email, Telegram, Discord, Webhooks, n8n, Make.com)
- Blocks spam with Proof of Work CAPTCHA
- Stores submissions in YOUR database
- Handles auto-reply emails

**What it costs:**
- Self-hosted: $0/month (just server costs you already pay)
- Hosted version: Available at [formflow.fyi](https://formflow.fyi)

## Why This Exists

I got tired of paying $49/month for something that should cost $0. So I built this. Then I open-sourced it because vendor lock-in is a scam.

Use it. Fork it. Sell it. I don't care. Just stop overpaying for form backends.

---

## Setup (< 10 Minutes)

### Quick Start

```bash
# Clone it
git clone https://github.com/FormFlow/FormFlow.git
cd FormFlow

# Install it
npm install

# Start it
npm run db:up
npm run dev
```

Go to `localhost:4200`. You're done.

### What You Get

- **Dashboard UI** (localhost:4200) - Manage forms and integrations
- **Dashboard API** (localhost:3000) - Backend for dashboard
- **Collector API** (localhost:3001) - Public submission endpoint
- **Test Lab** (localhost:5177) - Test your forms

### First Time Setup

Create your admin account:

```bash
# Add to your env file (.env.development or .env)
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=your-password
SUPER_ADMIN_NAME=Your Name

# Create admin
npm run migrate:create-super-admin
```

Login at `localhost:4200/login`. Create a form. Done.

### Test Drive (Complete Demo in 5 Minutes)

Want to see everything working end-to-end with sample data?

```bash
# 1. Start services
npm run db:up
npm run collector-api  # Terminal 1
npm run dashboard-api  # Terminal 2
npm run test-lab:webhooks  # Terminal 3

# 2. Seed sample data (creates 3 orgs, forms, integrations)
npm run seed

# 3. Open Test Lab UI
# Visit http://localhost:5177
# Login: admin@acme-corp.dev / password123
# Click "Refresh Data", select a form, fill, submit
# Watch webhook deliveries in Terminal 3
```

**📖 [Complete Testing Guide](QUICKSTART_TESTING.md)** - Full walkthrough with screenshots

This creates:
- 3 organizations with different integrations
- 16-18 ready-to-test forms
- Webhook logger showing real-time deliveries
- Interactive UI for submitting test data

---

## Use It In Production

### Docker (Recommended)

```bash
# Build everything
npm run docker:build

# Run everything
docker-compose up -d
```

### Railway

Click this: [Deploy to Railway](https://railway.app/template/NR9kSH)

Type in your email credentials. Hit deploy. You're live in 2 minutes.

### Manual Deploy

Do whatever you want. It's Node.js and PostgreSQL. Deploy it anywhere you deploy normal apps.

Environment variables you need:
- Database credentials (`DB_*`)
- Email settings (SMTP)
- JWT secret
- That's it

Full examples are in `.env.development.example` and `.env.production.example`.

---

## Features That Actually Matter

### No Spam

Built-in Proof of Work CAPTCHA. Bots can't solve it. Users don't even notice it. No Google reCAPTCHA garbage tracking your users.

### Send Anywhere

- **Email** - SMTP, obviously
- **Telegram** - Instant notifications
- **Discord** - Team channels
- **Webhooks** - Your custom endpoint
- **n8n** - Workflow automation
- **Make.com** - No-code automation

Configure once. Forget about it.

### Multi-Organization

One installation. Unlimited organizations. Each org has their own forms, users, and data. Completely isolated.

Perfect if you're an agency managing multiple clients.

### Auto-Reply Emails

Customer submits a form. They get an instant "thanks for contacting us" email. Automatic. No setup required.

### Domain Whitelisting

Lock down your forms to only work on your domain. Someone tries to steal your endpoint and use it on their site? Blocked.

### Actually Free

MIT License. Do whatever you want with it. Sell it. Rebrand it. Integrate it into your SaaS. I don't care.

---

## Tech Stack (If You Care)

**Frontend:** Angular 17 + Tailwind CSS v4 + Spartan UI
**Backend:** Node.js + Express + TypeScript
**Database:** PostgreSQL + TypeORM
**Monorepo:** Nx
**Deploy:** Docker, Railway, Cloudflare, Anywhere

It's modern. It's fast. It works.

---

## Project Structure

```
FormFlow/
├── apps/
│   ├── dashboard-ui/     # Angular frontend (manage everything)
│   ├── dashboard-api/    # Backend for dashboard (auth, admin)
│   ├── collector-api/    # Public submission API (the actual form backend)
│   └── test-lab/         # Testing playground
├── libs/
│   └── shared/           # Shared code (entities, utilities)
└── docs/                 # Documentation
```

**For developers:**

- [Dashboard UI README](apps/dashboard-ui/README.md) - Frontend docs
- [Dashboard API README](apps/dashboard-api/README.md) - Admin backend docs
- [Collector API README](apps/collector-api/README.md) - Submission API docs
- [Test Lab README](apps/test-lab/README.md) - Testing environment docs

---

## Common Commands

```bash
# Development
npm run dev              # Run everything
npm run dashboard-ui     # Just frontend
npm run dashboard-api    # Just admin backend
npm run collector-api    # Just submission API
npm run test-lab         # Just test environment

# Database
npm run db:up            # Start PostgreSQL
npm run db:down          # Stop PostgreSQL
npm run db:reset         # Nuke and restart

# Production
npm run build            # Build everything
npm run docker:build     # Build Docker images
npm run docker:up        # Run production stack

# Testing
npm test                 # Run all tests
npm run lint             # Lint everything
```

---

## Documentation

- [Docker Setup](docs/DOCKER.md)
- [Nx Workspace Guide](docs/NX_SETUP.md)
- [Super Admin Setup](docs/SUPER_ADMIN_SETUP.md)
- [Security Best Practices](docs/SECURITY.md)

---

## HTML Form Example

```html
<form action="https://your-api.com/submit/YOUR_FORM_HASH" method="POST">
  <input type="text" name="name" required>
  <input type="email" name="email" required>
  <textarea name="message" required></textarea>
  <button type="submit">Send</button>
</form>
```

That's it. No JavaScript required. Works with any frontend framework.

---

## Contributing

Found a bug? Fix it and submit a PR.

Want a feature? Build it and submit a PR.

I review PRs. Good ones get merged. Bad ones don't.

Standard flow:
1. Fork the repo
2. Create a branch (`git checkout -b your-feature`)
3. Make changes
4. Commit (`git commit -m 'Add feature'`)
5. Push (`git push origin your-feature`)
6. Open a PR

When you contribute, add your name below.

---

## Credits

Built by [Jacob Dement](https://github.com/Oia20).

If this saves you money, [buy me a coffee](https://buymeacoffee.com/jacobdemenl).

Contributors:
- (Your name here when you contribute)

---

## License

MIT. Do whatever you want. Just don't sue me.

---

<div align="center">
  <a href="https://github.com/FormFlow/FormFlow/issues">
    <img alt="Issues" src="https://img.shields.io/github/issues/FormFlow/FormFlow?color=brightgreen"/>
  </a>
  <a href="https://github.com/FormFlow/FormFlow">
    <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/FormFlow/FormFlow?style=social"/>
  </a>
</div>

<p align="center">
  Stop paying for form backends. Use this instead.
</p>
