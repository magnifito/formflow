# Testing Guide

FormFlow uses Jest and Supertest for comprehensive testing across the entire monorepo.

## Overview

The testing suite provides comprehensive coverage across multiple layers:

### Test Categories

1. **E2E (End-to-End) Tests**: Full API integration tests with database
   - **Collector API**: Form submission endpoints, rate limiting, CAPTCHA, CSRF
   - **Dashboard API**: Authentication, admin operations, organization management

2. **Unit Tests**: Isolated component and function tests
   - **API Middleware**: Authentication, authorization, organization context
   - **Controllers**: Business logic validation
   - **UI Components**: Angular component testing

3. **Configuration Tests**: Environment and setup validation
   - Environment variable loading
   - Database configuration
   - Docker environment setup

### Test Statistics

- **Total Test Files**: 21 project tests
- **Dashboard API Tests**: 9 files (5 E2E + 4 unit)
- **Collector API Tests**: 4 files (2 E2E + 2 unit)
- **Dashboard UI Tests**: 7 Angular component tests
- **Configuration Tests**: 1 file

## Test Structure

```
apps/
├── collector-api/
│   ├── jest.config.ts                          # Jest configuration
│   ├── src/
│   │   └── controller/
│   │       └── SubmissionController.spec.ts    # Unit test
│   └── test/
│       ├── setup.ts                            # Test environment setup
│       ├── helpers.ts                          # Test utilities
│       ├── config.test.ts                      # Config validation
│       ├── submission.e2e.test.ts              # E2E tests
│       └── health.e2e.test.ts                  # E2E tests
│
├── dashboard-api/
│   ├── jest.config.ts                          # Jest configuration
│   ├── src/
│   │   ├── controller/
│   │   │   ├── AdminController.spec.ts         # Unit test
│   │   │   └── OrganizationController.spec.ts  # Unit test
│   │   └── middleware/
│   │       ├── auth.spec.ts                    # Unit test
│   │       ├── orgContext.spec.ts              # Unit test
│   │       └── superAdmin.spec.ts              # Unit test
│   └── test/
│       ├── setup.ts                            # Test environment setup
│       ├── helpers.ts                          # Test utilities
│       ├── config.test.ts                      # Config validation
│       ├── auth.e2e.test.ts                    # E2E tests
│       ├── admin.e2e.test.ts                   # E2E tests
│       ├── organization.e2e.test.ts            # E2E tests
│       └── health.e2e.test.ts                  # E2E tests
│
└── dashboard-ui/
    ├── jest.config.ts                          # Jest configuration
    └── src/app/
        ├── app.component.spec.ts               # Component test
        ├── auth.guard.spec.ts                  # Guard test
        ├── login/
        │   └── login.component.spec.ts         # Component test
        ├── dashboard-nav/
        │   └── dashboard-nav.component.spec.ts # Component test
        ├── dashboard-user-info/
        │   └── dashboard-user-info.component.spec.ts
        ├── dashboard-return-modal/
        │   └── dashboard-return-modal.component.spec.ts
        └── dashboard-telegram-widget/
            └── dashboard-telegram-widget.component.spec.ts
```

## Prerequisites

### 1. Test Database

Create a separate test database to avoid conflicts with development data:

```bash
# Create test database
createdb formflow_test

# Or using Docker
docker exec -it formflow-postgres-dev psql -U formflow -c "CREATE DATABASE formflow_test;"
```

### 2. Environment Variables

Test environment variables are configured in `test/setup.ts` files. Default values:

**Collector API:**
```bash
DB_NAME=formflow_test
DB_HOST=localhost
DB_PORT=5433
DB_USER=formflow
DB_PASSWORD=test_password
PORT=3099
ENCRYPTION_KEY=test-encryption-key-32-chars!!
HMAC=test-hmac-secret
CSRF_SECRET=test-csrf-secret
```

**Dashboard API:**
```bash
DB_NAME=formflow_test
DB_HOST=localhost
DB_PORT=5433
DB_USER=formflow
DB_PASSWORD=test_password
PORT=3098
JWT_SECRET=test-jwt-secret-for-testing-only
ENCRYPTION_KEY=test-encryption-key-32-chars!!
TELEGRAM_BOT_TOKEN=test-bot-token
```

## Running Tests

### Run All Tests

```bash
# Run all E2E tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Run Specific API Tests

```bash
# Collector API tests
npm run test:collector-api

# Collector API with watch mode
npm run test:collector-api:watch

# Collector API with coverage
npm run test:collector-api:coverage

# Dashboard API tests
npm run test:dashboard-api

# Dashboard API with watch mode
npm run test:dashboard-api:watch

