# Zard UI Setup - Manual Steps Required

The Zard UI CLI requires interactive prompts. Please run the following commands manually:

## 1. Initialize Zard UI

```bash
cd apps/dashboard-ui
npx @ngzard/ui init
```

When prompted:
- **Where is your app.config.ts file?** → `src/app/app.config.ts` (default)
- **Choose a theme** → Select any (e.g., "Neutral (Default)")

## 2. Add Components

After init completes, add the required components:

```bash
npx @ngzard/ui add button
npx @ngzard/ui add card
npx @ngzard/ui add input
npx @ngzard/ui add badge
npx @ngzard/ui add table
npx @ngzard/ui add divider
```

This will copy component files into your project (typically in `components/ui/` or similar).

After running these commands, the code migration can proceed.
