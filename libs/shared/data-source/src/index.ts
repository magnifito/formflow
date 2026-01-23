import "reflect-metadata"
import { DataSource } from "typeorm"
import { User, Organization, Form, WhitelistedDomain, FormIntegration, OrganizationIntegration, Submission } from "@formflow/shared/entities"
import { loadEnv } from "@formflow/shared/env";

loadEnv();

// Determine environment (defaults to 'development' if not set)
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Database configuration (loaded from environment-specific .env file)
const getDatabaseConfig = () => ({
    type: "postgres" as const,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || process.env.DB_USER,
    password: process.env.DB_PASSWORD || process.env.DB_PASS,
    database: process.env.DB_NAME || process.env.DB_DATABASE,
});

const dbConfig = getDatabaseConfig();

// Validate that all required environment variables are set
const requiredEnvVars = {
    host: 'DB_HOST',
    username: 'DB_USER',
    password: 'DB_PASSWORD',
    database: 'DB_NAME',
} as const;
const missingEnvVars = Object.entries(requiredEnvVars)
    .filter(([key]) => !dbConfig[key as keyof typeof dbConfig])
    .map(([, envVar]) => envVar);

if (missingEnvVars.length > 0) {
    throw new Error(
        `Missing required database environment variables for ${NODE_ENV} environment: ` +
        missingEnvVars.join(', ')
    );
}

// Create the data source with environment-specific configuration
export const AppDataSource = new DataSource({
    ...dbConfig,
    // Use synchronize for now - in production you should use migrations instead
    // TODO: Set synchronize: false and use migrations for production deployments
    synchronize: true,
    logging: !isProduction, // Enable logging in development
    entities: [User, Organization, Form, WhitelistedDomain, FormIntegration, OrganizationIntegration, Submission],
    // Migrations are available in apps/dashboard-api/src/migrations/
    // To run migrations manually: npm run db:migrate
    migrations: [],
    // Auto-run migrations can be enabled for production: migrationsRun: isProduction
    subscribers: [],
});
