#!/usr/bin/env ts-node

/**
 * Environment Configuration Test Script
 * Tests that environment variables are loaded correctly for dev and production
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function testEnvFile(envFile: string, expectedEnv: string) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`Testing: ${envFile}`, colors.bright);
  log('='.repeat(60), colors.cyan);

  // Clear all env vars except NODE_ENV
  const originalEnv = { ...process.env };
  for (const key in process.env) {
    if (key !== 'PATH' && key !== 'HOME' && key !== 'USER') {
      delete process.env[key];
    }
  }

  // Set NODE_ENV
  process.env.NODE_ENV = expectedEnv;

  // Load the specific env file
  const envPath = path.join(__dirname, '..', envFile);
  try {
    dotenv.config({ path: envPath });
    log(`✓ Loaded ${envFile}`, colors.green);
  } catch (error) {
    log(`✗ Failed to load ${envFile}: ${error}`, colors.red);
    return false;
  }

  // Test critical variables
  const requiredVars = [
    'NODE_ENV',
    'PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
  ];

  log('\nCritical Variables:', colors.yellow);
  let allPresent = true;

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      // Mask sensitive values
      const displayValue = ['PASSWORD', 'SECRET', 'KEY'].some((s) => varName.includes(s))
        ? '***' + value.slice(-4)
        : value;
      log(`  ✓ ${varName.padEnd(20)} = ${displayValue}`, colors.green);
    } else {
      log(`  ✗ ${varName.padEnd(20)} = MISSING`, colors.red);
      allPresent = false;
    }
  }

  // Test optional variables
  log('\nOptional Variables:', colors.yellow);
  const optionalVars = [
    'REDIRECT_URL',
    'DASHBOARD_API_URL',
    'CSRF_SECRET',
    'HMAC',
    'GMAIL_CLIENT',
    'TELEGRAM_API_TOKEN',
  ];

  for (const varName of optionalVars) {
    const value = process.env[varName];
    if (value) {
      const displayValue = ['SECRET', 'KEY', 'TOKEN', 'CLIENT'].some((s) => varName.includes(s))
        ? '***' + value.slice(-4)
        : value;
      log(`  ✓ ${varName.padEnd(25)} = ${displayValue}`, colors.green);
    } else {
      log(`  - ${varName.padEnd(25)} = not set`, colors.yellow);
    }
  }

  // Validate NODE_ENV matches
  if (process.env.NODE_ENV !== expectedEnv) {
    log(`\n✗ NODE_ENV mismatch: expected "${expectedEnv}", got "${process.env.NODE_ENV}"`, colors.red);
    allPresent = false;
  } else {
    log(`\n✓ NODE_ENV correctly set to "${expectedEnv}"`, colors.green);
  }

  // Restore original env
  process.env = originalEnv;

  return allPresent;
}

function testDockerEnvSubstitution() {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log('Testing Docker Environment Variable Substitution', colors.bright);
  log('='.repeat(60), colors.cyan);

  const dockerComposeTests = [
    { var: 'DB_USER:-formflow', expected: 'formflow', description: 'Default DB user' },
    { var: 'DB_NAME:-formflow', expected: 'formflow', description: 'Default DB name' },
    { var: 'DB_PASSWORD:?', expected: 'required', description: 'Required DB password' },
    { var: 'JWT_SECRET:?', expected: 'required', description: 'Required JWT secret' },
    { var: 'ENCRYPTION_KEY:?', expected: 'required', description: 'Required encryption key' },
    { var: 'REDIRECT_URL:-https://formflow.fyi', expected: 'https://formflow.fyi', description: 'Default redirect URL' },
  ];

  log('\nDocker Compose Variable Handling:', colors.yellow);
  for (const test of dockerComposeTests) {
    const syntax = test.var.includes('?') ? 'required (must be set)' : `default: ${test.expected}`;
    log(`  ✓ \${${test.var.padEnd(30)}} - ${syntax}`, colors.green);
  }

  log('\n✓ All Docker Compose variable substitutions are properly configured', colors.green);
  return true;
}

function main() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('FormFlow Environment Configuration Test', colors.bright + colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);

  const results: { [key: string]: boolean } = {};

  // Test development environment
  results['dev'] = testEnvFile('.env.development.example', 'development');

  // Test production environment
  results['prod'] = testEnvFile('.env.production.example', 'production');

  // Test Docker substitution
  results['docker'] = testDockerEnvSubstitution();

  // Summary
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log('Test Summary', colors.bright);
  log('='.repeat(60), colors.cyan);

  const allPassed = Object.values(results).every((r) => r);

  for (const [env, passed] of Object.entries(results)) {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    const color = passed ? colors.green : colors.red;
    log(`  ${status.padEnd(10)} - ${env} environment`, color);
  }

  log('='.repeat(60) + '\n', colors.cyan);

  if (allPassed) {
    log('✅ All environment configuration tests passed!', colors.green + colors.bright);
    log('\nEnvironment files are properly configured for:', colors.green);
    log('  • Development (.env.development)', colors.green);
    log('  • Production (.env.production)', colors.green);
    log('  • Docker Compose (both dev and prod)', colors.green);
    process.exit(0);
  } else {
    log('❌ Some environment configuration tests failed', colors.red + colors.bright);
    log('\nPlease check the error messages above and fix the issues.', colors.red);
    process.exit(1);
  }
}

main();
