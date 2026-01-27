
import request from 'supertest';
import { createApp } from '../src/index';
import { AppDataSource } from '../src/data-source';

// Mock Data Source
jest.mock('../src/data-source', () => ({
    AppDataSource: {
        isInitialized: false,
        initialize: jest.fn().mockResolvedValue(true),
        manager: {
            query: jest.fn(),
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

jest.mock('@formflow/shared/queue', () => ({
    startWorker: jest.fn(),
    stopBoss: jest.fn(),
}));

describe('Health Checks (E2E)', () => {
    let app: any;

    beforeAll(async () => {
        app = await createApp();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('GET /health should return 200 and healthy status', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('healthy');
        expect(res.body.service).toBe('form-api');
    });

    it('GET /health/ready should return 200 when DB is connected', async () => {
        (AppDataSource.manager.query as jest.Mock).mockResolvedValueOnce([]);

        const res = await request(app).get('/health/ready');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ready');
        expect(res.body.database).toBe('connected');
    });
});
