
import { PgBoss } from 'pg-boss';
import { getEnv } from '@formflow/shared/env';
import logger from '@formflow/shared/logger';
import { QUEUE_NAMES } from './types';

let bossInstance: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
    if (bossInstance) {
        return bossInstance;
    }

    // Construct connection string (PostgreSQL)
    // Note: pg-boss can take a connection string or a node-pg pool or config object.
    // Using connection string constructed from env vars to match logical DB connection.
    const connectionString = `postgresql://${getEnv('DB_USER')}:${getEnv('DB_PASSWORD')}@${getEnv('DB_HOST')}:${getEnv('DB_PORT')}/${getEnv('DB_NAME')}`;

    bossInstance = new PgBoss({
        connectionString,
        // Database schema
        schema: 'pgboss',
    });

    await bossInstance.start();
    logger.info('pg-boss started successfully');

    // Create all queues (required in pg-boss v9+)
    const queueNames = Object.values(QUEUE_NAMES);
    for (const queueName of queueNames) {
        await bossInstance.createQueue(queueName);
        logger.debug(`Queue created: ${queueName}`);
    }
    logger.info(`Created ${queueNames.length} integration queues`);

    return bossInstance;
}

export async function stopBoss(): Promise<void> {
    if (bossInstance) {
        try {
            await bossInstance.stop({ graceful: true, timeout: 30000 });
            logger.info('pg-boss stopped');
        } catch (error: any) {
            logger.error('Error stopping pg-boss', { error: error.message });
        } finally {
            bossInstance = null;
        }
    }
}
