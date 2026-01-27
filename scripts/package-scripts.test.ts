import fs from 'fs';
import path from 'path';

describe('Package Scripts', () => {
    it('should have a development environment file', () => {
        // Check for .env.development or .env.development.example as fallback
        const envPath = path.join(__dirname, '..', '.env.development');
        const examplePath = path.join(__dirname, '..', '.env.development.example');
        const exists = fs.existsSync(envPath) || fs.existsSync(examplePath);
        expect(exists).toBe(true);
    });

    it('should have valid typescript configuration for scripts', () => {
        const tsconfigPath = path.join(__dirname, 'tsconfig.json');
        expect(fs.existsSync(tsconfigPath)).toBe(true);
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
        expect(tsconfig.compilerOptions).toBeDefined();
    });
});
