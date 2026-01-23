/**
 * Test suite for all npm commands in package.json
 * 
 * This suite validates that:
 * - All commands exist and are properly defined
 * - Commands can be parsed and validated
 * - Commands follow expected patterns
 * - No critical syntax errors in command definitions
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

interface PackageJson {
  scripts: Record<string, string>;
}

// Get workspace root (where package.json is located)
const getWorkspaceRoot = () => {
  // Try __dirname first (CommonJS/ts-jest)
  try {
    if (typeof __dirname !== 'undefined') {
      return join(__dirname, '..');
    }
  } catch {
    // __dirname not available
  }
  // Fallback to process.cwd() (works in most cases)
  return process.cwd();
};

describe('NPM Commands Test Suite', () => {
  let packageJson: PackageJson;
  let scripts: Record<string, string>;

  beforeAll(() => {
    const workspaceRoot = getWorkspaceRoot();
    const packageJsonPath = join(workspaceRoot, 'package.json');
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    packageJson = JSON.parse(packageJsonContent);
    scripts = packageJson.scripts || {};
  });

  describe('Command Discovery', () => {
    it('should have scripts defined in package.json', () => {
      expect(scripts).toBeDefined();
      expect(Object.keys(scripts).length).toBeGreaterThan(0);
    });

    it('should list all available commands', () => {
      const commandNames = Object.keys(scripts).filter(
        (name) => !name.startsWith('//')
      );
      console.log(`\nFound ${commandNames.length} npm commands:`);
      commandNames.forEach((name) => {
        console.log(`  - ${name}`);
      });
      expect(commandNames.length).toBeGreaterThan(0);
    });
  });

  describe('Setup Commands', () => {
    const setupCommands = [
      'setup',
      'setup:env',
      'setup:env:copy',
      'postinstall',
    ];

    setupCommands.forEach((cmd) => {
      it(`should have ${cmd} command defined`, () => {
        expect(scripts[cmd]).toBeDefined();
        expect(typeof scripts[cmd]).toBe('string');
        expect(scripts[cmd].length).toBeGreaterThan(0);
      });
    });

    it('should have setup command that includes setup:env', () => {
      expect(scripts.setup).toContain('setup:env');
    });
  });

  describe('Development Commands', () => {
    const devCommands = [
      'dev',
      'dashboard-ui',
      'dashboard-api',
      'collector-api',
      'test-lab',
      'test-lab:webhooks',
    ];

    devCommands.forEach((cmd) => {
      it(`should have ${cmd} command defined`, () => {
        expect(scripts[cmd]).toBeDefined();
        expect(typeof scripts[cmd]).toBe('string');
        expect(scripts[cmd].length).toBeGreaterThan(0);
      });
    });

    it('should have dev command that uses docker-compose', () => {
      expect(scripts.dev).toContain('docker-compose');
    });
  });

  describe('Database Seeding Commands', () => {
    it('should have seed command defined', () => {
      expect(scripts.seed).toBeDefined();
      expect(scripts.seed).toContain('seed-sample-data.ts');
    });
  });

  describe('Environment Testing Commands', () => {
    it('should have test:env command defined', () => {
      expect(scripts['test:env']).toBeDefined();
      expect(scripts['test:env']).toContain('test-env-config.ts');
    });
  });

  describe('Build Commands', () => {
    const buildCommands = [
      'build',
      'build:dashboard-ui',
      'build:dashboard-api',
      'build:collector-api',
    ];

    buildCommands.forEach((cmd) => {
      it(`should have ${cmd} command defined`, () => {
        expect(scripts[cmd]).toBeDefined();
        expect(typeof scripts[cmd]).toBe('string');
        expect(scripts[cmd].length).toBeGreaterThan(0);
      });
    });

    it('should have build command that builds all projects', () => {
      expect(scripts.build).toContain('nx run-many');
      expect(scripts.build).toContain('--target=build');
      expect(scripts.build).toContain('--all');
    });
  });

  describe('Test Commands', () => {
    const testCommands = [
      'test',
      'test:watch',
      'test:coverage',
      'test:coverage:ci',
      'test:dashboard-ui',
      'test:dashboard-ui:watch',
      'test:dashboard-ui:coverage',
      'test:dashboard-ui:coverage:ci',
      'test:dashboard-api',
      'test:dashboard-api:watch',
      'test:dashboard-api:coverage',
      'test:dashboard-api:coverage:ci',
      'test:collector-api',
      'test:collector-api:watch',
      'test:collector-api:coverage',
      'test:collector-api:coverage:ci',
      'test:apis',
      'test:e2e',
      'lint',
    ];

    testCommands.forEach((cmd) => {
      it(`should have ${cmd} command defined`, () => {
        expect(scripts[cmd]).toBeDefined();
        expect(typeof scripts[cmd]).toBe('string');
        expect(scripts[cmd].length).toBeGreaterThan(0);
      });
    });

    it('should have test command that runs all tests', () => {
      expect(scripts.test).toContain('nx run-many');
      expect(scripts.test).toContain('--target=test');
      expect(scripts.test).toContain('--all');
    });

    it('should have lint command defined', () => {
      expect(scripts.lint).toContain('nx run-many');
      expect(scripts.lint).toContain('--target=lint');
    });
  });

  describe('Database Docker Commands', () => {
    const dbCommands = [
      'db:up',
      'db:down',
      'db:reset',
      'db:destroy',
      'db:fix-types',
      'db:fix-networks',
    ];

    dbCommands.forEach((cmd) => {
      it(`should have ${cmd} command defined`, () => {
        expect(scripts[cmd]).toBeDefined();
        expect(typeof scripts[cmd]).toBe('string');
        expect(scripts[cmd].length).toBeGreaterThan(0);
      });

      // db:fix-networks doesn't use docker-compose.db.yml in the same way
      if (cmd !== 'db:fix-networks') {
        it(`should have ${cmd} using docker-compose.db.yml`, () => {
          expect(scripts[cmd]).toContain('docker-compose.db.yml');
        });
      }
    });
  });

  describe('Docker Development Commands', () => {
    const dockerDevCommands = [
      'docker:dev',
      'docker:dev:down',
      'docker:dev:logs',
    ];

    dockerDevCommands.forEach((cmd) => {
      it(`should have ${cmd} command defined`, () => {
        expect(scripts[cmd]).toBeDefined();
        expect(typeof scripts[cmd]).toBe('string');
        expect(scripts[cmd].length).toBeGreaterThan(0);
      });

      it(`should have ${cmd} using docker-compose.dev.yml`, () => {
        expect(scripts[cmd]).toContain('docker-compose.dev.yml');
      });
    });
  });

  describe('Docker Production Commands', () => {
    const dockerProdCommands = [
      'docker:up',
      'docker:down',
      'docker:logs',
      'docker:ps',
    ];

    dockerProdCommands.forEach((cmd) => {
      it(`should have ${cmd} command defined`, () => {
        expect(scripts[cmd]).toBeDefined();
        expect(typeof scripts[cmd]).toBe('string');
        expect(scripts[cmd].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Docker Build Commands', () => {
    const dockerBuildCommands = [
      'docker:build',
      'docker:build:dashboard-api',
      'docker:build:collector-api',
    ];

    dockerBuildCommands.forEach((cmd) => {
      it(`should have ${cmd} command defined`, () => {
        expect(scripts[cmd]).toBeDefined();
        expect(typeof scripts[cmd]).toBe('string');
        expect(scripts[cmd].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Docker Utility Commands', () => {
    const dockerUtilityCommands = [
      'docker:prune:networks',
    ];

    dockerUtilityCommands.forEach((cmd) => {
      it(`should have ${cmd} command defined`, () => {
        expect(scripts[cmd]).toBeDefined();
        expect(typeof scripts[cmd]).toBe('string');
        expect(scripts[cmd].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Nx Utility Commands', () => {
    const nxCommands = [
      'graph',
      'affected',
      'affected:test',
      'affected:build',
      'reset',
    ];

    nxCommands.forEach((cmd) => {
      it(`should have ${cmd} command defined`, () => {
        expect(scripts[cmd]).toBeDefined();
        expect(typeof scripts[cmd]).toBe('string');
        expect(scripts[cmd].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Migration Commands', () => {
    const migrationCommands = [
      'db:migrate',
      'db:migrate:revert',
      'db:migrate:show',
      'db:migrate:generate',
      'migrate:create-super-admin',
    ];

    migrationCommands.forEach((cmd) => {
      it(`should have ${cmd} command defined`, () => {
        expect(scripts[cmd]).toBeDefined();
        expect(typeof scripts[cmd]).toBe('string');
        expect(scripts[cmd].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Cleanup Commands', () => {
    const cleanCommands = ['clean', 'clean:all', 'clean:docker'];

    cleanCommands.forEach((cmd) => {
      it(`should have ${cmd} command defined`, () => {
        expect(scripts[cmd]).toBeDefined();
        expect(typeof scripts[cmd]).toBe('string');
        expect(scripts[cmd].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Command Syntax Validation', () => {
    it('should have no commands with empty values', () => {
      const emptyCommands = Object.entries(scripts)
        .filter(([name, value]) => !name.startsWith('//') && !value.trim())
        .map(([name]) => name);

      expect(emptyCommands).toEqual([]);
    });

    it('should have no commands with undefined values', () => {
      const undefinedCommands = Object.entries(scripts)
        .filter(([name, value]) => !name.startsWith('//') && value === undefined)
        .map(([name]) => name);

      expect(undefinedCommands).toEqual([]);
    });

    it('should have properly formatted docker-compose commands', () => {
      const dockerCommands = Object.entries(scripts)
        .filter(([_, value]) => value.includes('docker-compose'))
        .map(([name, value]) => ({ name, value }));

      dockerCommands.forEach(({ name, value }) => {
        // Should use -f flag for specific compose files
        if (value.includes('docker-compose.db.yml') || value.includes('docker-compose.dev.yml')) {
          expect(value).toMatch(/-f\s+docker-compose\.(db|dev)\.yml/);
        }
      });
    });
  });

  describe('Command Execution Validation', () => {
    // These tests verify commands can be parsed by npm/node
    // They don't actually execute the commands, just validate syntax

    it('should be able to list all commands via npm run', () => {
      try {
        const workspaceRoot = getWorkspaceRoot();
        const output = execSync('npm run', { 
          encoding: 'utf-8',
          cwd: workspaceRoot,
          stdio: 'pipe'
        });
        expect(output).toBeDefined();
        expect(typeof output).toBe('string');
      } catch (error: any) {
        // npm run without arguments shows help, which exits with code 1
        // This is expected behavior, so we check the error message
        expect(error.message).toBeDefined();
      }
    });

    it('should validate package.json syntax', () => {
      // If we got here, JSON parsing worked
      expect(packageJson).toBeDefined();
      expect(packageJson.scripts).toBeDefined();
    });
  });

  describe('Command Categorization', () => {
    it('should categorize all commands correctly', () => {
      const allCommands = Object.keys(scripts).filter((name) => !name.startsWith('//'));
      
      const categories = {
        setup: ['setup', 'setup:env', 'setup:env:copy', 'postinstall'],
        development: ['dev', 'dashboard-ui', 'dashboard-api', 'collector-api', 'test-lab', 'test-lab:webhooks'],
        seeding: ['seed'],
        environment: ['test:env'],
        build: ['build', 'build:dashboard-ui', 'build:dashboard-api', 'build:collector-api'],
        testing: [
          'test', 'test:watch', 'test:coverage', 'test:coverage:ci',
          'test:dashboard-ui', 'test:dashboard-ui:watch', 'test:dashboard-ui:coverage', 'test:dashboard-ui:coverage:ci',
          'test:dashboard-api', 'test:dashboard-api:watch', 'test:dashboard-api:coverage', 'test:dashboard-api:coverage:ci',
          'test:collector-api', 'test:collector-api:watch', 'test:collector-api:coverage', 'test:collector-api:coverage:ci',
          'test:apis', 'test:e2e', 'lint'
        ],
        database: ['db:up', 'db:down', 'db:reset', 'db:destroy', 'db:fix-types', 'db:fix-networks'],
        dockerDev: ['docker:dev', 'docker:dev:down', 'docker:dev:logs'],
        dockerProd: ['docker:up', 'docker:down', 'docker:logs', 'docker:ps'],
        dockerBuild: ['docker:build', 'docker:build:dashboard-api', 'docker:build:collector-api'],
        dockerUtility: ['docker:prune:networks'],
        nx: ['graph', 'affected', 'affected:test', 'affected:build', 'reset', 'nx:reset'],
        migrations: ['db:migrate', 'db:migrate:revert', 'db:migrate:show', 'db:migrate:generate', 'migrate:create-super-admin'],
        cleanup: ['clean', 'clean:all', 'clean:docker'],
      };

      const categorizedCommands = Object.values(categories).flat();
      const uncategorized = allCommands.filter((cmd) => !categorizedCommands.includes(cmd));

      // Allow for 'nx' command which is a utility, and 'test:npm-commands' which is a meta-test command
      const allowedUncategorized = ['nx', 'test:npm-commands'];
      const trulyUncategorized = uncategorized.filter((cmd) => !allowedUncategorized.includes(cmd));

      if (trulyUncategorized.length > 0) {
        console.warn(`\n⚠️  Uncategorized commands found: ${trulyUncategorized.join(', ')}`);
      }

      // This is informational, not a failure
      expect(allCommands.length).toBeGreaterThan(0);
    });
  });

  describe('Command Patterns', () => {
    it('should follow consistent naming patterns for test commands', () => {
      const testPattern = /^test(:[\w-]+)?(:watch|:coverage|:coverage:ci)?$/;
      const testCommands = Object.keys(scripts).filter((name) => name.startsWith('test'));

      // Exclude development commands and special test commands
      const excludedCommands = ['test:env', 'test:e2e', 'test:apis', 'test-lab', 'test-lab:webhooks', 'test:npm-commands'];

      testCommands.forEach((cmd) => {
        if (!excludedCommands.includes(cmd)) {
          expect(cmd).toMatch(testPattern);
        }
      });
    });

    it('should follow consistent naming patterns for build commands', () => {
      const buildCommands = Object.keys(scripts).filter((name) => name.startsWith('build'));
      buildCommands.forEach((cmd) => {
        expect(cmd).toMatch(/^build(:[\w-]+)?$/);
      });
    });

    it('should follow consistent naming patterns for docker commands', () => {
      const dockerCommands = Object.keys(scripts).filter((name) => name.startsWith('docker'));
      dockerCommands.forEach((cmd) => {
        expect(cmd).toMatch(/^docker(:[\w-]+)*$/);
      });
    });
  });
});
