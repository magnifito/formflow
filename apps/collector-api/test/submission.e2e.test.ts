
import request from 'supertest';
import { createApp } from '../src/index';
import { AppDataSource } from '../src/data-source';

// Mock dependencies
jest.mock('../src/data-source', () => ({
    AppDataSource: {
        isInitialized: false,
        initialize: jest.fn().mockResolvedValue(true),
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
        return '';
    }),
    loadEnv: jest.fn(),
}));

jest.mock('@formflow/shared/queue', () => ({
    startWorker: jest.fn(),
    stopBoss: jest.fn(),
    getBoss: jest.fn(),
    QUEUE_NAMES: {},
    IntegrationType: {},
    JOB_OPTIONS: {},
}));

jest.mock('@formflow/shared/integrations', () => ({
    resolveIntegrationStack: jest.fn().mockReturnValue([]),
}));

describe('Submission Endpoints (E2E)', () => {
    let app: any;

    beforeAll(async () => {
        app = await createApp();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('GET /s/:identifier/csrf should return token', async () => {
        const mockForm = {
            id: 1,
            submitHash: 'hash123',
            isActive: true,
            organizationId: 1,
            organization: { isActive: true },
            csrfEnabled: true
        };
        (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue(mockForm);
        (AppDataSource.manager.find as jest.Mock).mockResolvedValue([]);

        const res = await request(app)
            .get('/s/hash123/csrf')
            .set('Origin', 'http://localhost');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
    });

    it('POST /s/:identifier should accept submission', async () => {
        const mockForm = {
            id: 1,
            submitHash: 'hash123',
            isActive: true,
            organizationId: 1,
            organization: { isActive: true },
            csrfEnabled: false,
            rateLimitEnabled: false
        };

        (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue(mockForm);
        (AppDataSource.manager.create as jest.Mock).mockReturnValue({ id: 1 });
        (AppDataSource.manager.save as jest.Mock).mockResolvedValue({ id: 1 });
        (AppDataSource.manager.find as jest.Mock).mockResolvedValue([]);

        const res = await request(app)
            .post('/s/hash123')
            .send({ data: 'test' })
            .set('Origin', 'http://localhost');

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('Submission received');
    });
});
