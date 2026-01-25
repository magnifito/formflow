# Integrations stacking plan

## Goals
- Allow forms to inherit organization integrations but override per type when form-level configs exist (email, Telegram, Slack, Discord, webhook, future email-api).
- Keep legacy FormIntegration data usable by migrating it into the new flexible model.
- Remove reliance on env vars for user-facing integration credentials; env email values stay only for system notifications.
- Provide a dashboard visualization (ThreeJS) of the org → forms → integrations hierarchy with overrides clearly shown.

## Current state
- New `Integration` entity is organization-scoped only; form-level path still uses legacy `FormIntegration` and `useOrgIntegrations` toggles between org vs form (no stacking).
- SubmissionController enqueues integrations from org *or* form, never merged; config normalization is minimal.
- Dashboard UI lists org integrations only; no way to scope to a form, no hierarchy view.
- Email SMTP handler falls back to env OAuth; email-api handler is a stub; other handlers rely on config values but are not validated.

## Decisions / rules of engagement
- Extend `Integration` to support `formId` (scope: `organization` vs `form`), keep `organizationId` required for multi-tenancy.
- Effective integrations per submission: start with active org integrations, replace any org integrations whose `type` is present in active form integrations with the form versions (allow multiple per type at form scope). If `useOrgIntegrations` is false, use only form-scoped entries.
- Config schema expectations:
  - Email SMTP: `recipients[]`, `fromEmail`, `subject?`, `smtp.{host,port,username,password,secure?}` **or** OAuth block `oauth.{clientId,clientSecret,refreshToken,accessToken,user}`.
  - Email API (future-proof): `emailApi.{provider,apiKey,domain?,region?}`, `recipients[]`, `fromEmail`, `subject?`.
  - Slack: `accessToken`, `channelId`, `channelName?`.
  - Discord: `webhookUrl`.
  - Telegram: `chatId`.
  - Webhook: `webhook`, `webhookSource`.
- Sensitive fields live in integration config (encrypted later); env vars no longer backfill user integrations.

## Implementation plan
1) **Schema & entities**
   - Add `formId` (nullable) and `scope` enum or derived field to `Integration`; relation to `Form`; composite unique to prevent duplicate ids; migration to add columns and backfill legacy `FormIntegration` rows into `Integration` (form-scoped). Keep `OrganizationIntegration` for backward compatibility but mark deprecated.
2) **Domain services & API**
   - Create resolver helper to compute effective integrations for a form (org + overrides).
   - Update SubmissionController to use resolver when building queue jobs, honoring `useOrgIntegrations`.
   - Expand IntegrationController (or new routes) to CRUD form-scoped integrations and to return a hierarchy payload for dashboard (org info, forms, org/form integrations, effective set per form).
3) **Email & handler updates**
   - Enforce config validation for SMTP/OAuth/API paths; remove env fallbacks in queue handlers for customer integrations.
   - Flesh out email-api handler stub (basic provider switches or TODO with schema checks) so fields are defined.
4) **Dashboard UI**
   - Extend hooks to fetch integrations hierarchy and to target form vs org scope; allow creating/updating scoped integrations with new config fields (including OAuth fields).
   - Add ThreeJS-based hierarchy view (org node → forms → integrations) highlighting overrides (e.g., color coding or connecting lines).
   - Refresh Integrations page to show scope, inherited vs overridden badges, and testing controls if available.
5) **Validation & migration support**
   - Add migration script execution note; update any seed/sample data to include form-scoped examples.
   - Document config expectations and the no-env rule for user integrations.

## Open questions to watch
- Do we need per-integration priority when multiple form-level entries share a type? (Assume all are used; org ones dropped for that type.)
- Should sensitive config be encrypted now or in a follow-up? (Out of scope unless time permits.)