# Dashboard API with coverage
npm run test:dashboard-api:coverage
```

### Run E2E Tests Only

```bash
npm run test:e2e
```

### Run Specific Test Suite

```bash
# Run single test file
npx jest apps/collector-api/test/submission.e2e.test.ts

# Run tests matching pattern
npx jest --testNamePattern="should accept valid"

# Run only unit tests
npx jest --testPathPattern="spec.ts"

# Run only E2E tests
npx jest --testPathPattern="e2e.test.ts"

# Run only config tests
npx jest --testPathPattern="config.test.ts"
```

### Run Dashboard UI Tests

```bash
# Run all UI tests
npm run test:dashboard-ui

# Run UI tests in watch mode
npm run test:dashboard-ui:watch

# Run UI tests with coverage
npm run test:dashboard-ui:coverage
```

## Test Organization

### Collector API Tests

#### E2E Tests

**submission.e2e.test.ts:**
- ✅ Valid form submissions
- ✅ Form validation
- ✅ Domain whitelisting
- ✅ Rate limiting
- ✅ CSRF protection
- ✅ Field validation
- ✅ Special characters handling

**health.e2e.test.ts:**
- ✅ Health check endpoint
- ✅ Readiness check
- ✅ Database connectivity

#### Unit Tests

**SubmissionController.spec.ts:**
- ✅ Submission controller initialization
- ✅ Form data validation logic
- ✅ CSRF token handling
- ✅ Rate limiting logic
- ✅ Webhook notification handling

#### Configuration Tests

**config.test.ts:**
- ✅ Environment variable loading
- ✅ Database configuration
- ✅ Required variables validation

### Dashboard UI Tests

**app.component.spec.ts:**
- ✅ App component initialization
- ✅ Routing configuration
- ✅ Component rendering

**auth.guard.spec.ts:**
- ✅ Authentication guard logic
- ✅ Route protection
- ✅ Redirect to login

**login.component.spec.ts:**
- ✅ Login form rendering
- ✅ Form validation
- ✅ Authentication flow

**dashboard-nav.component.spec.ts:**
- ✅ Navigation component rendering
- ✅ Menu items display
- ✅ User context display

**dashboard-user-info.component.spec.ts:**
- ✅ User info display
- ✅ Profile data rendering

**dashboard-return-modal.component.spec.ts:**
- ✅ Modal component rendering
- ✅ User interaction handling

**dashboard-telegram-widget.component.spec.ts:**
- ✅ Telegram widget rendering
- ✅ Integration status display

### Dashboard API Tests

#### E2E Tests

**auth.e2e.test.ts:**
- ✅ Login with credentials
- ✅ JWT token validation
- ✅ Current user endpoint
- ✅ Logout

**admin.e2e.test.ts:**
- ✅ System statistics
- ✅ Organization CRUD operations
- ✅ User CRUD operations
- ✅ Super admin promotion/demotion
- ✅ Cross-organization submission access

**organization.e2e.test.ts:**
- ✅ Form CRUD operations
- ✅ Organization context validation
- ✅ Form limits enforcement
- ✅ Submission listing and pagination
- ✅ Integration management

**health.e2e.test.ts:**
- ✅ Health check endpoint
- ✅ Readiness check

#### Unit Tests

**AdminController.spec.ts:**
- ✅ Admin controller initialization
- ✅ Statistics gathering logic
- ✅ Organization management methods
- ✅ User management methods

**OrganizationController.spec.ts:**
- ✅ Organization controller initialization
- ✅ Form management logic
- ✅ Integration handling
- ✅ Submission retrieval

**auth.spec.ts (Middleware):**
- ✅ JWT token parsing
- ✅ Token validation
- ✅ User authentication flow
- ✅ Error handling for invalid tokens

**orgContext.spec.ts (Middleware):**
- ✅ Organization context extraction
- ✅ Header validation
- ✅ User-organization relationship verification
- ✅ Super admin bypass logic

**superAdmin.spec.ts (Middleware):**
- ✅ Super admin role verification
- ✅ Authorization checks
- ✅ Access denial for non-admin users

#### Configuration Tests

**config.test.ts:**
- ✅ Environment variable loading
- ✅ Database configuration
- ✅ Required variables validation

## Test Helpers

### TestDatabase Class

Utility class for database operations in tests:

```typescript
import { TestDatabase } from './helpers';

const testDb = new TestDatabase(AppDataSource);

// Clean all tables
await testDb.cleanup();

// Create test data
const org = await testDb.createTestOrganization();
const user = await testDb.createTestUser({ organizationId: org.id });
const form = await testDb.createTestForm(org.id);
```

### Token Generation

Generate JWT tokens for authenticated requests:

```typescript
import { generateTestToken, generateOrgContextToken } from './helpers';

