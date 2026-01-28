import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './libs/shared/drizzle/src/lib/schema.ts',
    out: './drizzle/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'formflow',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'formflow',
        ssl: process.env.DB_SSL === 'true',
    },
    verbose: true,
    strict: true,
});
