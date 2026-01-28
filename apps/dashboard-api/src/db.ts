import { createDbClient } from '@formflow/shared/drizzle';
import { getEnv } from '@formflow/shared/env';

const user = getEnv('DB_USERNAME') || getEnv('DB_USER');
const password = getEnv('DB_PASSWORD') || getEnv('DB_PASS');
const host = getEnv('DB_HOST');
const port = getEnv('DB_PORT') || '5432';
const dbName = getEnv('DB_NAME') || getEnv('DB_DATABASE');

const connectionString = `postgres://${user}:${password}@${host}:${port}/${dbName}`;

export const db = createDbClient(connectionString);
