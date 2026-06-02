import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL not found in environment");
  process.exit(1);
}

// Parse mysql connection URL
const url = new URL(dbUrl);
const conn = await createConnection({
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

// Get all Appetizer items
const [rows] = await conn.execute(
  `SELECT ci.cloverId, ci.name, ci.customImageUrl
   FROM clover_items ci
   JOIN clover_item_categories cic ON ci.cloverId = cic.itemCloverId
   WHERE cic.categoryCloverId = 'Q6173SZ5Y0QDT'
   ORDER BY ci.name`
);

console.log("=== Appetizer Items ===");
for (const row of rows) {
  console.log(`${row.cloverId} | ${row.name} | ${row.customImageUrl || "(no image)"}`);
}

// Image mapping: keyword patterns -> CDN URL
const IMAGE_MAP = [
  { keywords: ["breaded mushroom", "mushroom"], url: "/manus-storage/app_breaded_mushrooms_fec79207.webp" },
  { keywords: ["cheese quesadilla"], url: "/manus-storage/app_cheese_quesadilla_ccb43738.webp" },
  { keywords: ["chicken quesadilla"], url: "/manus-storage/app_chicken_quesadilla_15724843.webp" },
  { keywords: ["cheese bread stick", "breadstick", "bread stick"], url: "/manus-storage/app_cheese_bread_sticks_f7da87e8.webp" },
  { keywords: ["french fries", "fries"], url: "/manus-storage/app_french_fries_3c6b7e10.webp" },
  { keywords: ["garlic ball", "garlic knot"], url: "/manus-storage/app_garlic_balls_d6ca8f36.webp" },
  { keywords: ["onion ring"], url: "/manus-storage/app_onion_rings_efa8019b.webp" },
  { keywords: ["zucchini stick", "zucchini"], url: "/manus-storage/app_zucchini_sticks_11cd76ee.png" },
];

function findImageUrl(itemName) {
  const lower = itemName.toLowerCase();
  for (const mapping of IMAGE_MAP) {
    for (const kw of mapping.keywords) {
      if (lower.includes(kw)) return mapping.url;
    }
  }
  return null;
}

console.log("\n=== Updating Images ===");
let updated = 0;
let skipped = 0;

for (const row of rows) {
  const imageUrl = findImageUrl(row.name);
  if (imageUrl) {
    await conn.execute(
      `UPDATE clover_items SET customImageUrl = ?, customImageKey = ? WHERE cloverId = ?`,
      [imageUrl, imageUrl.replace("/manus-storage/", ""), row.cloverId]
    );
    console.log(`✓ Updated: ${row.name} → ${imageUrl}`);
    updated++;
  } else {
    console.log(`- Skipped: ${row.name} (no matching image)`);
    skipped++;
  }
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
await conn.end();
