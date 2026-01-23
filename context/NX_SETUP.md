# Nx Setup Guide for FormFlow

## Overview

Nx has been added to the FormFlow monorepo to provide:
- **Faster builds** with intelligent caching
- **Task orchestration** to run tasks in parallel
- **Dependency graph** to understand project relationships
- **Consistent commands** across all projects

## Project Structure

```
FormFlow/
├── apps/
│   ├── dashboard/        # Angular frontend
│   ├── dashboard-api/    # Dashboard and admin API backend
│   ├── form-api/         # Public form submission API backend
│   └── lab/              # Development/testing lab
├── libs/
│   └── shared/           # Shared libraries (entities, data-source, utils)
├── docs/                 # Documentation
├── nx.json               # Nx configuration
├── package.json          # Root package.json
└── tsconfig.base.json    # Base TypeScript config
```

## Installation

```bash
npm install
```

## Available Projects

| Project | Description | Location |
|---------|-------------|----------|
| **dashboard-ui** | Angular frontend application | `apps/dashboard/` |
| **dashboard-api** | Dashboard and admin API backend with TypeORM | `apps/dashboard-api/` |
| **collector-api** | Public form submission API backend | `apps/form-api/` |
| **test-lab** | Testing environment | `apps/lab/` |

## Common Commands

### Development

```bash
# Run Angular dashboard UI
npm run dashboard-ui
# or: nx serve dashboard-ui

# Run dashboard API with hot reload
npm run dashboard-api
# or: nx run dashboard-api:dev

# Run collector API with hot reload
npm run collector-api
# or: nx run collector-api:dev

# Run test lab
npm run test-lab
# or: nx run test-lab:dev

# Run full Docker dev environment
npm run dev
```

### Build

```bash
# Build all projects
npm run build

# Build specific project
npm run build:dashboard-ui
npm run build:dashboard-api
npm run build:collector-api
```

### Testing

```bash
# Test all projects
npm run test

# Test specific project
npm run test:dashboard-ui
npm run test:dashboard-api
npm run test:collector-api
```

### Linting

```bash
# Lint all projects
npm run lint
```

### Docker

```bash
# Build Docker images
npm run docker:build
npm run docker:build:dashboard-api
npm run docker:build:collector-api

# Run Docker containers
npm run docker:up      # Production
npm run dev            # Development with hot reload
```

## Project Configuration

Each project has a `project.json` file:

- `apps/dashboard/project.json` - Angular application targets
- `apps/dashboard-api/project.json` - Dashboard API server targets
- `apps/form-api/project.json` - Collector API server targets
- `apps/lab/project.json` - Test lab targets

## Nx Graph

Visualize the dependency graph:

```bash
npm run graph
# or: nx graph
```

## Affected Commands

Run commands only for projects affected by your changes:

```bash
# Test only affected projects
npm run affected:test

# Build only affected projects
npm run affected:build

# View affected graph
npm run affected
```

## Caching

Nx automatically caches task results:

```bash
# First run - executes the task
nx build dashboard-ui

# Second run (if nothing changed) - uses cache
nx build dashboard-ui
```

Clear cache if needed:

```bash
npm run nx:reset
# or: npm run reset
# or: nx reset
```

## Project Tags

Projects are tagged for organization:

| Tag | Projects |
|-----|----------|
| `type:app` | dashboard-ui, dashboard-api, collector-api |
| `scope:frontend` | dashboard-ui |
| `scope:backend` | dashboard-api, collector-api |
| `scope:tools` | test-lab |

Run commands by tag:

```bash
# Build all backend projects
nx run-many --target=build --projects=tag:scope:backend
```

## Task Execution

Run tasks in parallel:

```bash
# Run up to 3 tasks in parallel
nx run-many --target=build --all --parallel=3
```

## Troubleshooting

### Clear Nx cache

```bash
npm run nx:reset
```

### View project information

```bash
# List all projects
nx show projects

# Show project details
nx show project dashboard-ui
nx show project dashboard-api
nx show project collector-api
nx show project test-lab
```

### Check what's affected

```bash
nx affected:graph
```

## More Information

- [Nx Documentation](https://nx.dev)
- Run `nx graph` to visualize your workspace
- Use the Nx Console extension in VS Code/Cursor for GUI access
