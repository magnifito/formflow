import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './libs/shared/db/src/lib/schema.ts',
    out: './drizzle/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'formflow',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'formflow',
        ssl: process.env.DB_SSL === 'true',
    },
    verbose: true,
    strict: true,
});
