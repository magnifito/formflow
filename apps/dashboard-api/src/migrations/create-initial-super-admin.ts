/**
 * Create Initial Super Admin Script
 *
 * This script creates the first super admin user using environment variables.
 * This should only be run ONCE during initial system setup.
 *
 * Required Environment Variables:
 * - SUPER_ADMIN_EMAIL: Email for the super admin account
 * - SUPER_ADMIN_PASSWORD: Password for the super admin account
 * - SUPER_ADMIN_NAME: (Optional) Name for the super admin
 *
 * Usage: npx ts-node src/migrations/create-initial-super-admin.ts
 */

import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { User } from "@formflow/shared/entities";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";

// Load .env from root directory
// Use process.cwd() which is more reliable in ts-node context
dotenv.config(); // Try current directory
dotenv.config({ path: path.join(process.cwd(), '.env') }); // Try from cwd (apps/dashboard-api)
dotenv.config({ path: path.join(process.cwd(), '../.env') }); // Try monorepo root

const BCRYPT_ROUNDS = 10;

async function createInitialSuperAdmin() {
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;
    const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

    // Validation
    if (!email || !password) {
        console.error("\n❌ Error: Missing required environment variables.");
        console.error("\nRequired environment variables:");
        console.error("  - SUPER_ADMIN_EMAIL");
        console.error("  - SUPER_ADMIN_PASSWORD");
        console.error("  - SUPER_ADMIN_NAME (optional)");
        console.error("\nPlease add these to your .env file and try again.\n");
        process.exit(1);
    }

    if (password.length < 8) {
        console.error("\n❌ Error: SUPER_ADMIN_PASSWORD must be at least 8 characters.\n");
        process.exit(1);
    }

    console.log(`\nCreating initial Super Admin user...\n`);
    console.log(`  Email: ${email}`);
    console.log(`  Name: ${name}\n`);

    try {
        await AppDataSource.initialize();
        console.log("✓ Database connected.\n");

        // Check if super admin already exists
        const existingSuperAdmin = await AppDataSource.manager.findOne(User, {
            where: { isSuperAdmin: true }
        });

        if (existingSuperAdmin) {
            console.log("⚠️  A super admin user already exists:");
            console.log(`    Email: ${existingSuperAdmin.email}`);
            console.log(`    Name: ${existingSuperAdmin.name || '(not set)'}`);
            console.log("\nNo action taken. Use the existing super admin or manually update the database.\n");
            process.exit(0);
        }

        // Check if user with this email exists
        const existingUser = await AppDataSource.manager.findOne(User, {
            where: { email }
        });

        if (existingUser) {
            console.log(`⚠️  User with email ${email} already exists. Promoting to Super Admin...\n`);
            existingUser.isSuperAdmin = true;
            await AppDataSource.manager.save(existingUser);
            console.log(`✓ User ${email} has been promoted to Super Admin.\n`);
        } else {
            // Create new super admin user
            const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

            const superAdmin = AppDataSource.manager.create(User, {
                email,
                passwordHash,
                name,
                organizationId: null, // Super admins don't belong to an organization
                role: 'member', // Role doesn't matter for super admins
                isSuperAdmin: true
            });

            await AppDataSource.manager.save(superAdmin);
            console.log(`✓ Super Admin user created successfully!\n`);
        }

        console.log("User details:");
        const finalUser = await AppDataSource.manager.findOne(User, { where: { email } });
        console.log(`  ID: ${finalUser!.id}`);
        console.log(`  Email: ${finalUser!.email}`);
        console.log(`  Name: ${finalUser!.name}`);
        console.log(`  Super Admin: ${finalUser!.isSuperAdmin}`);
        console.log(`  Organization: ${finalUser!.organizationId || 'None (system-wide access)'}`);
        console.log("\n✓ Setup complete! You can now log in with these credentials.\n");

    } catch (error) {
        console.error("\n❌ Failed to create super admin:", error);
        process.exit(1);
    } finally {
        await AppDataSource.destroy();
    }
}

createInitialSuperAdmin()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Unexpected error:", error);
        process.exit(1);
    });
