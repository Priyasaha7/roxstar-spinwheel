import { connectDB } from "../database";
import { RoleModel } from "../database/models/Role";
import { GameConfigModel } from "../database/models/GameConfig";
import { RoleCode } from "../types/Role";

async function seed() {
  await connectDB();

  // Seed roles
  for (const code of Object.values(RoleCode)) {
    await RoleModel.findOneAndUpdate(
      { code },
      { code, status: true },
      { upsert: true, new: true },
    );
    console.log(`✅ Role seeded: ${code}`);
  }

  // Seed default game config: 70% winner, 20% admin, 10% app
  await GameConfigModel.findOneAndUpdate(
    { isActive: true },
    {
      winnerPercentage: 70,
      adminPercentage: 20,
      appPercentage: 10,
      version: Date.now(),
      isActive: true,
    },
    { upsert: true, new: true },
  );
  console.log("✅ GameConfig seeded: winner=70% admin=20% app=10%");

  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
