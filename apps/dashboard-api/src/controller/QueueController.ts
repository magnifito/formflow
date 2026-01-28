
import { Router, Request, Response } from "express";
import { getBoss, QUEUE_NAMES, IntegrationType } from "@formflow/shared/queue";
import logger, { LogOperation } from "@formflow/shared/logger";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

// Helper to get all queue names
const queues = Object.values(QUEUE_NAMES);

// GET /queue/stats - Get stats for all queues
router.get('/stats', async (req: Request, res: Response) => {
    try {

        const stats: Record<string, any> = {};

        // Query job table for stats
        const statsQuery = sql`
            SELECT name, state, COUNT(*) as count
            FROM pgboss.job
            GROUP BY name, state
        `;

        const result = await db.execute(statsQuery);
        const rows = result.rows;

        // Aggregate results
        for (const row of rows) {
            const { name, state, count } = row as any;
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

        // Compose query using Drizzle sql chunks
        const baseSelect = sql`
            SELECT
                id, name, data, state, output,
                created_on as createdon,
                started_on as startedon,
                completed_on as completedon,
                retry_count as retrycount
            FROM pgboss.job
            WHERE 1=1
        `;

        const conditions = [];
        if (queue) conditions.push(sql`AND name = ${queue}`);
        if (state) conditions.push(sql`AND state = ${state}`);

        const sortAndLimit = sql`ORDER BY created_on DESC LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}`;

        const finalQuery = sql`${baseSelect} ${sql.join(conditions, sql` `)} ${sortAndLimit}`;
        const result = await db.execute(finalQuery);
        const jobs = result.rows;

        // Get total count
        const countSelect = sql`SELECT COUNT(*) as total FROM pgboss.job WHERE 1=1`;
        const countQuery = sql`${countSelect} ${sql.join(conditions, sql` `)}`;

        const countResult = await db.execute(countQuery);
        const total = parseInt((countResult.rows[0] as any).total);

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

        const result = await db.execute(sql`SELECT * FROM pgboss.job WHERE id = ${id}`);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const job = result.rows[0] as any;

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

        // pg-boss v9+ uses snake_case column names
        const query = sql`
            SELECT
                id, name, data, state, output,
                created_on as createdon,
                started_on as startedon,
                completed_on as completedon,
                retry_count as retrycount
            FROM pgboss.job
            WHERE data->>'submissionId' = ${id}
            ORDER BY created_on DESC
        `;

        const result = await db.execute(query);
        res.json(result.rows);
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
