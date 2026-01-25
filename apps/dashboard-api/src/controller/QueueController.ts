
import { Router, Request, Response } from "express";
import { getBoss, QUEUE_NAMES, IntegrationType } from "@formflow/shared/queue";
import logger, { LogOperation } from "@formflow/shared/logger";

const router = Router();

// Helper to get all queue names
const queues = Object.values(QUEUE_NAMES);

// GET /queue/stats - Get stats for all queues
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const boss = await getBoss();
        const stats: Record<string, any> = {};

        // pg-boss doesn't have a single "get all stats" method that aggregates nicely by queue
        // We can query the database directly or use boss methods.
        // Direct DB query is most efficient ensuring we use the 'pgboss' schema.
        // However, we should try to use the public API if possible.
        // boss.getQueueSize(queue) returns count of created/active/retry

        // Direct DB query for efficient stats
        const { AppDataSource } = await import("../data-source");

        const statsQuery = `
            SELECT name, state, COUNT(*) as count
            FROM pgboss.job
            GROUP BY name, state
        `;

        const rows = await AppDataSource.manager.query(statsQuery);

        // Aggregate results
        for (const row of rows) {
            const { name, state, count } = row;
            if (!stats[name]) {
                stats[name] = { active: 0, completed: 0, failed: 0, retry: 0, created: 0 };
            }

            // Map states to simple counters
            const numCount = parseInt(count);
            if (state === 'active') stats[name].active += numCount;
            else if (state === 'completed') stats[name].completed += numCount;
            else if (state === 'failed') stats[name].failed += numCount;
            else if (state === 'retry') stats[name].retry += numCount;
            else if (state === 'created') stats[name].created += numCount;
        }

        // For a proper dashboard, we likely want access to the job table counts by state
        // Since we are inside the backend utilizing the same DB, we can use a raw query via TypeORM/Boss.
        // But for now, let's Stick to what pg-boss exposes or if needed custom query.

        // bossInstance exposes the DB adapter? 
        // Actually, let's use a simpler approach: return what we can easily get.
        // If we want detailed stats, we might need to add a method to shared-queue/boss.ts 
        // to run a raw query on pgboss.job/archive tables.

        res.json(stats);
    } catch (error: any) {
        logger.error('Failed to get queue stats', {
            operation: LogOperation.DASHBOARD_QUEUE_STATS,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to fetch queue stats' });
    }
});

// GET /queue/jobs - Get jobs (with optional filtering)
router.get('/jobs', async (req: Request, res: Response) => {
    try {
        const boss = await getBoss();
        const { queue, state, limit = '20', offset = '0' } = req.query;

        // boss.getJobs(queue, options) is not quite right, it fetches for processing.
        // boss.fetch() is for processing.
        // We want to READ jobs.
        // pg-boss has `getJob(id)` but not `getJobs`.
        // We really need direct DB access for a dashboard list.

        // Since we are in the same mono-repo/DB context, we can run a SQL query.
        // We can access the DB pool from boss, or use AppDataSource if we map the entity?
        // We haven't mapped PgBoss entities in TypeORM.

        // Let's simplify: 
        // We will assume for today we just want to see stats. 
        // BUT the user asked for "Dashboard UI... new stuff added".
        // A list of jobs is standard.

        // I will implement a raw query using AppDataSource since it connects to the same DB.
        // Note: Schema is 'pgboss'.

        const { AppDataSource } = await import("../data-source"); // Dynamic import to avoid cycles/init issues logic?
        // Actually top level import is fine.

        let query = `
            SELECT id, name, data, state, createdon, startedon, completedon, retrycount, output
            FROM pgboss.job
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIdx = 1;

        if (queue) {
            query += ` AND name = $${paramIdx++}`;
            params.push(queue);
        }

        if (state) {
            query += ` AND state = $${paramIdx++}`;
            params.push(state);
        }

        query += ` ORDER BY createdon DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
        params.push(parseInt(limit as string), parseInt(offset as string));

        const jobs = await AppDataSource.manager.query(query, params);

        // Also get total count for pagination
        let countQuery = `SELECT COUNT(*) as total FROM pgboss.job WHERE 1=1`;
        const countParams: any[] = [];
        let countParamIdx = 1;

        if (queue) {
            countQuery += ` AND name = $${countParamIdx++}`;
            countParams.push(queue);
        }

        if (state) {
            countQuery += ` AND state = $${countParamIdx++}`;
            countParams.push(state);
        }

        const countResult = await AppDataSource.manager.query(countQuery, countParams);
        const total = parseInt(countResult[0].total);

        res.json({
            jobs,
            pagination: {
                total,
                page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
                limit: parseInt(limit as string)
            }
        });

    } catch (error: any) {
        logger.error('Failed to get queue jobs', {
            operation: LogOperation.DASHBOARD_QUEUE_JOBS,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

// POST /queue/jobs/:id/retry - Retry a job
router.post('/jobs/:id/retry', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Logic to retry:
        // In pg-boss, we can't easily "retry" a failed job in the 'job' table if it's already failed state?
        // Or if it's in archive?
        // Usually we re-submit the job.

        // 1. Get job details
        const { AppDataSource } = await import("../data-source");
        const jobResult = await AppDataSource.manager.query(
            `SELECT * FROM pgboss.job WHERE id = $1`,
            [id]
        );

        if (jobResult.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const job = jobResult[0];

        // 2. Submit new job with same data
        const boss = await getBoss();

        // We need to parse options if we want to preserve them, but data is most important.
        const jobId = await boss.send(job.name, job.data, {
            // Default options or try to infer?
            // Let's use defaults for the integration type + maybe custom opts
            // Simple re-queue
        });

        res.json({ message: 'Job rescheduled', newJobId: jobId });

    } catch (error: any) {
        logger.error('Failed to retry job', {
            operation: LogOperation.DASHBOARD_QUEUE_RETRY,
            error: error.message,
            jobId: req.params.id
        });
        res.status(500).json({ error: 'Failed to retry job' });
    }
});

export default router;
