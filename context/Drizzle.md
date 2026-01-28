# Drizzle ORM Migration Plan

## Goal
Replace TypeORM with Drizzle ORM to improve performance (`tsx` compatibility), type safety, and developer experience.

## User Review Required
> [!WARNING]
> This is a major structural change.
> 1.  **Data Migration:** We need to ensure that the new Drizzle schema maps exactly to the existing database tables to avoid data loss. I will define the schemas to match existing table names (`user`, `organization`, etc.).
> 2.  **Code Refactoring:** A significant amount of service code in `dashboard-api` and `collector-api` currently relies on TypeORM's `Repository` pattern (e.g., `findOne`, `save`). This will need to be rewritten to Drizzle's query builder syntax.

## Proposed Changes

### 1. Dependencies and Setup
*   Install `drizzle-orm` (core library).
*   Install `drizzle-kit` (dev tool for migrations).
*   Install `postgres` (driver) and `@types/pg` (if not already strictly typed).
*   Create `libs/shared/drizzle` library to house the shared schema.

### 2. Schema Conversion (`libs/shared/drizzle`)
We will create a new shared library for the Drizzle schema. The old entities in `libs/shared/entities` will be kept as reference until the switch is complete, then deleted.

*   **Users Table**: Map `User` entity to `pgTable('user', ...)`
*   **Organizations Table**: Map `Organization` entity.
*   **Forms Table**: Map `Form` entity.
*   **Submissions Table**: Map `Submission` entity.
*   **Integrations Table**: Map `Integration` entity.
*   **WhitelistedDomains Table**: Map `WhitelistedDomain`.

*Note: We must handle relationships (OneToMany, ManyToOne) using Drizzle's `relations` helper.*

### 3. Application Refactoring

#### Dashboard API (`apps/dashboard-api`)
*   Replace `DataSource` initialization with Drizzle `NodePgDatabase`.
*   Replace all `Repository` injections with direct Drizzle querying.
    *   `find` -> `db.query.users.findMany(...)`
    *   `findOne` -> `db.query.users.findFirst(...)`
    *   `save` -> `db.insert(...).values(...).returning()` or `db.update(...)`

#### Collector API (`apps/collector-api`)
*   Similar refactor for form submission handling.
*   This is performance-critical, so Drizzle's lightweight nature will be very beneficial here.

### 4. Infrastructure Updates
*   **Dockerfiles**: Once TypeORM is gone, we can safely switch back to `tsx` as the runtime! :rocket:
*   **Migrations**: Use `drizzle-kit` to generate SQL migrations. We will need to check if we can "introspect" the existing DB or if we just manually match the schema to avoid dropping tables.

## Verification Plan

### Automated Verification
*   **Type Checking**: Drizzle provides vastly superior type inference. `tsc` will catch most errors.
*   **Unit Tests**: Run existing tests (updated queries).

### Manual Verification
1.  **Schema Check**: Verify generated SQL matches existing tables.
2.  **API Testing**: Perform standard flows (Login, Create Form, Submit Form) to ensure data is read/written correctly.
