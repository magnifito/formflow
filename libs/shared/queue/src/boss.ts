
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
        schema: 'pgboss',
        // Increased timeouts for development stability
        max: 10,
        connectionTimeoutMillis: 30000,
        // Cast to any for pg-pool options not explicitly in pg-boss types but supported by the driver
        idleTimeoutMillis: 30000,
    } as any);

    // Register internal error listener to prevent unhandled rejections from background maintenance
    (bossInstance as any).on('error', (error: any) => {
        logger.error('pg-boss background error', {
            message: error.message,
            stack: error.stack
        });
    });

    try {
        await bossInstance.start();
        logger.info('pg-boss started successfully');

        // Create all queues (required in pg-boss v9+)
        const queueNames = Object.values(QUEUE_NAMES);
        for (const queueName of queueNames) {
            await bossInstance.createQueue(queueName);
            logger.debug(`Queue create-check: ${queueName}`);
        }
        logger.info(`Verified ${queueNames.length} integration queues`);
    } catch (error: any) {
        logger.error('Failed to start pg-boss', { error: error.message });
        bossInstance = null; // Reset so it can be retried on next call
        throw error;
    }

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
