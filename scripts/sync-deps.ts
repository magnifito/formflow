import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(__dirname, '..');
const APPS_DIR = path.join(ROOT_DIR, 'apps');
const LIBS_DIR = path.join(ROOT_DIR, 'libs');

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const IGNORE_DIRS = ['node_modules', 'dist', '.nx', '.git', 'coverage'];

interface PackageJson {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}

function getFiles(dir: string, allFiles: string[] = []) {
    if (!fs.existsSync(dir)) return allFiles;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (IGNORE_DIRS.includes(file)) continue;
        const name = path.join(dir, file);
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, allFiles);
        } else if (EXTENSIONS.includes(path.extname(name))) {
            allFiles.push(name);
        }
    }
    return allFiles;
}

function extractModules(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf8');
    const modules = new Set<string>();

    // Regular imports
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    // Dynamic imports
    const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;
    // CommonJS require
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) modules.add(match[1]);
    while ((match = dynamicImportRegex.exec(content)) !== null) modules.add(match[1]);
    while ((match = requireRegex.exec(content)) !== null) modules.add(match[1]);

    return Array.from(modules);
}

function isExternalModule(moduleName: string) {
    if (moduleName.startsWith('.')) return false;
    if (moduleName.startsWith('/') || moduleName.startsWith('@formflow/')) return false;

    // Node.js built-ins
    const builtins = [
        'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console', 'constants',
        'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'http2', 'https', 'inspector',
        'module', 'net', 'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring',
        'readline', 'repl', 'stream', 'string_decoder', 'timers', 'tls', 'trace_events',
        'tty', 'url', 'util', 'v8', 'vm', 'worker_threads', 'zlib'
    ];

    if (builtins.includes(moduleName) || builtins.includes(moduleName.replace('node:', ''))) return false;

    return true;
}

function getPackageRoot(moduleName: string) {
    if (moduleName.startsWith('@')) {
        const parts = moduleName.split('/');
        return `${parts[0]}/${parts[1]}`;
    }
    return moduleName.split('/')[0];
}

function getAllDepsFromWorkspace(): Set<string> {
    const allDeps = new Set<string>();

    // Read root package.json
    const rootPkgPath = path.join(ROOT_DIR, 'package.json');
    if (fs.existsSync(rootPkgPath)) {
        const pkg: PackageJson = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
        Object.keys(pkg.dependencies || {}).forEach(d => allDeps.add(d));
        Object.keys(pkg.devDependencies || {}).forEach(d => allDeps.add(d));
    }

    // Read all app package.json files
    if (fs.existsSync(APPS_DIR)) {
        const apps = fs.readdirSync(APPS_DIR);
        for (const app of apps) {
            const appPkgPath = path.join(APPS_DIR, app, 'package.json');
            if (fs.existsSync(appPkgPath)) {
                const pkg: PackageJson = JSON.parse(fs.readFileSync(appPkgPath, 'utf8'));
                Object.keys(pkg.dependencies || {}).forEach(d => allDeps.add(d));
                Object.keys(pkg.devDependencies || {}).forEach(d => allDeps.add(d));
            }
        }
    }

    return allDeps;
}

async function main() {
    console.log('🔍 Scanning for used modules across workspace...');
    const files = [...getFiles(APPS_DIR), ...getFiles(LIBS_DIR)];
    const usedModules = new Set<string>();

    for (const file of files) {
        const modules = extractModules(file);
        for (const mod of modules) {
            if (isExternalModule(mod)) {
                usedModules.add(getPackageRoot(mod));
            }
        }
    }

    console.log(`✅ Found ${usedModules.size} unique external modules in use.`);

    const allDeps = getAllDepsFromWorkspace();
    const missingModules = Array.from(usedModules).filter(mod => !allDeps.has(mod));

    if (missingModules.length === 0) {
        console.log('✨ All used modules are declared in workspace package.json files.');
        return;
    }

    console.log(`\n⚠️  Found ${missingModules.length} missing modules:`);
    console.log(missingModules.join(', '));
    console.log('\n📝 These modules are imported but not declared in any package.json.');
    console.log('   Please add them to the appropriate app\'s package.json:');
    console.log('   - apps/dashboard-api/package.json for API dependencies');
    console.log('   - apps/collector-api/package.json for collector dependencies');
    console.log('   - apps/dashboard-ui/package.json for UI dependencies');
    console.log('   - apps/test-lab/package.json for test-lab dependencies');

    // Exit with error so setup fails if deps are missing
    process.exit(1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
