import cron from "node-cron";
import AdminDevice from "../models/adminDeviceSchema.js";
import { validateFcmToken } from "../utils/deviceTokenHelper.js";
import { syncAdminModelFromDevices } from "../controllers/adminDeviceController.js";

/**
 * Scheduled cleanup job for stale and invalid admin devices.
 * Runs once every day at 03:00 AM server time.
 * Policy:
 *  - Devices inactive/unseen for > 30 days: marked inactive (isActive = false).
 *  - Devices inactive/unseen for > 45 days: eligible for cleanup / deletion.
 */
export const initStaleDeviceCleanupCron = () => {
  console.log("⏰ Stale device cleanup cron initialized (daily at 03:00 AM)");

  // Run at 03:00 AM every day
  cron.schedule("0 3 * * *", async () => {
    try {
      console.log("🧹 [StaleDeviceCron] Starting daily stale device maintenance...");
      const now = Date.now();
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
      const fortyFiveDaysAgo = new Date(now - 45 * 24 * 60 * 60 * 1000);

      // 1. Mark devices not seen for > 30 days as inactive
      const markInactiveResult = await AdminDevice.updateMany(
        {
          isActive: true,
          lastSeenAt: { $lt: thirtyDaysAgo },
        },
        { $set: { isActive: false } }
      );
      if (markInactiveResult.modifiedCount > 0) {
        console.log(`🧹 [StaleDeviceCron] Marked ${markInactiveResult.modifiedCount} devices inactive (> 30 days stale)`);
      }

      // 2. Remove devices inactive and unseen for > 45 days
      const cleanupCandidates = await AdminDevice.find({
        isActive: false,
        lastSeenAt: { $lt: fortyFiveDaysAgo },
      });

      const affectedAdminIds = new Set();
      for (const dev of cleanupCandidates) {
        affectedAdminIds.add(dev.userId.toString());
        await AdminDevice.deleteOne({ _id: dev._id });
      }

      if (cleanupCandidates.length > 0) {
        console.log(`🧹 [StaleDeviceCron] Deleted ${cleanupCandidates.length} dead devices (> 45 days stale)`);
      }

      // 3. Proactively validate active device tokens with Firebase dryRun
      const activeDevices = await AdminDevice.find({ isActive: true });
      for (const dev of activeDevices) {
        const check = await validateFcmToken(dev.fcmToken);
        if (!check.valid) {
          console.log(`🧹 [StaleDeviceCron] Deactivating device ${dev._id} due to invalid FCM token: ${check.error}`);
          dev.isActive = false;
          await dev.save();
          affectedAdminIds.add(dev.userId.toString());
        }
      }

      // 4. Synchronize Admin models for all affected admin IDs
      for (const adminId of affectedAdminIds) {
        await syncAdminModelFromDevices(adminId);
      }

      console.log("✅ [StaleDeviceCron] Daily stale device maintenance completed.");
    } catch (err) {
      console.error("❌ [StaleDeviceCron] Error during maintenance:", err.message);
    }
  });
};
