# FormFlow Dashboard UI

The FormFlow Dashboard UI is an Angular-based frontend application for managing forms, submissions, integrations, and organizations.

## Features

- Form management and configuration
- Submission viewing and filtering
- Integration setup (Email, Telegram, Webhooks, n8n, Make.com, Discord)
- Organization and user management
- Multi-organization support with role-based access control
- Super admin dashboard for system administration

## Tech Stack

- **Framework**: Angular 17+ with standalone components
- **UI Components**: Spartan UI (Angular port of shadcn/ui)
- **Styling**: Tailwind CSS v4
- **Build Tool**: Angular CLI with Nx
- **Authentication**: JWT-based with session management

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Quick Start

From the root directory:

```bash
# Install dependencies
npm install

# Start the dashboard UI
npm run dashboard-ui
# or: nx serve dashboard-ui

# Navigate to http://localhost:4200
```

### Configuration

Update the API endpoint in [src/app/global-vars.ts](src/app/global-vars.ts):

```typescript
export const globalVars = {
  fetchUrl: 'http://localhost:3000', // Dashboard API URL
  // ... other config
};
```

### Project Structure

```
apps/dashboard-ui/
├── src/
│   ├── app/
│   │   ├── features/           # Feature modules
│   │   │   ├── admin/          # Super admin features
│   │   │   ├── dashboard/      # Organization dashboard
│   │   │   ├── integrations/   # Integration management
│   │   │   ├── settings/       # Settings pages
│   │   │   └── submissions/    # Submission viewing
│   │   ├── shared/             # Shared components and utilities
│   │   │   ├── components/     # Reusable components
│   │   │   ├── layouts/        # Layout components
│   │   │   └── ui/             # Spartan UI primitives
│   │   ├── services/           # Angular services
│   │   ├── guards/             # Route guards
│   │   └── global-vars.ts      # Global configuration
│   ├── assets/                 # Static assets
│   └── styles.css              # Global styles
└── project.json                # Nx project configuration
```

## Building for Production

```bash
# Build with Angular CLI
nx build dashboard-ui

# Build artifacts will be in dist/apps/dashboard-ui/
```

## Spartan UI Components

This project uses [Spartan UI](https://spartan.ng), an Angular port of shadcn/ui. Components are located in [src/app/shared/ui/](src/app/shared/ui/).

Available components:
- Button
- Card
- Input
- Badge
- Table
- Separator
- Toggle Switch

See [SPARTAN_IMPLEMENTATION.md](SPARTAN_IMPLEMENTATION.md) for implementation details.

## Testing

```bash
# Run unit tests
npm run test:dashboard-ui
# or: nx test dashboard-ui
```

## Deployment

The dashboard is configured for deployment to Cloudflare Pages. See the main [README](../../README.md) for deployment instructions.

## Further Help

- [Angular CLI Documentation](https://angular.io/cli)
- [Nx Documentation](https://nx.dev)
- [Spartan UI Documentation](https://spartan.ng)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com)
