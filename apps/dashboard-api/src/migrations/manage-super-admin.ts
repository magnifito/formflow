/**
 * Manage Super Admin Script
 *
 * This script provides a unified way to manage super admin users:
 * 1. AUTOMATED: Running without arguments uses SUPER_ADMIN_* ENV variables to seed the first admin.
 * 2. MANUAL: Running with an email argument promotes an existing user to Super Admin.
 *
 * Usage (Automated): npx ts-node src/migrations/manage-super-admin.ts
 * Usage (Manual):    npx ts-node src/migrations/manage-super-admin.ts admin@formflow.fyi
 */

import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { User } from "@formflow/shared/entities";
import { getEnv, loadEnv } from "@formflow/shared/env";
import bcrypt from "bcrypt";

loadEnv();

const BCRYPT_ROUNDS = 10;

async function manageSuperAdmin() {
    const emailArg = process.argv[2];
    let targetEmail = emailArg;
    const isAutomated = !emailArg;

    if (isAutomated) {
        targetEmail = getEnv("SUPER_ADMIN_EMAIL") || "";
    }

    if (!targetEmail) {
        console.error("\n❌ Error: No email provided and SUPER_ADMIN_EMAIL not set.");
        console.log("\nUsage:");
        console.log("  For automated setup: set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in .env");
        console.log("  For manual promotion: npx ts-node manage-super-admin.ts <email>");
        process.exit(1);
    }

    try {
        await AppDataSource.initialize();
        console.log("✓ Database connected.\n");

        const user = await AppDataSource.manager.findOne(User, {
            where: { email: targetEmail }
        });

        if (user) {
            if (user.isSuperAdmin) {
                console.log(`⚠️  User ${targetEmail} is already a Super Admin. No action taken.`);
            } else {
                console.log(`✓ Promoting existing user ${targetEmail} to Super Admin...`);
                user.isSuperAdmin = true;
                await AppDataSource.manager.save(user);
                console.log(`✓ Promotion complete.`);
            }
        } else if (isAutomated) {
            console.log(`Creating initial Super Admin user for ${targetEmail}...`);
            const password = getEnv("SUPER_ADMIN_PASSWORD");
            const name = getEnv("SUPER_ADMIN_NAME") || 'Super Admin';

            if (!password) {
                console.error("❌ Error: SUPER_ADMIN_PASSWORD is required for initial setup.");
                process.exit(1);
            }

            const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
            const superAdmin = AppDataSource.manager.create(User, {
                email: targetEmail,
                passwordHash,
                name,
                isSuperAdmin: true,
                isActive: true,
                role: 'member'
            });

            await AppDataSource.manager.save(superAdmin);
            console.log(`✓ Super Admin user created successfully!`);
        } else {
            console.error(`❌ Error: User with email ${targetEmail} not found. Use the automated setup to create a user.`);
            process.exit(1);
        }

        const finalUser = await AppDataSource.manager.findOne(User, { where: { email: targetEmail } });
        console.log("\nFinal User Details:");
        console.log(`  Email: ${finalUser!.email}`);
        console.log(`  Super Admin: ${finalUser!.isSuperAdmin ? 'YES' : 'NO'}`);
        console.log(`  Organization: ${finalUser!.organizationId || 'None (System Admin)'}`);

    } catch (error) {
        console.error("\n❌ Operation failed:", error);
        process.exit(1);
    } finally {
        await AppDataSource.destroy();
    }
}

manageSuperAdmin()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Unexpected error:", error);
        process.exit(1);
    });
