/**
 * Migration Script: Single-User to Multi-Organization
 * 
 * This script migrates existing FormFlow users to the new multi-organization structure:
 * 1. Creates an Organization for each existing User
 * 2. Migrates allowedDomains to WhitelistedDomain entries
 * 3. Creates a Form for each User with their apiKey as submitHash
 * 4. Copies integration settings to OrganizationIntegration
 * 5. Updates User with organizationId and role
 * 
 * Run with: npx ts-node src/migrations/migrate-to-multi-org.ts
 */

import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { User, Organization, Form, WhitelistedDomain, OrganizationIntegration } from "@formflow/shared/entities";

async function migrateToMultiOrg() {
    console.log("Starting migration to multi-organization structure...\n");

    try {
        await AppDataSource.initialize();
        console.log("Database connected.\n");

        // Get all existing users without organization
        const usersToMigrate = await AppDataSource.manager.find(User, {
            where: { organizationId: null as any }
        });

        console.log(`Found ${usersToMigrate.length} users to migrate.\n`);

        let migratedCount = 0;
        let errorCount = 0;

        for (const user of usersToMigrate) {
            try {
                console.log(`Migrating user: ${user.email} (ID: ${user.id})`);

                // 1. Create Organization
                const slug = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + user.id;
                const organization = AppDataSource.manager.create(Organization, {
                    name: `${user.name || user.email.split('@')[0]}'s Organization`,
                    slug,
                    isActive: true
                });
                await AppDataSource.manager.save(organization);
                console.log(`  - Created organization: ${organization.name} (slug: ${organization.slug})`);

                // 2. Migrate allowedDomains to WhitelistedDomain
                if (user.allowedDomains && user.allowedDomains.length > 0) {
                    for (const domain of user.allowedDomains) {
                        if (domain && domain.trim()) {
                            const whitelistedDomain = AppDataSource.manager.create(WhitelistedDomain, {
                                organizationId: organization.id,
                                domain: domain.trim()
                            });
                            await AppDataSource.manager.save(whitelistedDomain);
                        }
                    }
                    console.log(`  - Migrated ${user.allowedDomains.filter(d => d && d.trim()).length} whitelisted domains`);
                }

                // 3. Create OrganizationIntegration with user's settings
                const orgIntegration = AppDataSource.manager.create(OrganizationIntegration, {
                    organizationId: organization.id,
                    // Email settings
                    emailEnabled: true,
                    emailRecipients: user.email,
                    returnEmailEnabled: user.returnBoolean || false,
                    emailSubject: user.emailSubject,
                    emailBody: user.emailBody,
                    smtpHost: user.smtpHost,
                    smtpPort: user.smtpPort,
                    smtpUsername: user.smtpUsername,
                    smtpPassword: user.smtpPassword,
                    fromEmail: user.fromEmail,
                    fromEmailAccessToken: user.fromEmailAccessToken,
                    fromEmailRefreshToken: user.fromEmailRefreshToken,
                    // Telegram
                    telegramEnabled: user.telegramBoolean,
                    telegramChatId: user.telegramChatId,
                    // Discord
                    discordEnabled: user.discordBoolean,
                    discordWebhook: user.discordWebhook,
                    // Make
                    makeEnabled: user.makeBoolean,
                    makeWebhook: user.makeWebhook,
                    // n8n
                    n8nEnabled: user.n8nBoolean,
                    n8nWebhook: user.n8nWebhook,
                    // Webhook
                    webhookEnabled: user.webhookBoolean,
                    webhookUrl: user.webhookWebhook,
                    // Slack
                    slackEnabled: user.slackBoolean,
                    slackChannelId: user.slackChannelId,
                    slackAccessToken: user.slackAccessToken,
                    slackChannelName: user.slackChannelName
                });
                await AppDataSource.manager.save(orgIntegration);
                console.log(`  - Created organization integration settings`);

                // 4. Create Form with user's apiKey as submitHash (if they have one)
                if (user.apiKey) {
                    const form = AppDataSource.manager.create(Form, {
                        organizationId: organization.id,
                        name: "Default Form",
                        description: "Migrated from legacy API key",
                        submitHash: user.apiKey,
                        isActive: true,
                        useOrgIntegrations: true
                    });
                    await AppDataSource.manager.save(form);
                    console.log(`  - Created form with legacy API key as submitHash`);
                }

                // 5. Update User with organization relationship
                user.organizationId = organization.id;
                user.role = 'org_admin';
                await AppDataSource.manager.save(user);
                console.log(`  - Updated user as org_admin of their organization`);

                migratedCount++;
                console.log(`  ✓ Migration complete for user ${user.email}\n`);

            } catch (userError) {
                errorCount++;
                console.error(`  ✗ Error migrating user ${user.email}:`, userError);
                console.log();
            }
        }

        console.log("=".repeat(50));
        console.log("Migration Summary:");
        console.log(`  Total users processed: ${usersToMigrate.length}`);
        console.log(`  Successfully migrated: ${migratedCount}`);
        console.log(`  Errors: ${errorCount}`);
        console.log("=".repeat(50));

    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    } finally {
        await AppDataSource.destroy();
        console.log("\nDatabase connection closed.");
    }
}

// Run migration
migrateToMultiOrg()
    .then(() => {
        console.log("\nMigration script completed.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Unexpected error:", error);
        process.exit(1);
    });
