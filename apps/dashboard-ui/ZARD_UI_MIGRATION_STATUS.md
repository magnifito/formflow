# Zard UI Migration Status

## Completed Steps

1. ✅ Removed `@spartan-ng/ui-core` dependency from root `package.json`
2. ✅ Updated `submissions-page.component.ts` template to use Zard UI syntax:
   - `<ui-button>` → `<button z-button>`
   - `<ui-card>` → `<z-card>`
   - `<ui-input>` → `<input z-input>`
   - `<ui-badge>` → `<span z-badge>`
   - `<ui-table>` → `<table z-table>`
   - Updated props: `variant` → `zType`, `size` → `zSize`
3. ✅ Updated `dashboard-layout.component.ts` template:
   - `<ui-separator>` → `<z-divider>`
4. ✅ Removed old component imports from updated files
5. ✅ Deleted old component files:
   - `button.component.ts`
   - `card.component.ts`
   - `input.component.ts`
   - `badge.component.ts`
   - `table.component.ts`
   - `separator.component.ts`
6. ✅ Updated barrel export (`index.ts`) to only export `cn` utility
7. ✅ Kept `utils.ts` (compatible with Zard UI, uses tailwind-merge v3)

## Required Manual Steps

### 1. Run Zard UI CLI Commands

The Zard UI CLI requires interactive prompts. Please run manually (see `ZARD_UI_SETUP.md`):

```bash
cd apps/dashboard-ui
npx @ngzard/ui init
# When prompted, select theme and confirm paths

npx @ngzard/ui add button
npx @ngzard/ui add card
npx @ngzard/ui add input
npx @ngzard/ui add badge
npx @ngzard/ui add table
npx @ngzard/ui add divider
```

### 2. Update Component Imports

After CLI adds components, update imports in:
- `apps/dashboard-ui/src/app/features/submissions/submissions-page.component.ts`
- `apps/dashboard-ui/src/app/shared/layouts/dashboard-layout.component.ts`

Check where CLI installs components (typically `components/ui/` or similar) and update import paths.

Example:
```typescript
import { ZButtonComponent } from 'components/ui/button';
// or wherever the CLI installs them
```

### 3. Verify Template Syntax

The templates have been updated to use Zard UI syntax, but you may need to adjust based on:
- Exact component selectors Zard UI uses
- Prop names (currently using `zType`, `zSize` - verify in Zard docs)
- Card component structure (may differ from current `<z-card>` assumption)

### 4. Test and Fix Issues

1. Run `nx build dashboard-ui` - will fail until Zard components are added
2. After adding components, check for any import/path errors
3. Verify visual appearance matches expectations
4. Test form inputs with ngModel binding (Zard `z-input` directive may need adjustment)

## Important Notes

- **Build will fail** until Zard UI components are added via CLI
- Template syntax assumes Zard UI API from documentation - may need minor adjustments
- Input component: Zard uses directive (`z-input`), form binding may need verification
- Badge variants: Updated status mapping, but verify Zard UI badge variant names match
- Card structure: Assumed `<z-card>`, `<z-card-header>`, etc. - verify actual structure

## Files Modified

- `package.json` (root) - Removed @spartan-ng/ui-core
- `apps/dashboard-ui/src/app/features/submissions/submissions-page.component.ts` - Updated template and imports
- `apps/dashboard-ui/src/app/shared/layouts/dashboard-layout.component.ts` - Updated template and imports
- `apps/dashboard-ui/src/app/shared/ui/index.ts` - Updated barrel export

## Files Removed

- `apps/dashboard-ui/src/app/shared/ui/button.component.ts`
- `apps/dashboard-ui/src/app/shared/ui/card.component.ts`
- `apps/dashboard-ui/src/app/shared/ui/input.component.ts`
- `apps/dashboard-ui/src/app/shared/ui/badge.component.ts`
- `apps/dashboard-ui/src/app/shared/ui/table.component.ts`
- `apps/dashboard-ui/src/app/shared/ui/separator.component.ts`
