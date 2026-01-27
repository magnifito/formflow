# Nx Setup Guide for FormFlow

## Overview
Nx powers the monorepo for parallel tasks, caching, and a consistent command surface.

## Project Structure (apps)
- `apps/dashboard-ui` – React frontend
- `apps/dashboard-api` – Dashboard/admin API (TypeORM)
- `apps/collector-api` – Public submission API
- `apps/test-lab` – Lab UI + webhook tester
- `libs/*` – shared env, entities, queue, integrations, etc.

## Install
```bash
pnpm install
```

## Common Commands
```bash
pnpm dashboard-ui      # nx run dashboard-ui:serve
pnpm dashboard-api     # nx run dashboard-api:dev
pnpm collector-api     # nx run collector-api:dev
pnpm test-lab          # nx run test-lab:dev
pnpm dev               # db (docker-compose.dev.yml) + run all apps locally

pnpm build             # build all
pnpm test              # test all
pnpm lint              # lint all

pnpm graph             # Nx dependency graph
pnpm affected:test     # only affected projects
pnpm affected:build
```

## Docker shortcuts
- `pnpm dev` – spins up db+mailpit via `docker-compose.dev.yml`, runs apps with Nx.
- `pnpm stage` – runs full stack in containers via `docker-compose.stage.yml`.
- `pnpm docker:up` – production `docker-compose.yml`.

## Ports (dev defaults)
- Dashboard UI: 4200
- Dashboard API: 3000
- Collector API: 3001
- Test Lab: 4200
- Postgres: 5433 exposed (5432 internal)
- Mailpit: 8025 (UI) / 1025 (SMTP)

