import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });
import mongoose from "mongoose";
import Admin from "../models/adminAuthSchema.js";
import AdminDevice from "../models/adminDeviceSchema.js";
import { validateFcmToken } from "../utils/deviceTokenHelper.js";

/**
 * Migration Script: Migrate existing Admin fcmTokens & fcmToken to AdminDevice collection
 * Features:
 * - Idempotent (can be run multiple times safely)
 * - Deduplicates tokens per admin
 * - Preserves newest valid tokens
 * - Syncs primary legacy fcmToken
 * - Enforces max 5 active devices per admin
 */
export const runMigration = async () => {
  const mongoUri = process.env.MONGO_CONN || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGO_CONN / MONGODB_URI environment variable not found");
  }

  console.log("🚀 Starting AdminDevice Migration...");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }

  const admins = await Admin.find({});
  console.log(`📋 Found ${admins.length} admin accounts to inspect.`);

  let totalMigrated = 0;
  let totalDeduplicated = 0;

  for (const admin of admins) {
    console.log(`\n--------------------------------------------------`);
    console.log(`👤 Processing Admin: ${admin.email} (${admin._id})`);

    const rawTokens = [];

    // Collect all tokens from fcmTokens array
    if (Array.isArray(admin.fcmTokens)) {
      admin.fcmTokens.forEach((entry) => {
        if (entry && entry.token && typeof entry.token === "string" && entry.token.trim()) {
          rawTokens.push({
            token: entry.token.trim(),
            deviceId: (entry.deviceId || "").trim(),
            deviceInfo: (entry.deviceInfo || "").trim(),
            lastLogin: entry.lastLogin ? new Date(entry.lastLogin) : new Date(),
            updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : new Date(),
          });
        }
      });
    }

    // Collect legacy fcmToken if not already present
    if (admin.fcmToken && typeof admin.fcmToken === "string" && admin.fcmToken.trim()) {
      const cleanPrimary = admin.fcmToken.trim();
      if (!rawTokens.some((r) => r.token === cleanPrimary)) {
        rawTokens.push({
          token: cleanPrimary,
          deviceId: "",
          deviceInfo: "Legacy Primary Device",
          lastLogin: admin.updatedAt || new Date(),
          updatedAt: admin.updatedAt || new Date(),
        });
      }
    }

    console.log(`   Found ${rawTokens.length} raw token candidate(s).`);

    // Deduplicate by token: keep the newest lastLogin
    const tokenMap = new Map();
    for (const r of rawTokens) {
      if (!tokenMap.has(r.token)) {
        tokenMap.set(r.token, r);
      } else {
        totalDeduplicated++;
        const existing = tokenMap.get(r.token);
        if (new Date(r.lastLogin) > new Date(existing.lastLogin)) {
          tokenMap.set(r.token, r);
        }
      }
    }

    const uniqueTokens = Array.from(tokenMap.values());
    // Sort descending by lastLogin
    uniqueTokens.sort((a, b) => new Date(b.lastLogin) - new Date(a.lastLogin));
    console.log(`   Unique tokens after de-duplication: ${uniqueTokens.length}`);

    // Insert or update AdminDevice documents
    for (let i = 0; i < uniqueTokens.length; i++) {
      const entry = uniqueTokens[i];
      const isActive = i < 5; // Top 5 freshest tokens active
      const platform = entry.deviceInfo.toLowerCase().includes("android")
        ? "android"
        : entry.deviceInfo.toLowerCase().includes("ios")
        ? "ios"
        : "unknown";

      const installationId = entry.deviceId || `inst_legacy_${entry.token.substring(0, 16)}`;

      await AdminDevice.findOneAndUpdate(
        { userId: admin._id, installationId },
        {
          $set: {
            fcmToken: entry.token,
            platformDeviceId: entry.deviceId,
            platform,
            deviceName: entry.deviceInfo || `${platform} Device`,
            isActive,
            lastLoginAt: entry.lastLogin,
            lastSeenAt: entry.updatedAt,
            tokenUpdatedAt: entry.updatedAt,
          },
        },
        { upsert: true, new: true }
      );
      totalMigrated++;
    }

    // Synchronize legacy Admin document fields
    const topActive = uniqueTokens.slice(0, 5);
    admin.fcmTokens = topActive.map((u) => ({
      token: u.token,
      deviceId: u.deviceId || `inst_legacy_${u.token.substring(0, 16)}`,
      deviceInfo: u.deviceInfo || "Device",
      lastLogin: u.lastLogin,
      updatedAt: u.updatedAt,
    }));
    admin.fcmToken = topActive.length > 0 ? topActive[0].token : "";
    await admin.save();
    console.log(`   ✅ Synced Admin: ${admin.email} (Active devices in fcmTokens: ${admin.fcmTokens.length})`);
  }

  console.log(`\n==================================================`);
  console.log(`🎉 Migration Completed Successfully!`);
  console.log(`   Total device records upserted: ${totalMigrated}`);
  console.log(`   Total duplicate tokens eliminated: ${totalDeduplicated}`);
  console.log(`==================================================\n`);
};

// Execute if run directly from CLI
if (process.argv[1] && process.argv[1].includes("migrateAdminDevices.js")) {
  runMigration()
    .then(() => mongoose.disconnect())
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
