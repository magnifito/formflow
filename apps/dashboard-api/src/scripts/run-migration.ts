import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { AddFormSlug1769255116211 } from "../migrations/1769255116211-AddFormSlug";
import path from "path";

// Load env from root
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const dbConfig = {
    type: "postgres" as const,
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USERNAME || process.env.DB_USER || "formflow",
    password: process.env.DB_PASSWORD || process.env.DB_PASS || "formflow",
    database: process.env.DB_NAME || process.env.DB_DATABASE || "formflow",
};

const AppDataSource = new DataSource({
    ...dbConfig,
    synchronize: false,
    migrationsRun: false,
    logging: true,
    entities: [], // No entities needed for this specific raw SQL migration
    migrations: [AddFormSlug1769255116211],
});

async function run() {
    try {
        console.log("Initializing DataSource...");
        await AppDataSource.initialize();
        console.log("DataSource initialized.");

        console.log("Running migrations...");
        await AppDataSource.runMigrations();
        console.log("Migrations complete.");

        await AppDataSource.destroy();
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

run();
