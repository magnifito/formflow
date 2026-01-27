export class PgBoss {
    constructor(_connectionString: string) { }
    async start() { return 'id'; }
    async stop() { }
    async schedule(_queue: string, _cron: string, _data: unknown) { }
    async send(_queue: string, _data: unknown) { return 'job_id'; }
    async work(_queue: string, _handler: (job: unknown) => Promise<void>) { }
    on(_event: string, _handler: (...args: unknown[]) => void) { }
}
