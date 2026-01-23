# NPM Commands Test Suite

This test suite validates all npm commands defined in `package.json` to ensure they are properly configured and follow expected patterns.

## Running the Tests

```bash
npm run test:npm-commands
```

## What the Tests Validate

### 1. Command Discovery
- Verifies that scripts are defined in package.json
- Lists all available commands

### 2. Command Categories
The suite tests commands across all categories:

- **Setup Commands**: `setup`, `setup:env`, `setup:env:copy`, `postinstall`
- **Development Commands**: `dev`, `dashboard-ui`, `dashboard-api`, `collector-api`, `test-lab`, `test-lab:webhooks`
- **Database Seeding**: `seed`
- **Environment Testing**: `test:env`
- **Build Commands**: `build`, `build:dashboard-ui`, `build:dashboard-api`, `build:collector-api`
- **Test Commands**: All test variants for each project
- **Database Docker Commands**: `db:up`, `db:down`, `db:reset`, `db:destroy`, `db:fix-types`
- **Docker Development**: `docker:dev`, `docker:dev:down`, `docker:dev:logs`
- **Docker Production**: `docker:up`, `docker:down`, `docker:logs`, `docker:ps`
- **Docker Build**: `docker:build`, `docker:build:dashboard-api`, `docker:build:collector-api`
- **Nx Utilities**: `graph`, `affected`, `affected:test`, `affected:build`, `reset`
- **Migrations**: All migration-related commands
- **Cleanup**: `clean`, `clean:all`, `clean:docker`

### 3. Syntax Validation
- Ensures no commands have empty values
- Validates docker-compose command formatting
- Checks command patterns and naming conventions

### 4. Command Execution Validation
- Validates package.json syntax
- Verifies npm can parse all commands

## Test Structure

The test suite is located at `scripts/npm-commands.test.ts` and uses Jest as the testing framework.

## Notes

- These tests **do not actually execute** the commands (which could be destructive or require specific environments)
- They validate that commands are properly defined and follow expected patterns
- Commands that require Docker, databases, or other services are validated for syntax only

## Adding New Commands

When adding new npm commands to `package.json`:

1. Add the command to the appropriate category in `package.json`
2. Run `npm run test:npm-commands` to ensure it's properly validated
3. If needed, add specific validation rules in the test file
