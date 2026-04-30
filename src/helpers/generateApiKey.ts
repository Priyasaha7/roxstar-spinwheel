import crypto from "crypto";
import ApiKeyRepo from "../database/repositories/ApiKeyRepo";
import { Permission } from "../types/permissions";
import { connectDB } from "../database";

async function createApiKey() {
  const key = crypto.randomBytes(32).toString("hex");
  await ApiKeyRepo.create(key, ["Default API Key"], [Permission.GENERAL]);
  console.log(
    "\n✅ API Key created. Add this to your requests as x-api-key header:",
  );
  console.log(key);
  process.exit(0);
}

connectDB()
  .then(createApiKey)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
