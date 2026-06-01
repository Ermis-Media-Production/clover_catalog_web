import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { coupons } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(conn);

// Check if CASA98 already exists
const existing = await db.select().from(coupons).where(eq(coupons.code, "CASA98")).limit(1);

if (existing.length > 0) {
  console.log("✅ CASA98 coupon already exists:", existing[0]);
} else {
  await db.insert(coupons).values({
    code: "CASA98",
    description: "98% discount — Casa de Pizza & Wings special",
    discountType: "percentage",
    discountValue: 98,
    active: true,
    maxUses: null,
    expiresAt: null,
  });
  console.log("✅ CASA98 coupon created successfully (98% off)");
}

await conn.end();
