"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnv = exports.loadEnv = void 0;
const tslib_1 = require("tslib");
const dotenv = tslib_1.__importStar(require("dotenv"));
const fs = tslib_1.__importStar(require("fs"));
const path = tslib_1.__importStar(require("path"));
let envLoaded = false;
const getEnvAliases = (nodeEnv) => {
    if (nodeEnv === "development")
        return ["development", "dev"];
    if (nodeEnv === "production")
        return ["production", "prod"];
    if (nodeEnv === "test")
        return ["test"];
    return [nodeEnv];
};
const getSearchRoots = () => {
    const roots = [];
    let current = process.cwd();
    for (let i = 0; i < 5; i += 1) {
        roots.push(current);
        const parent = path.dirname(current);
        if (parent === current)
            break;
        current = parent;
    }
    return roots;
};
const findEnvFile = (names, roots) => {
    for (const root of roots) {
        for (const name of names) {
            const candidate = path.join(root, name);
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }
    }
    return null;
};
const loadEnv = () => {
    if (envLoaded)
        return;
    const nodeEnv = process.env.NODE_ENV || "development";
    const aliases = getEnvAliases(nodeEnv).map((alias) => `.env.${alias}`);
    const roots = getSearchRoots();
    const envPath = findEnvFile(aliases, roots);
    if (envPath) {
        dotenv.config({ path: envPath });
    }
    const basePath = findEnvFile([".env"], roots);
    if (basePath) {
        dotenv.config({ path: basePath });
    }
    envLoaded = true;
};
exports.loadEnv = loadEnv;
const getEnv = (key) => {
    const value = process.env[key];
    if (value === undefined || value === "") {
        return undefined;
    }
    return value;
};
exports.getEnv = getEnv;
//# sourceMappingURL=index.js.map