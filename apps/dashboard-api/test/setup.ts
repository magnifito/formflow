// Test setup file
// Runs before each test suite

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DASHBOARD_API_PORT = '3098';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433';
process.env.DB_NAME = 'formflow_test';
process.env.DB_USER = 'formflow';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'formflow_dev_password';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';

process.env.REDIRECT_URL = 'http://localhost:4200';
process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
process.env.TELEGRAM_BOT_USERNAME = 'test_bot';

// Extend Jest timeout for E2E tests
jest.setTimeout(30000);

import { Client } from 'pg';

// Global test setup
beforeAll(async () => {
  // Create test database if not exists
  const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres', // Connect to default DB to create new one
  });

  try {
    await client.connect();
    const result = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${process.env.DB_NAME}'`);
    if (result.rowCount === 0) {
      await client.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
    }
  } catch (err) {
    // Ignore error if DB exists or connection fails (let tests fail naturally)
    console.warn('Database setup warning:', err.message);
  } finally {
    await client.end();
  }
});

// Global test teardown
afterAll(async () => {
  // Allow time for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 500));
});
