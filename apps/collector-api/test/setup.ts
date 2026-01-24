// Test setup file
// Runs before each test suite

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.COLLECTOR_API_PORT = '3099';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433';
process.env.DB_NAME = 'formflow_test';
process.env.DB_USER = 'formflow';
process.env.DB_PASSWORD = 'test_password';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!';
process.env.HMAC = 'test-hmac-secret';
process.env.CSRF_SECRET = 'test-csrf-secret';
process.env.CSRF_TTL_MINUTES = '15';
process.env.DASHBOARD_API_URL = 'http://localhost:3098';

// Extend Jest timeout for E2E tests
jest.setTimeout(30000);

// Global test teardown
afterAll(async () => {
  // Allow time for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 500));
});
