#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, Organization, Form, OrganizationIntegration } from '@formflow/shared/entities';

// Initialize database connection
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'formflow',
  password: process.env.DB_PASSWORD || 'formflow',
  database: process.env.DB_NAME || 'formflow',
  entities: [
    User,
    Organization,
    Form,
    OrganizationIntegration,
  ],
  synchronize: false,
  logging: false,
});

const TEST_LAB_URL = 'http://localhost:5177';

async function seedData() {
  console.log('🌱 Starting data seeding...\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

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
    throw error;
  } finally {
    await AppDataSource.destroy();
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
    const org = orgRepo.create(orgData);
    const saved = await orgRepo.save(org);
    organizations.push(saved);
    console.log(`  - ${orgData.name} (${orgData.slug})`);
  }

  return organizations;
}

async function createUsers(organizations: Organization[]): Promise<User[]> {
  const userRepo = AppDataSource.getRepository(User);
  const users: User[] = [];

  // Create super admin (not tied to any organization)
  const adminPassword = await bcrypt.hash('admin123', 10);
  const superAdmin = userRepo.create({
    email: 'admin@formflow.dev',
    name: 'Super Admin',
    passwordHash: adminPassword,
    isSuperAdmin: true,
    isActive: true,
    role: 'super_admin',
    organizationId: null,
  });
  const savedAdmin = await userRepo.save(superAdmin);
  users.push(savedAdmin);
  console.log(`  - ${savedAdmin.email} (Super Admin)`);

  // Create users for each organization
  const userTemplates = [
    { role: 'org_admin', suffix: 'admin' },
    { role: 'member', suffix: 'user' },
  ];

  for (const org of organizations) {
    for (const template of userTemplates) {
      const password = await bcrypt.hash('password123', 10);
      const user = userRepo.create({
        email: `${template.suffix}@${org.slug}.dev`,
        name: `${org.name} ${template.role === 'org_admin' ? 'Admin' : 'User'}`,
        passwordHash: password,
        isSuperAdmin: false,
        isActive: true,
        role: template.role,
        organizationId: org.id,
      });
      const savedUser = await userRepo.save(user);
      users.push(savedUser);
      console.log(`  - ${savedUser.email} (${org.name} - ${template.role})`);
    }
  }

  return users;
}

async function setupIntegrations(organizations: Organization[]): Promise<void> {
  const integrationRepo = AppDataSource.getRepository(OrganizationIntegration);

  for (const org of organizations) {
    // Each organization gets different integration configurations
    const integrationConfig = getIntegrationConfig(org.slug);

    const integration = integrationRepo.create({
      organizationId: org.id,
      ...integrationConfig,
    });

    await integrationRepo.save(integration);
    console.log(`  - ${org.name}: ${getEnabledIntegrations(integrationConfig).join(', ')}`);
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
