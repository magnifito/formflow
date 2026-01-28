import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

export const createDbClient = (connectionString: string): DrizzleClient => {
    const pool = new Pool({
        connectionString,
    });

    return drizzle(pool, { schema });
};