// Super admin token
const adminToken = generateTestToken(userId, true);

// Regular user token with org context
const userToken = generateOrgContextToken(userId, organizationId);

// Use in requests
await request(app)
  .get('/org/forms')
  .set('Authorization', `Bearer ${userToken}`)
  .set('X-Organization-Context', organizationId.toString());
```

### Form Data Helpers

Create test form data:

```typescript
import { createTestFormData, createTestFormConfig } from './helpers';

// Form submission data
const formData = createTestFormData({
  name: 'John Doe',
  email: 'john@example.com',
});

// Form configuration
const formConfig = createTestFormConfig({
  name: 'Contact Form',
  captchaEnabled: true,
});
```

## Writing New Tests

### Test Template

```typescript
import request from 'supertest';
import { app } from '../src/index';
import { AppDataSource } from '../src/data-source';
import { TestDatabase } from './helpers';

describe('Feature Name E2E Tests', () => {
  let testDb: TestDatabase;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    testDb = new TestDatabase(AppDataSource);
  });

  beforeEach(async () => {
    await testDb.cleanup();
    // Setup test data
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('POST /endpoint', () => {
    it('should do something', async () => {
      const response = await request(app)
        .post('/endpoint')
        .send({ data: 'value' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });
});
```

### Best Practices

1. **Isolate Tests**: Each test should be independent
   ```typescript
   beforeEach(async () => {
     await testDb.cleanup(); // Clean slate for each test
   });
   ```

2. **Use Descriptive Names**: Test names should clearly state what they test
   ```typescript
   it('should reject submission from non-whitelisted domain', async () => {
     // ...
   });
   ```

3. **Test Both Success and Failure**: Cover happy path and error cases
   ```typescript
   it('should create form with valid data', async () => { /* ... */ });
   it('should reject form without name', async () => { /* ... */ });
   ```

4. **Assert Comprehensively**: Check all important response properties
   ```typescript
   expect(response.body).toHaveProperty('id');
   expect(response.body.name).toBe('Expected Name');
   expect(response.status).toBe(201);
   ```

5. **Clean Up**: Always clean up created resources
   ```typescript
   afterAll(async () => {
     if (AppDataSource.isInitialized) {
       await AppDataSource.destroy();
     }
   });
   ```

## Common Patterns

### Testing Authentication

```typescript
const token = generateTestToken(user.id, false);

await request(app)
  .get('/protected-endpoint')
  .set('Authorization', `Bearer ${token}`)
  .expect(200);
```

### Testing Authorization

```typescript
// Test as super admin
const adminToken = generateTestToken(adminUser.id, true);
await request(app)
  .get('/admin/stats')
  .set('Authorization', `Bearer ${adminToken}`)
  .expect(200);

// Test as regular user (should fail)
const userToken = generateTestToken(regularUser.id, false);
await request(app)
  .get('/admin/stats')
  .set('Authorization', `Bearer ${userToken}`)
  .expect(403);
```

### Testing Validation

```typescript
// Valid data
await request(app)
  .post('/endpoint')
  .send({ email: 'valid@example.com' })
  .expect(200);

// Invalid data
await request(app)
  .post('/endpoint')
  .send({ email: 'invalid-email' })
  .expect(400);
```

### Testing Pagination

```typescript
const response = await request(app)
  .get('/endpoint?page=1&limit=10')
  .set('Authorization', `Bearer ${token}`)
  .expect(200);

expect(response.body).toHaveProperty('data');
expect(response.body).toHaveProperty('page', 1);
expect(response.body).toHaveProperty('limit', 10);
expect(response.body).toHaveProperty('total');
expect(response.body.data.length).toBeLessThanOrEqual(10);
```

## Coverage Reports

Generate coverage reports to identify untested code:

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/apps/collector-api/index.html
open coverage/apps/dashboard-api/index.html
```

Coverage reports show:
- Lines covered
- Branches covered
- Functions covered
- Uncovered lines highlighted

## Debugging Tests

### Run Single Test

```bash
npx jest apps/collector-api/test/submission.e2e.test.ts
```

### Run with Verbose Output

```bash
npx jest --verbose
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### View Database During Tests

```bash
# Connect to test database
psql -U formflow -d formflow_test

# View tables
\dt

# View data
SELECT * FROM organization;
SELECT * FROM "user";
SELECT * FROM form;
```

## Continuous Integration

Example GitHub Actions workflow:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: formflow_test
          POSTGRES_USER: formflow
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          directory: ./coverage
```

## Troubleshooting

### Database Connection Errors

**Problem**: `ECONNREFUSED` or `database "formflow_test" does not exist`

**Solution**:
```bash
# Ensure database exists
createdb formflow_test

# Check connection
psql -U formflow -d formflow_test -c "SELECT 1;"
```

### Port Already in Use

**Problem**: `EADDRINUSE: address already in use`

**Solution**:
```bash
# Tests use ports 3098 and 3099
# Kill processes using these ports
lsof -ti:3098 | xargs kill -9
lsof -ti:3099 | xargs kill -9
```

### Timeout Errors

**Problem**: Tests timeout after 5 seconds

**Solution**: Increase timeout in test file
```typescript
jest.setTimeout(30000); // 30 seconds
```

### Async Operations Not Completing

**Problem**: Tests hang or fail intermittently

**Solution**: Ensure all async operations complete
```typescript
afterAll(async () => {
  // Close database connection
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }

  // Allow time for cleanup
  await new Promise(resolve => setTimeout(resolve, 500));
});
```

## Complete Test Inventory

### Collector API (4 files)

| File | Type | Location | Description |
|------|------|----------|-------------|
| submission.e2e.test.ts | E2E | test/ | Form submission flow tests |
| health.e2e.test.ts | E2E | test/ | Health check endpoint tests |
| SubmissionController.spec.ts | Unit | src/controller/ | Submission controller unit tests |
| config.test.ts | Config | test/ | Environment config validation |

### Dashboard API (9 files)

| File | Type | Location | Description |
|------|------|----------|-------------|
| auth.e2e.test.ts | E2E | test/ | Authentication flow tests |
| admin.e2e.test.ts | E2E | test/ | Admin operations tests |
| organization.e2e.test.ts | E2E | test/ | Organization management tests |
| health.e2e.test.ts | E2E | test/ | Health check endpoint tests |
| AdminController.spec.ts | Unit | src/controller/ | Admin controller unit tests |
| OrganizationController.spec.ts | Unit | src/controller/ | Org controller unit tests |
| auth.spec.ts | Unit | src/middleware/ | Auth middleware unit tests |
| orgContext.spec.ts | Unit | src/middleware/ | Org context middleware tests |
| superAdmin.spec.ts | Unit | src/middleware/ | Super admin middleware tests |
| config.test.ts | Config | test/ | Environment config validation |

### Dashboard UI (7 files)

| File | Type | Location | Description |
|------|------|----------|-------------|
| app.component.spec.ts | Unit | src/app/ | App component tests |
| auth.guard.spec.ts | Unit | src/app/ | Auth guard tests |
| login.component.spec.ts | Unit | src/app/login/ | Login component tests |
| dashboard-nav.component.spec.ts | Unit | src/app/dashboard-nav/ | Navigation component tests |
| dashboard-user-info.component.spec.ts | Unit | src/app/dashboard-user-info/ | User info component tests |
| dashboard-return-modal.component.spec.ts | Unit | src/app/dashboard-return-modal/ | Modal component tests |
| dashboard-telegram-widget.component.spec.ts | Unit | src/app/dashboard-telegram-widget/ | Telegram widget tests |

### Environment Tests (1 file)

| File | Type | Location | Description |
|------|------|----------|-------------|
| test-env-config.ts | Config | scripts/ | Environment configuration validation script |

**Total: 21 test files**
- E2E Tests: 7 files
- Unit Tests: 12 files
- Configuration Tests: 2 files

## Test Coverage Goals

### Current Coverage Status

Run `npm run test:coverage` to generate coverage reports for all projects.

### Coverage Targets

- **E2E Tests**: Cover all major API endpoints and user flows
- **Unit Tests**: Cover business logic in controllers and middleware
- **Component Tests**: Cover UI component rendering and interactions
- **Configuration Tests**: Validate environment setup for all deployment modes

### Viewing Coverage Reports

```bash
# Generate coverage for all projects
npm run test:coverage

# View HTML reports
open coverage/apps/collector-api/index.html
open coverage/apps/dashboard-api/index.html
open coverage/apps/dashboard-ui/index.html

# CI coverage (text format)
npm run test:coverage:ci
```

## Manual Testing with Test Lab

In addition to automated tests, FormFlow includes a Test Lab for manual testing:

```bash
# Start Test Lab
npm run test-lab

# Test Lab with webhook monitoring
npm run test-lab:webhooks
```

The Test Lab provides:
- Interactive form submission testing
- Webhook payload inspection
- CSRF and CAPTCHA flow testing
- Real-time debugging of form submissions

See [docs/TEST_LAB_GUIDE.md](TEST_LAB_GUIDE.md) for complete Test Lab documentation.

## Further Reading

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [TypeORM Testing Guide](https://typeorm.io/testing)
- [Testing Best Practices](https://testingjavascript.com/)
- [Angular Testing Guide](https://angular.dev/guide/testing)
