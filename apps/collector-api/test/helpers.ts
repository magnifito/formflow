import { DataSource } from 'typeorm';
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
      ...data,
    });
    return await orgRepo.save(org);
  }

  async createTestUser(data: Partial<User> = {}): Promise<User> {
    const userRepo = this.dataSource.getRepository(User);
    const user = userRepo.create({
      email: data.email || 'test@formflow.fyi',
      ...data,
    });
    return await userRepo.save(user);
  }

  async createTestForm(organizationId: number, data: Partial<Form> = {}): Promise<Form> {
    const formRepo = this.dataSource.getRepository(Form);
    const form = formRepo.create({
      name: data.name || 'Test Form',
      organizationId,
      captchaEnabled: data.captchaEnabled ?? true,
      csrfEnabled: data.csrfEnabled ?? false,
      ...data,
    });
    return await formRepo.save(form);
  }
}

/**
 * Generate test CSRF token
 */
export function generateTestCsrfToken(): string {
  const crypto = require('crypto');
  const secret = process.env.CSRF_SECRET || 'test-csrf-secret';
  const timestamp = Date.now().toString();
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(timestamp);
  return `${timestamp}.${hmac.digest('hex')}`;
}

/**
 * Solve CAPTCHA challenge (mocked for tests)
 */
export function solveTestCaptcha(challenge: string): string {
  // In tests, we'll mock this or use a simple solution
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', process.env.HMAC || 'test-hmac');
  hmac.update(challenge);
  return hmac.digest('hex');
}

/**
 * Create test form data
 */
export function createTestFormData(overrides: Record<string, any> = {}) {
  return {
    name: 'John Doe',
    email: 'john@formflow.fyi',
    message: 'This is a test message',
    ...overrides,
  };
}
