import { db } from '../src/db';
import { users, organizations, forms } from '@formflow/shared/db';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getEnv } from '@formflow/shared/env';

/**
 * Test database helper
 */
export class TestDatabase {

  async cleanup() {
    // Truncate tables in reverse order of dependency
    await db.execute(sql`TRUNCATE TABLE "submission" CASCADE`);
    await db.execute(sql`TRUNCATE TABLE "integration" CASCADE`);
    await db.execute(sql`TRUNCATE TABLE "whitelisted_domain" CASCADE`);
    await db.execute(sql`TRUNCATE TABLE "form" CASCADE`);
    await db.execute(sql`TRUNCATE TABLE "user" CASCADE`);
    await db.execute(sql`TRUNCATE TABLE "organization" CASCADE`);
  }

  async createTestOrganization(data: any = {}) {
    // Check if organization slug is already taken
    const slug = data.slug || `test-org-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create organization
    const [savedOrganization] = await db.insert(organizations).values({
      name: data.name || 'Test Organization',
      slug: slug,
      maxSubmissionsPerMonth: data.maxSubmissionsPerMonth,
      isActive: true, // Default to true
      ...data
    }).returning(); // Drizzle returns array

    return savedOrganization;
  }

  async createTestUser(data: any = {}) {
    // Hash password (default to 'password123' if not provided)
    const passwordToHash = data.passwordHash || 'password123';
    const passwordHash = await bcrypt.hash(passwordToHash, 10);

    // Prepare user data with defaults
    const email = data.email || 'test@formflow.fyi';

    const [savedUser] = await db.insert(users).values({
      email,
      passwordHash,
      name: data.name || 'Test User',
      isSuperAdmin: data.isSuperAdmin || false,
      role: data.role || 'member',
      organizationId: data.organizationId || null,
      isActive: true
    }).returning();

    return savedUser;
  }

  async createSuperAdmin(email = 'admin@formflow.fyi', password = 'formflow123') {
    return this.createTestUser({
      email,
      passwordHash: password,
      name: 'Super Admin',
      isSuperAdmin: true,
    });
  }

  async createTestForm(organizationId: number, data: any = {}) {
    const [savedForm] = await db.insert(forms).values({
      name: data.name || 'Test Form',
      slug: data.slug || `test-form-${uuidv4()}`,
      organizationId,
      submitHash: data.submitHash || uuidv4(), // generateSubmitHash replacement
      captchaEnabled: data.captchaEnabled ?? true,
      csrfEnabled: data.csrfEnabled ?? false,
      isActive: true,
      ...data,
    }).returning();

    return savedForm;
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
export function createTestFormConfig(overrides: any = {}): any {
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
export function createTestOrgData(overrides: any = {}) {
  return {
    name: 'Test Organization',
    slug: `test-org-${Date.now()}`,
    ...overrides,
  };
}

/**
 * Create test user data
 */
export function createTestUserData(overrides: any = {}) {
  return {
    email: `test-${Date.now()}@formflow.fyi`,
    name: 'Test User',
    password: 'password123',
    ...overrides,
  };
}
