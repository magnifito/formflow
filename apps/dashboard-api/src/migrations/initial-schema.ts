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
                "organizationId" integer DEFAULT NULL,
                "role" character varying NOT NULL DEFAULT 'member',
                "isSuperAdmin" boolean NOT NULL DEFAULT false,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
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

        // 5. Create Integration enums and table (scoped org/form integrations)
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

        // 6. Create Submission table
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

        // 7. Create indexes for performance
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

        // 8. Add foreign key constraints
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
        await queryRunner.query(`ALTER TABLE "form" DROP CONSTRAINT "UQ_form_submitHash"`);
        await queryRunner.query(`ALTER TABLE "form" DROP CONSTRAINT "UQ_form_slug"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_user_email"`);
        await queryRunner.query(`ALTER TABLE "organization" DROP CONSTRAINT "UQ_organization_slug"`);

        // Drop tables in reverse order (respecting FK dependencies)
        await queryRunner.query(`DROP TABLE "integration"`);
        await queryRunner.query(`DROP TABLE "submission"`);
        await queryRunner.query(`DROP TABLE "form"`);
        await queryRunner.query(`DROP TABLE "whitelisted_domain"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "organization"`);

        // Drop enums
        await queryRunner.query(`DROP TYPE "integration_scope_enum"`);
        await queryRunner.query(`DROP TYPE "integration_type_enum"`);
    }
}
