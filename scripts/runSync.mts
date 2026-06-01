import { runCloverSync } from "../server/cloverSync";

console.log("Starting Clover sync...");
const result = await runCloverSync();
console.log("Sync complete:", JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);
