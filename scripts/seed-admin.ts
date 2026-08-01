try {
  process.loadEnvFile(".env");
} catch {
  // Tidak masalah jika .env tidak ada (misalnya di Vercel)
}

import { hashPassword } from "../lib/auth";
import { db } from "../lib/db";
import { users } from "../lib/schema";

// Override for any environment that should not ship with a known password.
const USERNAME = process.env.ADMIN_USERNAME || "admin";
const PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

async function seedAdmin() {
  try {
    console.log("🌱 Starting admin user seed...");

    const existingAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, USERNAME),
    });

    if (existingAdmin) {
      console.log(`✅ User "${USERNAME}" already exists`);
      process.exit(0);
    }

    // Reuse lib/auth.ts so the cost factor matches the one the login route
    // verifies against — this script previously hashed at 10 rounds while
    // lib/auth.ts hashes at 12.
    const hashedPassword = await hashPassword(PASSWORD);

    const [admin] = await db
      .insert(users)
      .values({
        username: USERNAME,
        password: hashedPassword,
        displayName: "Admin User",
        role: "super_admin",
        status: "active",
      })
      .returning();

    console.log("✅ Admin user created successfully");
    console.log(`   Username: ${admin.username}`);
    console.log(
      `   Password: ${PASSWORD === "admin123" ? "admin123 (default — change it)" : "(from ADMIN_PASSWORD)"}`,
    );
    console.log(`   Role: ${admin.role}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding admin user:", error);
    process.exit(1);
  }
}

seedAdmin();
