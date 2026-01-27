# Testing Strategy & Guide

This document outlines the testing strategy, commands, and plan for the FormFlow project.

## 🛠 Running Tests

We use **Nx** with pnpm.

### Quick Commands
- Project tests:  
  `pnpm test:dashboard-api` · `pnpm test:collector-api` · `pnpm test:dashboard-ui`
- Single file:  
  `pnpm nx test dashboard-api --testFile=apps/dashboard-api/test/auth.e2e.test.ts`
- Affected only:  
  `pnpm nx affected:test`
- Clear Jest cache:  
  `pnpm jest --clearCache`

## 🏗 Testing Architecture

### 1. Backend API (`dashboard-api`, `collector-api`)

We use **Jest** for both unit and E2E tests.

*   **Unit Tests** (`src/**/*.spec.ts`):
    *   Focus on Controllers, Middlewares, and Services in isolation.
    *   **Mocks**: Extensive use of mocks for Database (`typeorm`), Logging, and Queues (`pg-boss`).
    *   **Goal**: Verify logic without external dependencies.
    *   **Location**: Co-located with source files (e.g., `Controller.ts` -> `Controller.spec.ts`).

*   **E2E Tests** (`test/**/*.e2e.test.ts`):
    *   Focus on complete API flows (HTTP Request -> API -> mocked DB layer).
    *   **Setup**: Uses a test-specific `AppDataSource` connection (often to a dedicated test DB or valid local DB).
    *   **Goal**: Verify API contracts, middleware chains, and database interactions.
    *   **Location**: `test/` directory at the project root.

### 2. Frontend (`dashboard-ui`)

*   **Unit/Component Tests**:
    *   Use **Vitest** (or Jest) + **Testing Library**.
    *   Focus on rendering, user interaction, and hook logic.

## 📅 Testing Implementation Plan

### Phase 1: Clean Slate (Completed)
- [x] Inventory existing tests.
- [x] Delete broken/legacy tests to remove noise.

### Phase 2: Core Unit Tests (In Progress)
- [x] **Dashboard API**: auth middleware, organization/admin controllers
- [x] **Collector API**: submission controller

### Phase 3: E2E Integration Tests (Next Steps)
- [ ] **Dashboard API**: auth flows; org management; admin stats
- [ ] **Collector API**: public form submission

### Phase 4: Frontend Tests
- [ ] **Dashboard UI**:
    - [ ] Critical path components (Login, Form Builder, Dashboard).

## 🚀 5‑Minute End‑to‑End Smoke (Test Lab)

1) Start services (4 terminals)  
```
pnpm db:up                      # Postgres + Mailpit (compose.dev)
pnpm collector-api              # port 3001
pnpm dashboard-api              # port 3000
pnpm --filter test-lab dev      # port 4200 (UI + webhook sink)
```
2) Seed sample data  
```
pnpm seed
```
Creates 3 orgs, 7 users, 16‑18 forms, integrations pointing to Lab webhooks.

3) Open Lab UI at http://localhost:4200  
   Login: `admin@acme-corp.dev / password123` → Refresh Data → select a form → Submit.  
   Webhooks/`/api/webhooks` are handled by the Lab dev server on the same port.

4) Curl a submission (replace HASH from Lab or seed output):  
```
curl -X POST http://localhost:3001/submit/HASH \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Hi"}'
```

## 🌱 Seed Data (what you get)
- Orgs: Acme, TechStart, Creative (with differing integrations)
- Users: 1 super admin (`admin@formflow.fyi` / `password123`), plus org admins/members
- Forms: ~5–6 per org with submit hashes
- Integrations: webhook/n8n/make/discord/slack/telegram pointing to `http://localhost:4200/...`

## 🧪 Coverage
See `context/CODE_COVERAGE.md` for coverage commands and report formats.

## 🛟 Troubleshooting

### Common Issues
1.  **"Password authentication failed"**: Ensure test setup uses your local Postgres creds (5433 when using compose.dev).
2.  **ESM Import Errors**: Mapped via `moduleNameMapper` to `test/mocks/` (e.g., pg-boss/uuid). Clear cache if needed.
