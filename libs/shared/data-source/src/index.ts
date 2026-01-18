import "reflect-metadata"
import { DataSource } from "typeorm"
import { User, Organization, Form, WhitelistedDomain, FormIntegration, OrganizationIntegration, Submission } from "@formflow/shared/entities"
import * as path from 'path';

const dotenv = require('dotenv');

// Load .env from multiple possible locations
// Use process.cwd() which is more reliable in ts-node context
dotenv.config(); // Try current directory
dotenv.config({ path: path.join(process.cwd(), '.env') }); // Try from cwd
dotenv.config({ path: path.join(process.cwd(), '../.env') }); // Try monorepo root (one level up)
dotenv.config({ path: path.join(process.cwd(), '../../.env') }); // Try two levels up (if running from src)
dotenv.config({ path: path.join(process.cwd(), '../../../.env') }); // Try three levels up (from libs/shared/data-source/src)

// Determine environment (defaults to 'development' if not set)
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Get database configuration based on environment
// Supports both old (DEV_DB_USER, DEV_DB_PASS, DEV_DB) and new (DEV_DB_USERNAME, DEV_DB_PASSWORD, DEV_DB_DATABASE) variable names
const getDatabaseConfig = () => {
    if (isProduction) {
        // Production configuration
        return {
            type: "postgres" as const,
            host: process.env.PROD_DB_HOST,
            port: parseInt(process.env.PROD_DB_PORT || '5432', 10),
            username: process.env.PROD_DB_USERNAME || process.env.PROD_DB_USER,
            password: process.env.PROD_DB_PASSWORD || process.env.PROD_DB_PASS,
            database: process.env.PROD_DB_DATABASE || process.env.PROD_DB,
        };
    } else {
        // Development configuration - supports both naming conventions
        return {
            type: "postgres" as const,
            host: process.env.DEV_DB_HOST,
            port: parseInt(process.env.DEV_DB_PORT || '5433', 10),
            username: process.env.DEV_DB_USERNAME || process.env.DEV_DB_USER,
            password: process.env.DEV_DB_PASSWORD || process.env.DEV_DB_PASS,
            database: process.env.DEV_DB_DATABASE || process.env.DEV_DB,
        };
    }
};

const dbConfig = getDatabaseConfig();

// Validate that all required environment variables are set
const requiredEnvVars = ['host', 'username', 'password', 'database'] as const;
const missingEnvVars = requiredEnvVars.filter(key => !dbConfig[key]);

if (missingEnvVars.length > 0) {
    const envPrefix = isProduction ? 'PROD_DB' : 'DEV_DB';
    throw new Error(
        `Missing required database environment variables for ${NODE_ENV} environment: ` +
        missingEnvVars.map(key => `${envPrefix}_${key.toUpperCase()}`).join(', ')
    );
}

// Create the data source with environment-specific configuration
export const AppDataSource = new DataSource({
    ...dbConfig,
    synchronize: true, // Set to false in production and use migrations instead
    logging: !isProduction, // Enable logging in development
    entities: [User, Organization, Form, WhitelistedDomain, FormIntegration, OrganizationIntegration, Submission],
    migrations: [],
    subscribers: [],
});
