# Code Coverage Guide

This guide explains how to run code coverage tests in the FormFlow monorepo.

## Overview

All test configurations are written in **TypeScript** (`jest.config.ts` files), and coverage reports are generated in multiple formats:
- **Text**: Console output
- **LCOV**: For CI/CD integration
- **HTML**: Interactive reports in `coverage/` directory

## Running Coverage Tests

### All Projects

Run coverage for all projects:
```bash
npm run test:coverage
```

Run coverage in CI mode (fails if coverage thresholds not met):
```bash
npm run test:coverage:ci
```

### Individual Projects

#### Dashboard UI
```bash
# Coverage with HTML report
npm run test:dashboard-ui:coverage

# CI mode (strict thresholds)
npm run test:dashboard-ui:coverage:ci
```

#### Dashboard API
```bash
# Coverage with HTML report
npm run test:dashboard-api:coverage

# CI mode (strict thresholds)
npm run test:dashboard-api:coverage:ci
```

#### Collector API
```bash
# Coverage with HTML report
npm run test:collector-api:coverage

# CI mode (strict thresholds)
npm run test:collector-api:coverage:ci
```

### Using Nx Directly

You can also use Nx commands directly:

```bash
# All projects with coverage
nx run-many --target=test --all --codeCoverage

# Specific project
nx test dashboard-api --codeCoverage

# With CI configuration (strict thresholds)
nx test dashboard-api --configuration=ci
```

## Coverage Reports

After running coverage tests, reports are generated in:

```
coverage/
├── apps/
│   ├── dashboard-ui/
│   │   ├── index.html          # Open in browser for interactive report
│   │   ├── lcov.info           # For CI/CD tools
│   │   └── ...
│   ├── dashboard-api/
│   │   ├── index.html
│   │   ├── lcov.info
│   │   └── ...
│   └── collector-api/
│       ├── index.html
│       ├── lcov.info
│       └── ...
```

### Viewing HTML Reports

Open the HTML reports in your browser:
```bash
# macOS
open coverage/apps/dashboard-api/index.html

# Linux
xdg-open coverage/apps/dashboard-api/index.html

# Windows
start coverage/apps/dashboard-api/index.html
```

## Coverage Configuration

### What's Included

Coverage is collected from:
- All `.ts` files in `src/` directories
- Excludes test files (`*.spec.ts`, `*.test.ts`)
- Excludes entry points (`index.ts`, `main.ts`)

### Coverage Thresholds

You can configure coverage thresholds in each `jest.config.ts` file:

```typescript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

## CI Integration

The CI pipeline automatically runs coverage tests in CI mode:

```yaml
# .github/workflows/ci.yml
- name: Run tests with coverage
  run: npm run test:coverage:ci
```

## TypeScript Configuration

All test configurations use TypeScript:

- ✅ `apps/dashboard-api/jest.config.ts`
- ✅ `apps/collector-api/jest.config.ts`
- ✅ `apps/dashboard-ui/jest.config.ts`

The root `jest.preset.js` remains JavaScript as it's a Jest configuration file that Jest reads directly.

## Troubleshooting

### Coverage Not Generating

1. Ensure tests are actually running:
   ```bash
   npm run test:dashboard-api
   ```

2. Check that coverage directory is writable:
   ```bash
   ls -la coverage/
   ```

3. Clear cache and retry:
   ```bash
   nx reset
   npm run test:coverage
   ```

### Low Coverage

1. Check which files have low coverage:
   ```bash
   open coverage/apps/dashboard-api/index.html
   ```

2. Add tests for uncovered code paths

3. Adjust thresholds if needed in `jest.config.ts`

## Best Practices

1. **Run coverage before committing**: `npm run test:coverage`
2. **Check HTML reports** to identify untested code
3. **Aim for 80%+ coverage** on critical business logic
4. **Use CI mode** in your CI/CD pipeline to enforce thresholds
5. **Review coverage reports** regularly to maintain quality
