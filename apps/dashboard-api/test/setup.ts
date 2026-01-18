// Test setup file
// Runs before each test suite

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3098';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433';
process.env.DB_NAME = 'formflow_test';
process.env.DB_USER = 'formflow';
process.env.DB_PASSWORD = 'test_password';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!';
process.env.REDIRECT_URL = 'http://localhost:4200';
process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
process.env.TELEGRAM_BOT_USERNAME = 'test_bot';

// Extend Jest timeout for E2E tests
jest.setTimeout(30000);

// Global test teardown
afterAll(async () => {
  // Allow time for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 500));
});
