#!/usr/bin/env tsx

/**
 * Environment Configuration Test Script
 * Verifies that required env vars are present in real env files (with fallbacks to examples),
 * and surfaces missing or mismatched values with clear output.
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

const requiredVars = [
  'NODE_ENV',
  'DASHBOARD_API_PORT',
  'DASHBOARD_API_URL',
  'REDIRECT_URL',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'SYSTEM_MAIL_PROVIDER',
  'SYSTEM_MAIL_HOST',
  'SYSTEM_MAIL_SMTP_PORT',
  'SYSTEM_MAIL_USER',
  'SYSTEM_MAIL_PASSWORD',
  'SYSTEM_MAIL_TO'
];

const optionalVars = [
  'CSRF_SECRET',
  'CSRF_TTL_MINUTES',
  'SUPER_ADMIN_EMAIL',
  'SUPER_ADMIN_PASSWORD',
  'SUPER_ADMIN_NAME',
  'LOG_LEVEL'
];

type EnvTarget = {
  label: string;
  file: string;
  fallback?: string;
  expectedEnv: 'development' | 'production';
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function loadEnvFile(target: EnvTarget): { env: Record<string, string>; usedFile: string | null } {
  const primaryPath = path.join(__dirname, '..', target.file);
  const fallbackPath = target.fallback ? path.join(__dirname, '..', target.fallback) : null;

  const usePath = fs.existsSync(primaryPath)
    ? primaryPath
    : fallbackPath && fs.existsSync(fallbackPath)
      ? fallbackPath
      : null;

  if (!usePath) {
    log(`✗ Missing env file: ${target.file}${target.fallback ? ` (and fallback ${target.fallback})` : ''}`, colors.red);
    return { env: {}, usedFile: null };
  }

  const parsed = dotenv.parse(fs.readFileSync(usePath));
  parsed.NODE_ENV = parsed.NODE_ENV || target.expectedEnv;

  log(`✓ Loaded ${path.basename(usePath)} for ${target.label}`, colors.green);
  return { env: parsed, usedFile: usePath };
}

function checkVars(env: Record<string, string>, target: EnvTarget) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`Checking ${target.label}`, colors.bright);
  log('='.repeat(60), colors.cyan);

  let allPassed = true;

  log('\nRequired variables:', colors.yellow);
  for (const key of requiredVars) {
    const value = env[key];
    if (value) {
      const masked = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN'].some((s) => key.includes(s))
        ? '***' + value.slice(-4)
        : value;
      log(`  ✓ ${key.padEnd(24)} = ${masked}`, colors.green);
    } else {
      log(`  ✗ ${key.padEnd(24)} = MISSING`, colors.red);
      allPassed = false;
    }
  }

  log('\nOptional variables:', colors.yellow);
  for (const key of optionalVars) {
    const value = env[key];
    if (value) {
      const masked = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'CLIENT'].some((s) => key.includes(s))
        ? '***' + value.slice(-4)
        : value;
      log(`  • ${key.padEnd(24)} = ${masked}`, colors.green);
    } else {
      log(`  • ${key.padEnd(24)} = not set`, colors.yellow);
    }
  }

  if (env.NODE_ENV !== target.expectedEnv) {
    log(`\n✗ NODE_ENV mismatch: expected "${target.expectedEnv}", got "${env.NODE_ENV || 'unset'}"`, colors.red);
    allPassed = false;
  } else {
    log(`\n✓ NODE_ENV matches (${env.NODE_ENV})`, colors.green);
  }

  return allPassed;
}

function main() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('FormFlow Environment Configuration Test', colors.bright + colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);

  const targets: EnvTarget[] = [
    { label: 'Development (.env.development)', file: '.env.development', fallback: '.env.development.example', expectedEnv: 'development' },
    { label: 'Production Example (.env.production.example)', file: '.env.production', fallback: '.env.production.example', expectedEnv: 'production' },
  ];

  const results: Record<string, boolean> = {};

  for (const target of targets) {
    const { env, usedFile } = loadEnvFile(target);
    if (!usedFile) {
      results[target.label] = false;
      continue;
    }
    results[target.label] = checkVars(env, target);
  }

  log(`\n${'='.repeat(60)}`, colors.cyan);
  log('Test Summary', colors.bright);
  log('='.repeat(60), colors.cyan);

  const allPassed = Object.values(results).every(Boolean);
  for (const [label, passed] of Object.entries(results)) {
    log(`  ${passed ? '✓ PASS' : '✗ FAIL'} - ${label}`, passed ? colors.green : colors.red);
  }

  log('='.repeat(60) + '\n', colors.cyan);

  if (allPassed) {
    log('✅ All environment configuration tests passed!', colors.green + colors.bright);
    process.exit(0);
  } else {
    log('❌ Some environment configuration tests failed', colors.red + colors.bright);
    log('\nFix the missing variables above and re-run `pnpm test:env`.', colors.red);
    process.exit(1);
  }
}

main();
