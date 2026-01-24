import { DataSource } from 'typeorm';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, Form, Organization } from '@formflow/shared/entities';

/**
 * Test database helper
 */
export class TestDatabase {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  async cleanup() {
    const entities = this.dataSource.entityMetadatas;

    for (const entity of entities) {
      const repository = this.dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
    }
  }

  async createTestOrganization(data: Partial<Organization> = {}): Promise<Organization> {
    const orgRepo = this.dataSource.getRepository(Organization);
    const org = orgRepo.create({
      name: data.name || 'Test Organization',
      slug: data.slug || 'test-org',
      apiKey: data.apiKey || 'test-api-key-123',
      maxForms: data.maxForms,
      maxSubmissionsPerMonth: data.maxSubmissionsPerMonth,
      ...data,
    });
    return await orgRepo.save(org);
  }

  async createTestUser(data: Partial<User> = {}): Promise<User> {
    const userRepo = this.dataSource.getRepository(User);

    // Hash password (default to 'password123' if not provided)
    const passwordToHash = data.passwordHash || 'password123';
    const passwordHash = await bcrypt.hash(passwordToHash, 10);

    // Remove undefined values from data to prevent FK issues
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    // Prepare user data with defaults
    const userData = {
      email: cleanData.email || 'test@formflow.fyi',
      name: cleanData.name || 'Test User',
      apiKey: cleanData.apiKey || 'test-user-api-key',
      isSuperAdmin: cleanData.isSuperAdmin || false,
      role: cleanData.role || 'member',
      organizationId: null, // Default to null
      ...cleanData,
      passwordHash, // Always use hashed password
    };

    const user = userRepo.create(userData);
    return await userRepo.save(user);
  }

  async createSuperAdmin(email = 'admin@formflow.fyi', password = 'formflow123'): Promise<User> {
    return this.createTestUser({
      email,
      passwordHash: password,
      name: 'Super Admin',
      isSuperAdmin: true,
    });
  }

  async createTestForm(organizationId: number, data: Partial<Form> = {}): Promise<Form> {
    const formRepo = this.dataSource.getRepository(Form);
    const form = formRepo.create({
      name: data.name || 'Test Form',
      organizationId,
      submitHash: data.submitHash || uuidv4(),
      captchaEnabled: data.captchaEnabled ?? true,
      csrfEnabled: data.csrfEnabled ?? false,
      ...data,
    });
    return await formRepo.save(form);
  }
}

/**
 * Generate JWT token for testing
 */
export function generateTestToken(userId: number, isSuperAdmin = false): string {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret';
  return jwt.sign(
    { userId, isSuperAdmin },
    secret,
    { expiresIn: '1h' }
  );
}

/**
 * Generate JWT token with organization context
 */
export function generateOrgContextToken(userId: number, organizationId: number): string {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret';
  return jwt.sign(
    { userId, organizationId },
    secret,
    { expiresIn: '1h' }
  );
}

/**
 * Create test form configuration data
 */
export function createTestFormConfig(overrides: Partial<Form> = {}): Partial<Form> {
  return {
    name: 'Test Contact Form',
    captchaEnabled: true,
    csrfEnabled: false,
    redirectUrl: 'https://formflow.fyi/thank-you',
    ...overrides,
  };
}

/**
 * Create test organization data
 */
export function createTestOrgData(overrides: Partial<Organization> = {}) {
  return {
    name: 'Test Organization',
    slug: `test-org-${Date.now()}`,
    ...overrides,
  };
}

/**
 * Create test user data
 */
export function createTestUserData(overrides: Partial<User> = {}) {
  return {
    email: `test-${Date.now()}@formflow.fyi`,
    name: 'Test User',
    password: 'password123',
    ...overrides,
  };
}
