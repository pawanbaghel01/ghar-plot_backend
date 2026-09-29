import admin from "../config/firebase.js";

/**
 * Validates a single FCM token against Firebase servers using dryRun mode.
 * In dryRun mode, Firebase verifies the token is valid and active without delivering any push notification.
 *
 * @param {string} token - FCM registration token to validate
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
export const validateFcmToken = async (token) => {
  if (!token || typeof token !== "string" || !token.trim()) {
    return { valid: false, error: "empty_or_invalid_string" };
  }

  const cleanToken = token.trim();

  // If Firebase Admin SDK is not initialized, fallback to treating token as valid
  if (!admin.apps || !admin.apps.length) {
    return { valid: true, skipped: true };
  }

  // Set a strict 2.5s timeout so network lag never freezes login/token-refresh
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("validation_timeout")), 2500)
  );

  try {
    await Promise.race([
      admin.messaging().send(
        {
          token: cleanToken,
          data: { dryRunPing: "true" },
        },
        true // 🔥 dryRun = true: validates token format & active registration without sending UI notification
      ),
      timeoutPromise,
    ]);
    return { valid: true };
  } catch (error) {
    const errorCode = error?.errorInfo?.code || error?.code;
    if (
      errorCode === "messaging/registration-token-not-registered" ||
      errorCode === "messaging/invalid-registration-token" ||
      errorCode === "messaging/invalid-argument"
    ) {
      return { valid: false, error: errorCode };
    }

    // For transient network errors or timeout, do NOT evict token wrongfully
    return { valid: true, error: error.message };
  }
};

/**
 * Central Token Management Helper for Admin Multi-Device Session.
 * Default max devices: 5.
 *
 * Rules:
 * 1. Matches existing device by deviceId, oldToken, or fcmToken.
 *    -> If matched: updates token, updatedAt, deviceInfo, and lastLogin (if isLoginEvent).
 * 2. If new device and stored count < maxDevices:
 *    -> Adds the new device directly.
 * 3. If new device and stored count >= maxDevices:
 *    -> Validates existing tokens via Firebase dryRun.
 *    -> If any token is expired/invalid: replaces the expired token.
 *    -> If all tokens are active: evicts and replaces the OLDEST device (earliest lastLogin).
 * 4. Sorts fcmTokens strictly descending by lastLogin.
 * 5. Caps fcmTokens at maxDevices (5).
 * 6. Synchronizes primary admin.fcmToken to the latest active device.
 *
 * @param {Object} adminDoc - Mongoose Admin document
 * @param {Object} options
 * @param {string} options.fcmToken - Incoming FCM token
 * @param {string} [options.oldToken] - Previous token if refreshed
 * @param {string} [options.deviceId] - Unique device ID from client
 * @param {string} [options.deviceInfo] - User agent or device model info
 * @param {boolean} [options.isLoginEvent=false] - True if called from actual login endpoint
 * @param {number} [options.maxDevices=5] - Maximum simultaneous logged in devices (default 5)
 * @returns {Promise<Array>} - Updated fcmTokens array
 */
