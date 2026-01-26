
import { Router, Request, Response } from "express";
import { getBoss, QUEUE_NAMES, IntegrationType } from "@formflow/shared/queue";
import logger, { LogOperation } from "@formflow/shared/logger";

const router = Router();

// Helper to get all queue names
const queues = Object.values(QUEUE_NAMES);

// GET /queue/stats - Get stats for all queues
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const stats: Record<string, any> = {};
        const { AppDataSource } = await import("../data-source");

        // Query job table for stats
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

            const numCount = parseInt(count);
            if (state === 'active') stats[name].active += numCount;
            else if (state === 'completed') stats[name].completed += numCount;
            else if (state === 'failed') stats[name].failed += numCount;
            else if (state === 'retry') stats[name].retry += numCount;
            else if (state === 'created') stats[name].created += numCount;
        }

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
        const { queue, state, limit = '20', offset = '0' } = req.query;
        const { AppDataSource } = await import("../data-source");

        // pg-boss v9+ uses snake_case column names
        let query = `
            SELECT
                id, name, data, state, output,
                created_on as createdon,
                started_on as startedon,
                completed_on as completedon,
                retry_count as retrycount
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

        query += ` ORDER BY created_on DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
        params.push(parseInt(limit as string), parseInt(offset as string));

        const jobs = await AppDataSource.manager.query(query, params);

        // Get total count for pagination
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
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: 'Failed to fetch jobs', details: error.message });
    }
});

// POST /queue/jobs/:id/retry - Retry a job
router.post('/jobs/:id/retry', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { AppDataSource } = await import("../data-source");

        const jobResult = await AppDataSource.manager.query(
            `SELECT * FROM pgboss.job WHERE id = $1`,
            [id]
        );

        if (jobResult.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const job = jobResult[0];

        // Submit new job with same data
        const boss = await getBoss();
        const jobId = await boss.send(job.name, job.data, {});

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

// GET /queue/submission/:id - Get all jobs related to a specific submission
router.get('/submission/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { AppDataSource } = await import("../data-source");

        // pg-boss v9+ uses snake_case column names
        const query = `
            SELECT
                id, name, data, state, output,
                created_on as createdon,
                started_on as startedon,
                completed_on as completedon,
                retry_count as retrycount
            FROM pgboss.job
            WHERE data->>'submissionId' = $1
            ORDER BY created_on DESC
        `;

        const jobs = await AppDataSource.manager.query(query, [id]);
        res.json(jobs);
    } catch (error: any) {
        logger.error('Failed to get jobs for submission', {
            operation: LogOperation.DASHBOARD_QUEUE_JOBS,
            error: error.message,
            submissionId: req.params.id
        });
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

export default router;
