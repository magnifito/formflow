import { Logger, QueryRunner } from 'typeorm';

const LOG_QUERIES = process.env.LOG_QUERIES === 'true' || 
                    (process.env.NODE_ENV === 'development' && process.env.LOG_QUERIES !== 'false');
const LOG_SLOW_QUERY_THRESHOLD = parseInt(process.env.LOG_SLOW_QUERY_THRESHOLD || '500', 10);

// Lazy import to avoid circular dependency
function getLogger() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('./index').default;
}

/**
 * TypeORM logger that uses Winston
 */
export class WinstonTypeORMLogger implements Logger {
  /**
   * Logs query and parameters used in it.
   */
  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    if (!LOG_QUERIES) return;

    const startTime = Date.now();
    if (queryRunner) {
      (queryRunner as any)._queryStartTime = startTime;
    }

    getLogger().debug('TypeORM Query', {
      query,
      parameters: parameters ? '[Parameters]' : undefined, // Don't log actual parameters (may contain sensitive data)
      queryRunnerId: queryRunner?.connection?.name,
    });
  }

  /**
   * Logs query that failed.
   */
  logQueryError(error: string | Error, query: string, parameters?: any[], queryRunner?: QueryRunner) {
    const duration = queryRunner && (queryRunner as any)._queryStartTime
      ? Date.now() - (queryRunner as any)._queryStartTime
      : undefined;

    getLogger().error('TypeORM Query Error', {
      error: typeof error === 'string' ? error : {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      query,
      parameters: parameters ? '[Parameters]' : undefined,
      duration,
      queryRunnerId: queryRunner?.connection?.name,
    });
  }

  /**
   * Logs query that is slow.
   */
  logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner) {
    getLogger().warn('TypeORM Slow Query', {
      query,
      duration: time,
      threshold: LOG_SLOW_QUERY_THRESHOLD,
      parameters: parameters ? '[Parameters]' : undefined,
      queryRunnerId: queryRunner?.connection?.name,
    });
  }

  /**
   * Logs events from the schema build process.
   */
  logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    if (LOG_QUERIES) {
      getLogger().debug('TypeORM Schema Build', {
        message,
        queryRunnerId: queryRunner?.connection?.name,
      });
    }
  }

  /**
   * Logs events from the migrations run process.
   */
  logMigration(message: string, queryRunner?: QueryRunner) {
    getLogger().info('TypeORM Migration', {
      message,
      queryRunnerId: queryRunner?.connection?.name,
    });
  }

  /**
   * Perform logging using given logger, or by default to the console.
   * Log has its own level and message.
   */
  log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner) {
    const logLevel = level === 'log' ? 'info' : level;
    getLogger()[logLevel]('TypeORM', {
      message: typeof message === 'string' ? message : JSON.stringify(message),
      queryRunnerId: queryRunner?.connection?.name,
    });
  }
}
