import "reflect-metadata";
import path from "path";
import { DataSource } from "typeorm";
import { Form, Organization, Submission, User, WhitelistedDomain, Integration } from '@formflow/shared/entities';
import { loadEnv } from '@formflow/shared/env';

loadEnv();

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

const dbConfig = {
  type: "postgres" as const,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USERNAME || process.env.DB_USER,
  password: process.env.DB_PASSWORD || process.env.DB_PASS,
  database: process.env.DB_NAME || process.env.DB_DATABASE,
};

/**
 * Dashboard API uses migrations (not synchronize).
 *
 * Reason: schema sync (`synchronize: true`) can leave Postgres in a bad partial
 * state after a failed startup, and we’ve already got a proper initial migration.
 */
export const AppDataSource = new DataSource({
  ...dbConfig,
  synchronize: false,
  migrationsRun: true,
  logging: process.env.LOG_QUERIES === 'true',
  entities: [
    User,
    Organization,
    Form,
    WhitelistedDomain,
    Submission,
    Integration,
  ],
  migrations: [
    path.join(__dirname, "migrations/initial-schema.ts"),
  ],
});
