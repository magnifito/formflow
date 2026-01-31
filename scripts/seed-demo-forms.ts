#!/usr/bin/env tsx

/**
 * Seed data for FormFlow Examples
 * Ensures that the forms used in the "Example Gallery" exist in the database
 * with the correct submit hashes, so they work out-of-the-box.
 *
 * Run:
 * pnpm seed:demo-forms
 */

import 'reflect-metadata';
import { loadEnv } from '@formflow/shared/env';
import { createDbClient, organizations, forms } from '@formflow/shared/db';
import { eq, and } from 'drizzle-orm';

loadEnv();

import fs from 'fs';
import path from 'path';

// Safer way to resolve path in mixed CJS/ESM environments when running scripts
const EXAMPLES_PATH = path.join(
  process.cwd(),
  'apps/test-lab/src/data/examples.json',
);

interface ExampleDefinition {
  id: string;
  name: string;
  description: string;
  filename: string;
  useCase: string;
  tags: string[];
  formSubmitHash: string;
}

let DEMO_FORMS: { name: string; slug: string; demoHash: string }[] = [];

try {
  const rawData = fs.readFileSync(EXAMPLES_PATH, 'utf-8');
  const examples: ExampleDefinition[] = JSON.parse(rawData);

  DEMO_FORMS = examples.map((ex) => ({
    name: ex.name,
    slug: ex.id, // Using id as slug
    demoHash: ex.formSubmitHash,
  }));

  console.log(`📖 Loaded ${DEMO_FORMS.length} demo forms from examples.json`);
} catch (error) {
  console.error(`❌ Failed to load examples.json from ${EXAMPLES_PATH}`, error);
  process.exit(1);
}

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

  if (!connectionString || connectionString.includes('undefined')) {
    console.error('DATABASE_URL or DB credentials not found in environment');
    process.exit(1);
  }

  const db = createDbClient(connectionString);

  console.log('🌱 Seeding Demo Forms...');

  // 1) Ensure Organization "Demo Org" exists
  let org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, 'demo-org'),
  });

  if (!org) {
    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: 'FormFlow Demos',
        slug: 'demo-org',
        isActive: true,
      })
      .returning();
    org = newOrg;
    console.log('✅ Created organization: FormFlow Demos');
  } else {
    console.log('ℹ️ Organization exists: FormFlow Demos');
  }

  if (!org) throw new Error('Failed to ensure organization exists');

  // 2) Upsert Forms
  for (const def of DEMO_FORMS) {
    // Check if form exists by hash (most important) or slug
    let form = await db.query.forms.findFirst({
      where: eq(forms.submitHash, def.demoHash),
    });

    if (!form) {
      // Try finding by slug in our demo org
      form = await db.query.forms.findFirst({
        where: and(eq(forms.slug, def.slug), eq(forms.organizationId, org.id)),
      });
    }

    if (!form) {
      await db.insert(forms).values({
        organizationId: org.id,
        name: def.name,
        slug: def.slug,
        submitHash: def.demoHash, // FORCE the demo hash
        isActive: true,
        useOrgIntegrations: false,
        description: 'Auto-generated demo form for gallery examples',
      });
      console.log(`✅ Created form: ${def.name} (${def.demoHash})`);
    } else {
      // Ensure the hash matches what we expect (in case it existed with different hash)
      if (form.submitHash !== def.demoHash) {
        await db
          .update(forms)
          .set({ submitHash: def.demoHash })
          .where(eq(forms.id, form.id));
        console.log(`🔄 Updated hash for form: ${def.name} -> ${def.demoHash}`);
      } else {
        console.log(`ℹ️ Form OK: ${def.name}`);
      }
    }
  }

  console.log('\n✨ access demo forms successfully seeded!');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
