
import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import { AppDataSource } from '../data-source';
import AdminController from './AdminController';
import bcrypt from 'bcrypt';
import { User, Organization } from '@formflow/shared/entities';

// Mock dependencies
jest.mock('../data-source', () => ({
    AppDataSource: {
        manager: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
        },
    },
}));

jest.mock('@formflow/shared/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
}));

jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashed_password'),
}));

jest.mock('../middleware/auth', () => ({
    verifyToken: (req, res, next) => {
        req.user = { userId: 1, email: 'admin@example.com', role: 'admin' };
        next();
    },
}));

jest.mock('../middleware/superAdmin', () => ({
    verifySuperAdmin: (req, res, next) => next(),
}));

const app = express();
app.use(bodyParser.json());
app.use('/admin', AdminController);

describe('AdminController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /stats', () => {
        it('should return admin stats', async () => {
            (AppDataSource.manager.count as jest.Mock)
                .mockResolvedValueOnce(5)  // orgs
                .mockResolvedValueOnce(4)  // active orgs
                .mockResolvedValueOnce(10) // users
                .mockResolvedValueOnce(20) // forms
                .mockResolvedValueOnce(100); // submissions

            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(30),
            };
            (AppDataSource.manager.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

            const res = await request(app).get('/admin/stats');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                organizations: { total: 5, active: 4, inactive: 1 },
                users: { total: 10 },
                forms: { total: 20 },
                submissions: { total: 100, last30Days: 30 }
            });
        });
    });

    describe('GET /organizations', () => {
        it('should return paginated organizations', async () => {
            const mockOrgs = [{ id: 1, name: 'Org 1' }];
            (AppDataSource.manager.findAndCount as jest.Mock).mockResolvedValue([mockOrgs, 1]);

            const res = await request(app).get('/admin/organizations');
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual(mockOrgs);
            expect(res.body.pagination.total).toBe(1);
        });
    });

    describe('POST /organizations', () => {
        it('should create an organization', async () => {
            const newOrg = { name: 'New Org', slug: 'new-org' };
            const savedOrg = { id: 1, ...newOrg };

            (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue(null); // No conflict
            (AppDataSource.manager.create as jest.Mock).mockReturnValue(savedOrg);
            (AppDataSource.manager.save as jest.Mock).mockResolvedValue(savedOrg);

            const res = await request(app).post('/admin/organizations').send(newOrg);
            expect(res.status).toBe(201);
            expect(res.body).toEqual(savedOrg);
        });

        it('should validate slug uniqueness', async () => {
            (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue({ id: 2 }); // Exists

            const res = await request(app).post('/admin/organizations').send({ name: 'Org', slug: 'existing' });
            expect(res.status).toBe(400);
        });
    });

    describe('POST /users', () => {
        it('should create a new user', async () => {
            const newUser = { email: 'user@test.com', password: 'password123', organizationId: 1 };
            const savedUser = { id: 2, email: newUser.email, organizationId: 1 };
            const mockOrg = { id: 1, isActive: true };

            (AppDataSource.manager.findOne as jest.Mock)
                .mockResolvedValueOnce(null) // No existing user
                .mockResolvedValueOnce(mockOrg); // Org exists

            (AppDataSource.manager.create as jest.Mock).mockReturnValue(savedUser);
            (AppDataSource.manager.save as jest.Mock).mockResolvedValue(savedUser);

            const res = await request(app).post('/admin/users').send(newUser);
            expect(res.status).toBe(201);
            expect(res.body).toEqual(savedUser);
        });
    });
});
