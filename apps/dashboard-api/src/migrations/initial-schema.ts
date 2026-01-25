import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1737227400000 implements MigrationInterface {
    name = 'InitialSchema1737227400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create Organization table
        await queryRunner.query(`
            CREATE TABLE "organization" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "slug" character varying NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "maxSubmissionsPerMonth" integer DEFAULT NULL,
                "defaultRateLimitEnabled" boolean NOT NULL DEFAULT true,
                "defaultRateLimitMaxRequests" integer DEFAULT 10,
                "defaultRateLimitWindowSeconds" integer DEFAULT 60,
                "defaultRateLimitMaxRequestsPerHour" integer DEFAULT 50,
                "defaultMinTimeBetweenSubmissionsEnabled" boolean NOT NULL DEFAULT true,
                "defaultMinTimeBetweenSubmissionsSeconds" integer DEFAULT 10,
                "defaultMaxRequestSizeBytes" integer DEFAULT 100000,
                "defaultRefererFallbackEnabled" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_organization_id" PRIMARY KEY ("id")
            )
        `);

        // 2. Create User table
        await queryRunner.query(`
            CREATE TABLE "user" (
                "id" SERIAL NOT NULL,
                "email" character varying NOT NULL,
                "passwordHash" character varying NOT NULL,
                "name" character varying DEFAULT NULL,
                "apiKey" character varying DEFAULT NULL,
                "organizationId" integer DEFAULT NULL,
                "role" character varying NOT NULL DEFAULT 'member',
                "isSuperAdmin" boolean NOT NULL DEFAULT false,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "returnBoolean" boolean DEFAULT false,
                "fromEmailAccessToken" character varying DEFAULT NULL,
                "fromEmail" character varying DEFAULT NULL,
                "fromEmailRefreshToken" character varying DEFAULT NULL,
                "smtpHost" character varying DEFAULT NULL,
                "smtpPort" integer DEFAULT NULL,
                "smtpUsername" character varying DEFAULT NULL,
                "smtpPassword" character varying DEFAULT NULL,
                "emailSubject" character varying DEFAULT NULL,
                "emailBody" character varying DEFAULT NULL,
                "telegramBoolean" boolean NOT NULL DEFAULT false,
                "telegramChatId" integer DEFAULT NULL,
                "discordBoolean" boolean NOT NULL DEFAULT false,
                "discordWebhook" character varying DEFAULT NULL,
                "slackBoolean" boolean NOT NULL DEFAULT false,
                "slackChannelId" character varying DEFAULT NULL,
                "slackAccessToken" character varying DEFAULT NULL,
                "slackChannelName" character varying DEFAULT NULL,
                "makeWebhook" character varying DEFAULT NULL,
                "makeBoolean" boolean NOT NULL DEFAULT false,
                "n8nWebhook" character varying DEFAULT NULL,
                "n8nBoolean" boolean NOT NULL DEFAULT false,
                "webhookWebhook" character varying DEFAULT NULL,
                "webhookBoolean" boolean NOT NULL DEFAULT false,
                "allowedDomains" text DEFAULT '',
                "maxPlugins" integer DEFAULT NULL,
                "currentPlugins" integer DEFAULT 0,
                CONSTRAINT "PK_user_id" PRIMARY KEY ("id")
            )
        `);

        // 3. Create WhitelistedDomain table
        await queryRunner.query(`
            CREATE TABLE "whitelisted_domain" (
                "id" SERIAL NOT NULL,
                "organizationId" integer NOT NULL,
                "domain" character varying NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_whitelisted_domain_id" PRIMARY KEY ("id")
            )
        `);

        // 4. Create Form table
        await queryRunner.query(`
            CREATE TABLE "form" (
                "id" SERIAL NOT NULL,
                "organizationId" integer DEFAULT NULL,
                "name" character varying NOT NULL,
                "slug" character varying NOT NULL,
                "description" character varying DEFAULT NULL,
                "submitHash" character varying NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "useOrgIntegrations" boolean NOT NULL DEFAULT true,
                "captchaEnabled" boolean NOT NULL DEFAULT false,
                "csrfEnabled" boolean NOT NULL DEFAULT false,
                "useOrgSecuritySettings" boolean NOT NULL DEFAULT true,
                "rateLimitEnabled" boolean NOT NULL DEFAULT true,
                "rateLimitMaxRequests" integer DEFAULT 10,
                "rateLimitWindowSeconds" integer DEFAULT 60,
                "rateLimitMaxRequestsPerHour" integer DEFAULT 50,
                "minTimeBetweenSubmissionsEnabled" boolean NOT NULL DEFAULT true,
                "minTimeBetweenSubmissionsSeconds" integer DEFAULT 10,
                "maxRequestSizeBytes" integer DEFAULT 100000,
                "refererFallbackEnabled" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_form_id" PRIMARY KEY ("id")
            )
        `);

        // 5. Create FormIntegration table
        await queryRunner.query(`
            CREATE TABLE "form_integration" (
                "id" SERIAL NOT NULL,
                "formId" integer NOT NULL,
                "emailEnabled" boolean NOT NULL DEFAULT true,
                "emailRecipients" character varying DEFAULT NULL,
                "returnEmailEnabled" boolean NOT NULL DEFAULT false,
                "emailSubject" character varying DEFAULT NULL,
                "emailBody" character varying DEFAULT NULL,
                "smtpHost" character varying DEFAULT NULL,
                "smtpPort" integer DEFAULT NULL,
                "smtpUsername" character varying DEFAULT NULL,
                "smtpPassword" character varying DEFAULT NULL,
                "fromEmail" character varying DEFAULT NULL,
                "fromEmailAccessToken" character varying DEFAULT NULL,
                "fromEmailRefreshToken" character varying DEFAULT NULL,
                "telegramEnabled" boolean NOT NULL DEFAULT false,
                "telegramChatId" integer DEFAULT NULL,
                "discordEnabled" boolean NOT NULL DEFAULT false,
                "discordWebhook" character varying DEFAULT NULL,
                "makeEnabled" boolean NOT NULL DEFAULT false,
                "makeWebhook" character varying DEFAULT NULL,
                "n8nEnabled" boolean NOT NULL DEFAULT false,
                "n8nWebhook" character varying DEFAULT NULL,
                "webhookEnabled" boolean NOT NULL DEFAULT false,
                "webhookUrl" character varying DEFAULT NULL,
                "slackEnabled" boolean NOT NULL DEFAULT false,
                "slackChannelId" character varying DEFAULT NULL,
                "slackAccessToken" character varying DEFAULT NULL,
                "slackChannelName" character varying DEFAULT NULL,
                CONSTRAINT "PK_form_integration_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_form_integration_formId" UNIQUE ("formId")
            )
        `);

        // 6. Create OrganizationIntegration table
        await queryRunner.query(`
            CREATE TABLE "organization_integration" (
                "id" SERIAL NOT NULL,
                "organizationId" integer NOT NULL,
                "emailEnabled" boolean NOT NULL DEFAULT true,
                "emailRecipients" character varying DEFAULT NULL,
                "returnEmailEnabled" boolean NOT NULL DEFAULT false,
                "emailSubject" character varying DEFAULT NULL,
                "emailBody" character varying DEFAULT NULL,
                "smtpHost" character varying DEFAULT NULL,
                "smtpPort" integer DEFAULT NULL,
                "smtpUsername" character varying DEFAULT NULL,
                "smtpPassword" character varying DEFAULT NULL,
                "fromEmail" character varying DEFAULT NULL,
                "fromEmailAccessToken" character varying DEFAULT NULL,
                "fromEmailRefreshToken" character varying DEFAULT NULL,
                "telegramEnabled" boolean NOT NULL DEFAULT false,
                "telegramChatId" integer DEFAULT NULL,
                "discordEnabled" boolean NOT NULL DEFAULT false,
                "discordWebhook" character varying DEFAULT NULL,
                "makeEnabled" boolean NOT NULL DEFAULT false,
                "makeWebhook" character varying DEFAULT NULL,
                "n8nEnabled" boolean NOT NULL DEFAULT false,
                "n8nWebhook" character varying DEFAULT NULL,
                "webhookEnabled" boolean NOT NULL DEFAULT false,
                "webhookUrl" character varying DEFAULT NULL,
                "slackEnabled" boolean NOT NULL DEFAULT false,
                "slackChannelId" character varying DEFAULT NULL,
                "slackAccessToken" character varying DEFAULT NULL,
                "slackChannelName" character varying DEFAULT NULL,
                CONSTRAINT "PK_organization_integration_id" PRIMARY KEY ("id")
            )
        `);

        // 7. Create Integration enums and table (scoped org/form integrations)
        await queryRunner.query(`
            CREATE TYPE "integration_type_enum" AS ENUM ('email-smtp', 'email-api', 'telegram', 'discord', 'slack', 'webhook')
        `);

        await queryRunner.query(`
            CREATE TYPE "integration_scope_enum" AS ENUM ('organization', 'form')
        `);

        await queryRunner.query(`
            CREATE TABLE "integration" (
                "id" SERIAL NOT NULL,
                "organizationId" integer NOT NULL,
                "formId" integer,
                "scope" "integration_scope_enum" NOT NULL DEFAULT 'organization',
                "type" "integration_type_enum" NOT NULL DEFAULT 'webhook',
                "name" character varying NOT NULL,
                "config" jsonb NOT NULL DEFAULT '{}',
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_integration_id" PRIMARY KEY ("id")
            )
        `);

        // 8. Create Submission table
        await queryRunner.query(`
            CREATE TABLE "submission" (
                "id" SERIAL NOT NULL,
                "formId" integer NOT NULL,
                "data" jsonb NOT NULL,
                "originDomain" character varying DEFAULT NULL,
                "ipAddress" character varying DEFAULT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_submission_id" PRIMARY KEY ("id")
            )
        `);

        // 8. Create unique constraints
        await queryRunner.query(`ALTER TABLE "organization" ADD CONSTRAINT "UQ_organization_slug" UNIQUE ("slug")`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_user_email" UNIQUE ("email")`);
        await queryRunner.query(`ALTER TABLE "form" ADD CONSTRAINT "UQ_form_submitHash" UNIQUE ("submitHash")`);
        await queryRunner.query(`ALTER TABLE "form" ADD CONSTRAINT "UQ_form_slug" UNIQUE ("slug")`);
        // Note: form_integration.formId unique constraint is already created in table definition above

        // 9. Create indexes for performance
        await queryRunner.query(`CREATE INDEX "IDX_organization_slug" ON "organization" ("slug")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_email" ON "user" ("email")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_organizationId" ON "user" ("organizationId")`);
        await queryRunner.query(`CREATE INDEX "IDX_form_submitHash" ON "form" ("submitHash")`);
        await queryRunner.query(`CREATE INDEX "IDX_form_slug" ON "form" ("slug")`);
        await queryRunner.query(`CREATE INDEX "IDX_form_organizationId" ON "form" ("organizationId")`);
        await queryRunner.query(`CREATE INDEX "IDX_submission_formId" ON "submission" ("formId")`);
        await queryRunner.query(`CREATE INDEX "IDX_submission_createdAt" ON "submission" ("createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_integration_org" ON "integration" ("organizationId")`);
        await queryRunner.query(`CREATE INDEX "IDX_integration_form" ON "integration" ("formId")`);
        await queryRunner.query(`CREATE INDEX "IDX_integration_type_scope" ON "integration" ("type", "scope")`);

        // 10. Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "user" ADD CONSTRAINT "FK_user_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "whitelisted_domain" ADD CONSTRAINT "FK_whitelisted_domain_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "form" ADD CONSTRAINT "FK_form_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "form_integration" ADD CONSTRAINT "FK_form_integration_formId" FOREIGN KEY ("formId") REFERENCES "form"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "organization_integration" ADD CONSTRAINT "FK_organization_integration_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "submission" ADD CONSTRAINT "FK_submission_formId" FOREIGN KEY ("formId") REFERENCES "form"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "integration" ADD CONSTRAINT "FK_integration_organization" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "integration" ADD CONSTRAINT "FK_integration_form" FOREIGN KEY ("formId") REFERENCES "form"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints first
        await queryRunner.query(`ALTER TABLE "integration" DROP CONSTRAINT "FK_integration_form"`);
        await queryRunner.query(`ALTER TABLE "integration" DROP CONSTRAINT "FK_integration_organization"`);
        await queryRunner.query(`ALTER TABLE "submission" DROP CONSTRAINT "FK_submission_formId"`);
        await queryRunner.query(`ALTER TABLE "organization_integration" DROP CONSTRAINT "FK_organization_integration_organizationId"`);
        await queryRunner.query(`ALTER TABLE "form_integration" DROP CONSTRAINT "FK_form_integration_formId"`);
        await queryRunner.query(`ALTER TABLE "form" DROP CONSTRAINT "FK_form_organizationId"`);
        await queryRunner.query(`ALTER TABLE "whitelisted_domain" DROP CONSTRAINT "FK_whitelisted_domain_organizationId"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_user_organizationId"`);

        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_integration_type_scope"`);
        await queryRunner.query(`DROP INDEX "IDX_integration_form"`);
        await queryRunner.query(`DROP INDEX "IDX_integration_org"`);
        await queryRunner.query(`DROP INDEX "IDX_submission_createdAt"`);
        await queryRunner.query(`DROP INDEX "IDX_submission_formId"`);
        await queryRunner.query(`DROP INDEX "IDX_form_organizationId"`);
        await queryRunner.query(`DROP INDEX "IDX_form_submitHash"`);
        await queryRunner.query(`DROP INDEX "IDX_form_slug"`);
        await queryRunner.query(`DROP INDEX "IDX_user_organizationId"`);
        await queryRunner.query(`DROP INDEX "IDX_user_email"`);
        await queryRunner.query(`DROP INDEX "IDX_organization_slug"`);

        // Drop unique constraints
        await queryRunner.query(`ALTER TABLE "form_integration" DROP CONSTRAINT "UQ_form_integration_formId"`);
        await queryRunner.query(`ALTER TABLE "form" DROP CONSTRAINT "UQ_form_submitHash"`);
        await queryRunner.query(`ALTER TABLE "form" DROP CONSTRAINT "UQ_form_slug"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_user_email"`);
        await queryRunner.query(`ALTER TABLE "organization" DROP CONSTRAINT "UQ_organization_slug"`);

        // Drop tables in reverse order (respecting FK dependencies)
        await queryRunner.query(`DROP TABLE "integration"`);
        await queryRunner.query(`DROP TABLE "submission"`);
        await queryRunner.query(`DROP TABLE "organization_integration"`);
        await queryRunner.query(`DROP TABLE "form_integration"`);
        await queryRunner.query(`DROP TABLE "form"`);
        await queryRunner.query(`DROP TABLE "whitelisted_domain"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "organization"`);

        // Drop enums
        await queryRunner.query(`DROP TYPE "integration_scope_enum"`);
        await queryRunner.query(`DROP TYPE "integration_type_enum"`);
    }
}
