#!/usr/bin/env ts-node

import "reflect-metadata";
import { DataSource } from 'typeorm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, Organization, Form, OrganizationIntegration, FormIntegration, Submission, WhitelistedDomain, UserRole } from '@formflow/shared/entities';
import { loadEnv } from '@formflow/shared/env';

// Load environment variables
loadEnv();

// Determine environment (defaults to 'development' if not set)
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database configuration (loaded from environment-specific .env file)
const getDatabaseConfig = () => ({
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'formflow',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || 'formflow',
  database: process.env.DB_NAME || process.env.DB_DATABASE || 'formflow',
});

const dbConfig = getDatabaseConfig();

// Initialize database connection with schema synchronization enabled
// This ensures all tables exist before seeding data
const AppDataSource = new DataSource({
  ...dbConfig,
  entities: [
    User,
    Organization,
    Form,
    OrganizationIntegration,
    FormIntegration,
    Submission,
    WhitelistedDomain,
  ],
  synchronize: true, // Create/update schema automatically
  logging: NODE_ENV === 'development', // Enable logging in development
});

const TEST_LAB_URL = 'http://localhost:5177';

async function seedData() {
  console.log('🌱 Starting data seeding...\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');
    
    // Wait a moment for schema synchronization to complete
    console.log('🔄 Ensuring database schema is up to date...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Schema synchronized\n');

    // Create organizations
    console.log('📦 Creating organizations...');
    const organizations = await createOrganizations();
    console.log(`✅ Created ${organizations.length} organizations\n`);

    // Create users for each organization
    console.log('👥 Creating users...');
    const users = await createUsers(organizations);
    console.log(`✅ Created ${users.length} users\n`);

    // Setup integrations for each organization
    console.log('🔌 Setting up integrations...');
    await setupIntegrations(organizations);
    console.log('✅ Integrations configured\n');

    // Create forms for each organization
    console.log('📝 Creating forms...');
    const forms = await createForms(organizations);
    console.log(`✅ Created ${forms.length} forms\n`);

    // Print summary
    printSummary(organizations, users, forms);

    console.log('\n✨ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

async function createOrganizations(): Promise<Organization[]> {
  const orgRepo = AppDataSource.getRepository(Organization);

  const orgsData = [
    {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      maxSubmissionsPerMonth: 10000,
      defaultRateLimitEnabled: true,
      defaultRateLimitMaxRequests: 20,
      defaultRateLimitWindowSeconds: 60,
    },
    {
      name: 'TechStart Inc',
      slug: 'techstart-inc',
      maxSubmissionsPerMonth: 5000,
      defaultRateLimitEnabled: true,
      defaultRateLimitMaxRequests: 15,
      defaultRateLimitWindowSeconds: 60,
    },
    {
      name: 'Creative Studios',
      slug: 'creative-studios',
      maxSubmissionsPerMonth: 3000,
      defaultRateLimitEnabled: true,
      defaultRateLimitMaxRequests: 10,
      defaultRateLimitWindowSeconds: 60,
    },
  ];

  const organizations: Organization[] = [];
  for (const orgData of orgsData) {
    // Check if organization already exists
    let org = await orgRepo.findOne({ where: { slug: orgData.slug } });
    if (org) {
      console.log(`  - ${orgData.name} (${orgData.slug}) - already exists, skipping`);
      organizations.push(org);
    } else {
      org = orgRepo.create(orgData);
      const saved = await orgRepo.save(org);
      organizations.push(saved);
      console.log(`  - ${orgData.name} (${orgData.slug})`);
    }
  }

  return organizations;
}

async function createUsers(organizations: Organization[]): Promise<User[]> {
  const userRepo = AppDataSource.getRepository(User);
  const users: User[] = [];

  // Create super admin (not tied to any organization)
  let admin = await userRepo.findOne({ where: { email: 'admin@formflow.dev' } });
  if (!admin) {
    const adminPassword = await bcrypt.hash('admin123', 10);
    admin = userRepo.create({
      email: 'admin@formflow.dev',
      name: 'Super Admin',
      passwordHash: adminPassword,
      isSuperAdmin: true,
      isActive: true,
      role: 'member', // Role doesn't matter for super admins, but must be a valid UserRole
      organizationId: null,
    });
    admin = await userRepo.save(admin);
    console.log(`  - ${admin.email} (Super Admin)`);
  } else {
    console.log(`  - ${admin.email} (Super Admin) - already exists, skipping`);
  }
  users.push(admin);

  // Create users for each organization
  const userTemplates: Array<{ role: UserRole; suffix: string }> = [
    { role: 'org_admin', suffix: 'admin' },
    { role: 'member', suffix: 'user' },
  ];

  for (const org of organizations) {
    for (const template of userTemplates) {
      const email = `${template.suffix}@${org.slug}.dev`;
      let user = await userRepo.findOne({ where: { email } });
      if (!user) {
        const password = await bcrypt.hash('password123', 10);
        user = userRepo.create({
          email,
          name: `${org.name} ${template.role === 'org_admin' ? 'Admin' : 'User'}`,
          passwordHash: password,
          isSuperAdmin: false,
          isActive: true,
          role: template.role,
          organizationId: org.id,
        });
        user = await userRepo.save(user);
        console.log(`  - ${user.email} (${org.name} - ${template.role})`);
      } else {
        console.log(`  - ${user.email} (${org.name} - ${template.role}) - already exists, skipping`);
      }
      users.push(user);
    }
  }

  return users;
}

async function setupIntegrations(organizations: Organization[]): Promise<void> {
  const integrationRepo = AppDataSource.getRepository(OrganizationIntegration);

  for (const org of organizations) {
    // Check if integration already exists
    let integration = await integrationRepo.findOne({ where: { organizationId: org.id } });
    
    if (!integration) {
      // Each organization gets different integration configurations
      const integrationConfig = getIntegrationConfig(org.slug);

      integration = integrationRepo.create({
        organizationId: org.id,
        ...integrationConfig,
      });

      integration = await integrationRepo.save(integration);
      console.log(`  - ${org.name}: ${getEnabledIntegrations(integrationConfig).join(', ')}`);
    } else {
      console.log(`  - ${org.name}: Integration already exists, skipping`);
    }
  }
}

function getIntegrationConfig(slug: string): Partial<OrganizationIntegration> {
  const baseConfig = {
    emailEnabled: false,
    emailRecipients: null,
  };

  switch (slug) {
    case 'acme-corp':
      return {
        ...baseConfig,
        // Webhook integration
        webhookEnabled: true,
        webhookUrl: `${TEST_LAB_URL}/webhook/acme`,
        // n8n integration
        n8nEnabled: true,
        n8nWebhook: `${TEST_LAB_URL}/n8n/acme`,
        // Slack integration
        slackEnabled: true,
        slackChannelId: 'C123456789',
        slackChannelName: 'form-submissions',
      };

    case 'techstart-inc':
      return {
        ...baseConfig,
        // Make.com integration
        makeEnabled: true,
        makeWebhook: `${TEST_LAB_URL}/make/techstart`,
        // Discord integration
        discordEnabled: true,
        discordWebhook: `${TEST_LAB_URL}/discord/techstart`,
        // Generic webhook
        webhookEnabled: true,
        webhookUrl: `${TEST_LAB_URL}/webhook/techstart`,
      };

    case 'creative-studios':
      return {
        ...baseConfig,
        // Telegram integration
        telegramEnabled: true,
        telegramChatId: 123456789,
        // n8n integration
        n8nEnabled: true,
        n8nWebhook: `${TEST_LAB_URL}/n8n/creative`,
        // Discord integration
        discordEnabled: true,
        discordWebhook: `${TEST_LAB_URL}/discord/creative`,
      };

    default:
      return baseConfig;
  }
}

function getEnabledIntegrations(config: Partial<OrganizationIntegration>): string[] {
  const enabled: string[] = [];
  if (config.webhookEnabled) enabled.push('Webhook');
  if (config.n8nEnabled) enabled.push('n8n');
  if (config.makeEnabled) enabled.push('Make.com');
  if (config.discordEnabled) enabled.push('Discord');
  if (config.telegramEnabled) enabled.push('Telegram');
  if (config.slackEnabled) enabled.push('Slack');
  return enabled;
}

async function createForms(organizations: Organization[]): Promise<Form[]> {
  const formRepo = AppDataSource.getRepository(Form);
  const forms: Form[] = [];

  const formTemplates = [
    {
      name: 'Contact Form',
      description: 'General contact and inquiry form',
      useOrgIntegrations: true,
    },
    {
      name: 'Newsletter Signup',
      description: 'Newsletter subscription form',
      useOrgIntegrations: true,
    },
    {
      name: 'Support Request',
      description: 'Customer support request form',
      useOrgIntegrations: true,
    },
    {
      name: 'Feedback Form',
      description: 'Product feedback collection',
      useOrgIntegrations: true,
    },
    {
      name: 'Event Registration',
      description: 'Event signup and registration',
      useOrgIntegrations: true,
    },
    {
      name: 'Job Application',
      description: 'Career opportunities application',
      useOrgIntegrations: true,
    },
  ];

  for (const org of organizations) {
    // Each org gets 5-6 forms (randomized)
    const formCount = 5 + Math.floor(Math.random() * 2); // 5 or 6
    const selectedTemplates = formTemplates.slice(0, formCount);

    for (const template of selectedTemplates) {
      const form = formRepo.create({
        organizationId: org.id,
        name: template.name,
        description: template.description,
        submitHash: uuidv4(),
        isActive: true,
        useOrgIntegrations: template.useOrgIntegrations,
        useOrgSecuritySettings: true,
        rateLimitEnabled: true,
        rateLimitMaxRequests: 10,
        rateLimitWindowSeconds: 60,
        minTimeBetweenSubmissionsEnabled: true,
        minTimeBetweenSubmissionsSeconds: 10,
        refererFallbackEnabled: true,
      });

      const savedForm = await formRepo.save(form);
      forms.push(savedForm);
      console.log(`  - ${org.name}: ${template.name} (${savedForm.submitHash})`);
    }
  }

  return forms;
}

function printSummary(organizations: Organization[], users: User[], forms: Form[]) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 SEEDING SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('🏢 ORGANIZATIONS:');
  for (const org of organizations) {
    const orgForms = forms.filter((f) => f.organizationId === org.id);
    const orgUsers = users.filter((u) => u.organizationId === org.id);
    console.log(`\n  ${org.name} (${org.slug})`);
    console.log(`    - Forms: ${orgForms.length}`);
    console.log(`    - Users: ${orgUsers.length}`);
    console.log(`    - Max Submissions/Month: ${org.maxSubmissionsPerMonth?.toLocaleString() || 'Unlimited'}`);
  }

  console.log('\n\n👥 LOGIN CREDENTIALS:\n');
  console.log('  Super Admin:');
  console.log('    Email: admin@formflow.dev');
  console.log('    Password: admin123\n');

  for (const org of organizations) {
    console.log(`  ${org.name}:`);
    console.log(`    Admin: admin@${org.slug}.dev / password123`);
    console.log(`    User:  user@${org.slug}.dev / password123`);
  }

  console.log('\n\n🔗 TEST LAB WEBHOOK ENDPOINTS:\n');
  console.log(`  Running at: ${TEST_LAB_URL}`);
  console.log('  Endpoints:');
  console.log('    - /webhook/:org');
  console.log('    - /n8n/:org');
  console.log('    - /make/:org');
  console.log('    - /discord/:org');
  console.log('    - /telegram/:org');

  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// Run the seeder
seedData().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
