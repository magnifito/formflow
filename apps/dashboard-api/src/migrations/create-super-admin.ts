/**
 * Create Super Admin Script
 * 
 * This script promotes an existing user to Super Admin status.
 * 
 * Usage: npx ts-node src/migrations/create-super-admin.ts <email>
 * 
 * Example: npx ts-node src/migrations/create-super-admin.ts admin@example.com
 */

import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { User } from "@formflow/shared/entities";

async function createSuperAdmin() {
    const email = process.argv[2];

    if (!email) {
        console.error("Usage: npx ts-node src/migrations/create-super-admin.ts <email>");
        console.error("Example: npx ts-node src/migrations/create-super-admin.ts admin@example.com");
        process.exit(1);
    }

    console.log(`Promoting user ${email} to Super Admin...\n`);

    try {
        await AppDataSource.initialize();
        console.log("Database connected.\n");

        const user = await AppDataSource.manager.findOne(User, {
            where: { email }
        });

        if (!user) {
            console.error(`User with email ${email} not found.`);
            console.log("\nAvailable users:");
            const allUsers = await AppDataSource.manager.find(User, {
                select: ['id', 'email', 'name', 'isSuperAdmin']
            });
            for (const u of allUsers) {
                console.log(`  - ${u.email} (ID: ${u.id}) ${u.isSuperAdmin ? '[SUPER ADMIN]' : ''}`);
            }
            process.exit(1);
        }

        if (user.isSuperAdmin) {
            console.log(`User ${email} is already a Super Admin.`);
        } else {
            user.isSuperAdmin = true;
            await AppDataSource.manager.save(user);
            console.log(`✓ User ${email} has been promoted to Super Admin.`);
        }

        console.log("\nUser details:");
        console.log(`  ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Name: ${user.name || '(not set)'}`);
        console.log(`  Super Admin: ${user.isSuperAdmin}`);
        console.log(`  Organization ID: ${user.organizationId || '(none)'}`);
        console.log(`  Role: ${user.role}`);

    } catch (error) {
        console.error("Failed to create super admin:", error);
        process.exit(1);
    } finally {
        await AppDataSource.destroy();
        console.log("\nDatabase connection closed.");
    }
}

createSuperAdmin()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Unexpected error:", error);
        process.exit(1);
    });
