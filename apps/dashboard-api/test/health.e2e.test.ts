
import request from 'supertest';
import { createApp } from '../src/index';
import { db } from '../src/db';

// Mock the db module (Drizzle)
jest.mock('../src/db', () => ({
    db: {
        execute: jest.fn(),
    },
}));

jest.mock('@formflow/shared/db', () => ({
    users: { id: 'id', email: 'email', isSuperAdmin: 'isSuperAdmin' },
    organizations: { id: 'id', slug: 'slug' },
    forms: {},
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

const mockedDb = db as jest.Mocked<typeof db>;

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
        expect(res.body.service).toBe('dashboard-api');
    });

    it('GET /health/ready should return 200 when DB is connected', async () => {
        (mockedDb.execute as jest.Mock).mockResolvedValueOnce([{ '?column?': 1 }]);

        const res = await request(app).get('/health/ready');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ready');
        expect(res.body.database).toBe('connected');
    });

    it('GET /health/ready should return 503 when DB is disconnected', async () => {
        (mockedDb.execute as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

        const res = await request(app).get('/health/ready');
        expect(res.status).toBe(503);
        expect(res.body.status).toBe('not ready');
        expect(res.body.database).toBe('disconnected');
    });
});