export const manageAdminDeviceTokens = async (
  adminDoc,
  {
    fcmToken,
    oldToken = "",
    deviceId = "",
    deviceInfo = "",
    isLoginEvent = false,
    maxDevices = 5,
  }
) => {
  if (!fcmToken || typeof fcmToken !== "string" || !fcmToken.trim()) {
    return adminDoc.fcmTokens || [];
  }

  const newToken = fcmToken.trim();
  const cleanOldToken = (oldToken || "").trim();
  const currentDeviceId = (deviceId || "").trim();
  const currentDeviceInfo = (deviceInfo || "").trim();

  // Initialize fcmTokens if empty but legacy fcmToken exists
  if ((!adminDoc.fcmTokens || adminDoc.fcmTokens.length === 0) && adminDoc.fcmToken) {
    adminDoc.fcmTokens = [
      {
        token: adminDoc.fcmToken,
        deviceId: "",
        deviceInfo: "",
        lastLogin: adminDoc.updatedAt || new Date(),
        updatedAt: new Date(),
      },
    ];
  }
  if (!adminDoc.fcmTokens) {
    adminDoc.fcmTokens = [];
  }

  // Match existing device
  let matchedIndex = -1;
  if (currentDeviceId) {
    matchedIndex = adminDoc.fcmTokens.findIndex(
      (e) => e.deviceId && e.deviceId === currentDeviceId
    );
  }
  if (matchedIndex === -1 && cleanOldToken) {
    matchedIndex = adminDoc.fcmTokens.findIndex((e) => e.token === cleanOldToken);
  }
  if (matchedIndex === -1) {
    matchedIndex = adminDoc.fcmTokens.findIndex((e) => e.token === newToken);
  }

  if (matchedIndex !== -1) {
    // ----------------------------------------------------
    // Branch 1: Existing Device Update
    // ----------------------------------------------------
    adminDoc.fcmTokens[matchedIndex].token = newToken;
    adminDoc.fcmTokens[matchedIndex].updatedAt = new Date();
    if (currentDeviceId) adminDoc.fcmTokens[matchedIndex].deviceId = currentDeviceId;
    if (currentDeviceInfo) adminDoc.fcmTokens[matchedIndex].deviceInfo = currentDeviceInfo;
    if (isLoginEvent) {
      adminDoc.fcmTokens[matchedIndex].lastLogin = new Date();
    }
    console.log(
      `📱 [TokenHelper] Updated existing device for Admin ${adminDoc.email} (Index: ${matchedIndex}, DeviceId: ${currentDeviceId || "N/A"})`
    );
  } else {
    // ----------------------------------------------------
    // Branch 2: New Device
    // ----------------------------------------------------
    if (adminDoc.fcmTokens.length < maxDevices) {
      // Slot available (< 5) -> Add directly
      adminDoc.fcmTokens.push({
        token: newToken,
        deviceId: currentDeviceId,
        deviceInfo: currentDeviceInfo,
        lastLogin: new Date(),
        updatedAt: new Date(),
      });
      console.log(
        `➕ [TokenHelper] Added new device (${adminDoc.fcmTokens.length}/${maxDevices}) for Admin ${adminDoc.email}`
      );
    } else {
      // Already has maxDevices (5) -> Validate existing to replace expired or oldest
      console.log(
        `🔍 [TokenHelper] Admin ${adminDoc.email} already has ${adminDoc.fcmTokens.length} devices. Validating tokens...`
      );

      const validationResults = await Promise.all(
        adminDoc.fcmTokens.map(async (entry, idx) => {
          const res = await validateFcmToken(entry.token);
          return { index: idx, entry, valid: res.valid, error: res.error };
        })
      );

      const invalidEntries = validationResults.filter((r) => !r.valid);

      if (invalidEntries.length > 0) {
        // Find the oldest expired token among the invalid ones
        invalidEntries.sort(
          (a, b) => new Date(a.entry.lastLogin || 0) - new Date(b.entry.lastLogin || 0)
        );
        const targetIndex = invalidEntries[0].index;
        const deadDevice = adminDoc.fcmTokens[targetIndex];

        console.log(
          `🧹 [TokenHelper] Found expired token (DeviceId: ${deadDevice?.deviceId || "N/A"}, error: ${invalidEntries[0].error}). Replacing with new device.`
        );

        adminDoc.fcmTokens[targetIndex] = {
          token: newToken,
          deviceId: currentDeviceId,
          deviceInfo: currentDeviceInfo,
          lastLogin: new Date(),
          updatedAt: new Date(),
        };
      } else {
        // All active -> Sort descending by lastLogin to find the OLDEST device at the end
        adminDoc.fcmTokens.sort(
          (a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0)
        );

        const oldest = adminDoc.fcmTokens[adminDoc.fcmTokens.length - 1];
        console.log(
          `🔄 [TokenHelper] All ${maxDevices} tokens active. Replacing oldest device (DeviceId: ${oldest.deviceId || "N/A"}, lastLogin: ${new Date(oldest.lastLogin).toISOString()}) with new device.`
        );

        // Evict oldest and add new
        adminDoc.fcmTokens[adminDoc.fcmTokens.length - 1] = {
          token: newToken,
          deviceId: currentDeviceId,
          deviceInfo: currentDeviceInfo,
          lastLogin: new Date(),
          updatedAt: new Date(),
        };
      }
    }
  }

  // Sort strictly by lastLogin descending to keep freshest devices at the top
  adminDoc.fcmTokens.sort(
    (a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0)
  );

  // Cap at maxDevices (5)
  adminDoc.fcmTokens = adminDoc.fcmTokens.slice(0, maxDevices);

  // Synchronize primary fcmToken to latest active device
  adminDoc.fcmToken = adminDoc.fcmTokens.length > 0 ? adminDoc.fcmTokens[0].token : "";

  return adminDoc.fcmTokens;
};
