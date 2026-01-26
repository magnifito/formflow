# Integrations stacking plan

## Goals
- Allow forms to inherit organization integrations but override per type when form-level configs exist (email, Telegram, Slack, Discord, webhook, future email-api).
- Remove reliance on env vars for user-facing integration credentials; env email values stay only for system notifications.
- Provide a dashboard visualization (ThreeJS) of the org → forms → integrations hierarchy with overrides clearly shown.

## Current state (Implemented)
- `Integration` entity supports `formId` and `scope` (organization vs form).
- `resolveIntegrationStack` helper computes effective integrations (org + overrides), allowing multiple per type at form scope.
- Dashboard API provides `/hierarchy` endpoint returning nested organization → forms → integrations data.
- Dashboard UI includes `IntegrationGraph` (ThreeJS) visualization and scoped CRUD management.
- SubmissionController (Collector API) uses the resolver and enqueues jobs per effective integration.
- Config validation is enforced for SMTP, OAuth, Slack, Discord, Telegram, and Webhooks.

## Decisions / rules of engagement (Verified)
- [x] Extend `Integration` to support `formId` and `scope`.
- [x] Resolver logic: active org + active form overrides.
- [x] Config schemas for SMTP/OAuth, Slack, Discord, Telegram, Webhooks.
- [x] Sensitive fields live in config (encryption achieved for most paths).

## Implementation status
1. **Schema & entities** [DONE]
   - `formId` and `scope` added to `Integration`.
2. **Domain services & API** [DONE]
   - `resolveIntegrationStack` implemented in `libs/shared/integrations`.
   - `SubmissionController` updated to use resolver.
   - `IntegrationController` updated with `/hierarchy` and scoped CRUD.
3. **Email & handler updates** [DONE]
   - Validation enforced in controller.
   - Queue handlers (e.g., `smtpHandler`, `emailApiHandler`) updated.
4. **Dashboard UI** [DONE]
   - `IntegrationGraph` (ThreeJS) implemented.
   - Scoped management (Org vs Form) added to Integrations page.
5. **Validation & migration support** [DONE]
   -  Stacking uses unified `Integration` only.

## Open questions resolved
- **Per-integration priority**: Assume all active form-scoped integrations of a type override the org-scoped ones of that same type.
- **Sensitive config encryption**: Handled in handlers and controller logic (encryption utility used where applicable).
