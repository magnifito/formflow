import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFormSlug1769255116211 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add slug column as nullable first
        await queryRunner.query(`ALTER TABLE "form" ADD "slug" character varying`);

        // 2. For any existing forms, set slug to submitHash to ensure uniqueness
        await queryRunner.query(`UPDATE "form" SET "slug" = "submitHash" WHERE "slug" IS NULL`);

        // 3. Make slug NOT NULL and UNIQUE
        await queryRunner.query(`ALTER TABLE "form" ALTER COLUMN "slug" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form" ADD CONSTRAINT "UQ_form_slug" UNIQUE ("slug")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "form" DROP CONSTRAINT "UQ_form_slug"`);
        await queryRunner.query(`ALTER TABLE "form" DROP COLUMN "slug"`);
    }
}
