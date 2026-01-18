import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

let envLoaded = false;

const getEnvAliases = (nodeEnv: string): string[] => {
  if (nodeEnv === "development") return ["development", "dev"];
  if (nodeEnv === "production") return ["production", "prod"];
  if (nodeEnv === "test") return ["test"];
  return [nodeEnv];
};

const getSearchRoots = (): string[] => {
  const roots: string[] = [];
  let current = process.cwd();
  for (let i = 0; i < 5; i += 1) {
    roots.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return roots;
};

const findEnvFile = (names: string[], roots: string[]): string | null => {
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

export const loadEnv = (): void => {
  if (envLoaded) return;

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

export const getEnv = (key: string): string | undefined => {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return undefined;
  }
  return value;
};
