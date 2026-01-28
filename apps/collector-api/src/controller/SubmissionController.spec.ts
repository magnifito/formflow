
import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import SubmissionController from './SubmissionController';
import { db } from '../db';

// Mock the db module (Drizzle)
jest.mock('../db', () => ({
    db: {
        query: {
            forms: {
                findFirst: jest.fn(),
            },
            whitelistedDomains: {
                findMany: jest.fn(),
            },
            integrations: {
                findMany: jest.fn(),
            },
        },
        insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
                returning: jest.fn(),
            }),
        }),
    },
}));

jest.mock('@formflow/shared/db', () => ({
    forms: { submitHash: 'submitHash', slug: 'slug', organizationId: 'organizationId', isActive: 'isActive', id: 'id' },
    whitelistedDomains: { organizationId: 'organizationId' },
    submissions: {},
    integrations: { organizationId: 'organizationId', scope: 'scope', isActive: 'isActive', formId: 'formId' },
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

// Get the mocked db after jest.mock is set up
const mockedDb = db as jest.Mocked<typeof db>;

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
            (mockedDb.query.forms.findFirst as jest.Mock).mockResolvedValue(mockForm);
            (mockedDb.query.whitelistedDomains.findMany as jest.Mock).mockResolvedValue([]); // No whitelisted domains

            const res = await request(app)
                .get('/s/hash123/csrf')
                .set('Origin', 'http://localhost:3000');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
        });

        it('should return 404 if form not found', async () => {
            (mockedDb.query.forms.findFirst as jest.Mock).mockResolvedValue(null);

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
            (mockedDb.query.forms.findFirst as jest.Mock).mockResolvedValue(mockForm);
            (mockedDb.query.whitelistedDomains.findMany as jest.Mock).mockResolvedValue([]); // No whitelisted domains
            (mockedDb.query.integrations.findMany as jest.Mock).mockResolvedValue([]); // No integrations

            // Mock insert chain
            const mockReturning = jest.fn().mockResolvedValue([{ id: 1 }]);
            const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
            (mockedDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

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
                isActive: false,
                organization: { isActive: true }
            };
            (mockedDb.query.forms.findFirst as jest.Mock).mockResolvedValue(mockForm);

            const res = await request(app)
                .post('/s/hash123')
                .send({ name: 'Test' });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('not accepting submissions');
        });
    });
});
