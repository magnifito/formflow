
import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import { AppDataSource } from '../data-source';
import SubmissionController from './SubmissionController';
import { getBoss } from '@formflow/shared/queue';

// Mock dependencies
jest.mock('../data-source', () => ({
    AppDataSource: {
        manager: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
        },
    },
}));

jest.mock('@formflow/shared/logger', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
    LogOperation: {},
    LogOutcome: {
        SUCCESS: 'success',
        FAILURE: 'failure',
    },
    maskSensitiveData: jest.fn((data) => data),
    maskHeaders: jest.fn((headers) => headers),
    maskUrl: jest.fn((url) => url),
    LogMessages: new Proxy({}, {
        get: (target, prop) => jest.fn(() => `[LogMessages.${String(prop)}]`),
    }),
}));

jest.mock('@formflow/shared/env', () => ({
    getEnv: jest.fn((key) => {
        if (key === 'CSRF_SECRET') return 'test_secret';
        if (key === 'CSRF_TTL_MINUTES') return '15';
        return '';
    }),
}));

jest.mock('@formflow/shared/telegram', () => ({
    getTelegramService: jest.fn(),
}));

jest.mock('@formflow/shared/queue', () => ({
    getBoss: jest.fn(),
    QUEUE_NAMES: { DISCORD: 'discord-queue' },
    IntegrationType: { DISCORD: 'DISCORD' },
    IntegrationJobData: {},
    JOB_OPTIONS: { DISCORD: {} },
}));

jest.mock('@formflow/shared/integrations', () => ({
    resolveIntegrationStack: jest.fn().mockReturnValue([]),
}));

const app = express();
app.use(bodyParser.json());
app.use('/s', SubmissionController);

describe('SubmissionController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /s/:identifier/csrf', () => {
        it('should return CSRF token for valid form', async () => {
            const mockForm = {
                id: 1,
                submitHash: 'hash123',
                isActive: true,
                organizationId: 1,
                organization: { isActive: true },
                csrfEnabled: true
            };
            (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue(mockForm);
            (AppDataSource.manager.find as jest.Mock).mockResolvedValue([]); // No whitelisted domains

            const res = await request(app)
                .get('/s/hash123/csrf')
                .set('Origin', 'http://localhost:3000');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
        });

        it('should return 404 if form not found', async () => {
            (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue(null);

            const res = await request(app)
                .get('/s/unknown/csrf')
                .set('Origin', 'http://localhost');

            expect(res.status).toBe(404);
        });
    });

    describe('POST /s/:identifier', () => {
        it('should accept valid submission', async () => {
            const mockForm = {
                id: 1,
                submitHash: 'hash123',
                isActive: true,
                organizationId: 1,
                organization: { isActive: true },
                csrfEnabled: false, // Disable for simpler test
                rateLimitEnabled: false
            };
            (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue(mockForm);
            (AppDataSource.manager.create as jest.Mock).mockReturnValue({ id: 1 });
            (AppDataSource.manager.save as jest.Mock).mockResolvedValue({ id: 1 });
            (AppDataSource.manager.find as jest.Mock).mockResolvedValue([]); // No integrations

            const res = await request(app)
                .post('/s/hash123')
                .send({ name: 'Test User' })
                .set('Origin', 'http://localhost:3000');

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('Submission received');
        });

        it('should fail if form is inactive', async () => {
            const mockForm = {
                id: 1,
                submitHash: 'hash123',
                isActive: false
            };
            (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue(mockForm);

            const res = await request(app)
                .post('/s/hash123')
                .send({ name: 'Test' });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('not accepting submissions');
        });
    });
});
