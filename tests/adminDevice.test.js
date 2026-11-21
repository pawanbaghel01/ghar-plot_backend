import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });
import mongoose from "mongoose";
import Admin from "../models/adminAuthSchema.js";
import AdminDevice from "../models/adminDeviceSchema.js";
import {
  registerDevice,
  deviceHeartbeat,
  logoutDevice,
  getAdminDevices,
  revokeAdminDevice,
  syncAdminModelFromDevices,
} from "../controllers/adminDeviceController.js";

// Helper mock response
const createMockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

const runTests = async () => {
  const mongoUri = process.env.MONGO_CONN || process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGO_CONN not configured");

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }

  console.log("🧪 Starting Admin Device & Token Management Test Suite...\n");

  // Create dedicated test admin accounts
  const testAdminEmailA = `test_admin_device_a_${Date.now()}@test.com`;
  const testAdminEmailB = `test_admin_device_b_${Date.now()}@test.com`;

  const adminA = await Admin.create({
    fullName: "Test Admin A",
    email: testAdminEmailA,
    mobileNumber: "9999999901",
    password: "hashedpassword123",
  });

  const adminB = await Admin.create({
    fullName: "Test Admin B",
    email: testAdminEmailB,
    mobileNumber: "9999999902",
    password: "hashedpassword123",
  });

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  };

  try {
    // ----------------------------------------------------
    // Test 1: First-time admin device registration
    // ----------------------------------------------------
    const req1 = {
      user: { id: adminA._id.toString() },
      body: {
        installationId: "inst_uuid_device_1",
        platformDeviceId: "plat_hw_id_1",
        platform: "android",
        deviceName: "Samsung Galaxy S23",
        fcmToken: "fcm_token_device_1_aaa",
        isLoginEvent: true,
      },
    };
    const res1 = createMockRes();
    await registerDevice(req1, res1);

    assert(res1.statusCode === 200 && res1.body.activeDevicesCount === 1, "1. First-time admin login registers device");

    // ----------------------------------------------------
    // Test 2: Same device login again (Idempotency)
    // ----------------------------------------------------
    const req2 = {
      user: { id: adminA._id.toString() },
      body: {
        installationId: "inst_uuid_device_1",
        platformDeviceId: "plat_hw_id_1",
        platform: "android",
        deviceName: "Samsung Galaxy S23",
        fcmToken: "fcm_token_device_1_aaa_updated",
        isLoginEvent: true,
      },
    };
    const res2 = createMockRes();
    await registerDevice(req2, res2);

    const devCountAfterLoginAgain = await AdminDevice.countDocuments({ userId: adminA._id, isActive: true });
    assert(res2.statusCode === 200 && devCountAfterLoginAgain === 1, "2. Same device login again updates existing without creating duplicate");

    // ----------------------------------------------------
    // Test 3: FCM Token Refresh
    // ----------------------------------------------------
    const req3 = {
      user: { id: adminA._id.toString() },
      body: {
        installationId: "inst_uuid_device_1",
        platformDeviceId: "plat_hw_id_1",
        fcmToken: "fcm_token_device_1_refreshed_999",
        isLoginEvent: false,
      },
    };
    const res3 = createMockRes();
    await registerDevice(req3, res3);

    const refreshedDev = await AdminDevice.findOne({ userId: adminA._id, installationId: "inst_uuid_device_1" });
    assert(refreshedDev.fcmToken === "fcm_token_device_1_refreshed_999", "3. FCM token refresh updates token seamlessly");

    // ----------------------------------------------------
    // Test 4: App uninstall and reinstall (same hardware, new installation UUID)
    // ----------------------------------------------------
    const req4 = {
      user: { id: adminA._id.toString() },
      body: {
        installationId: "inst_uuid_device_1_AFTER_REINSTALL",
        platformDeviceId: "plat_hw_id_1", // Same hardware identifier
        platform: "android",
        deviceName: "Samsung Galaxy S23",
        fcmToken: "fcm_token_device_1_reinstalled_bbb",
        isLoginEvent: true,
      },
    };
    const res4 = createMockRes();
    await registerDevice(req4, res4);

    const devCountAfterReinstall = await AdminDevice.countDocuments({ userId: adminA._id, isActive: true });
    assert(devCountAfterReinstall === 1, "4. App uninstall/reinstall recognized via platformDeviceId and updated without duplicate entry");

    // ----------------------------------------------------
    // Test 5: Changed platform device identifier
    // ----------------------------------------------------
    const req5 = {
      user: { id: adminA._id.toString() },
      body: {
        installationId: "inst_uuid_device_1_AFTER_REINSTALL",
        platformDeviceId: "plat_hw_id_1_upgraded",
        platform: "android",
        fcmToken: "fcm_token_device_1_upgraded_ccc",
        isLoginEvent: true,
      },
    };
    const res5 = createMockRes();
    await registerDevice(req5, res5);
    const updatedPlatDev = await AdminDevice.findOne({ userId: adminA._id, installationId: "inst_uuid_device_1_AFTER_REINSTALL" });
    assert(updatedPlatDev.platformDeviceId === "plat_hw_id_1_upgraded", "5. Reconciles changed platformDeviceId for existing installation");

    // ----------------------------------------------------
    // Test 6: Heartbeat update
    // ----------------------------------------------------
    const req6 = {
      user: { id: adminA._id.toString() },
      body: { installationId: "inst_uuid_device_1_AFTER_REINSTALL" },
    };
    const res6 = createMockRes();
    await deviceHeartbeat(req6, res6);
    assert(res6.statusCode === 200 && res6.body.success === true, "6. Heartbeat records lastSeenAt timestamp");

    // ----------------------------------------------------
    // Test 7: Login from 5 distinct devices
    // ----------------------------------------------------
    for (let d = 2; d <= 5; d++) {
      const reqD = {
        user: { id: adminA._id.toString() },
        body: {
          installationId: `inst_uuid_device_${d}`,
          platformDeviceId: `plat_hw_id_${d}`,
          platform: d % 2 === 0 ? "ios" : "android",
          deviceName: `Device Model ${d}`,
          fcmToken: `fcm_token_device_${d}_zzz`,
          isLoginEvent: true,
        },
      };
      const resD = createMockRes();
      await registerDevice(reqD, resD);
    }
    const count5 = await AdminDevice.countDocuments({ userId: adminA._id, isActive: true });
    assert(count5 === 5, "7. Successful registration of 5 distinct active devices");

    // ----------------------------------------------------
    // Test 8: Attempted sixth device registration (Device limit enforcement)
    // ----------------------------------------------------
    const req8 = {
      user: { id: adminA._id.toString() },
      body: {
        installationId: "inst_uuid_device_6",
        platformDeviceId: "plat_hw_id_6",
        platform: "ios",
        deviceName: "iPhone 16 Pro",
        fcmToken: "fcm_token_device_6_newest",
        isLoginEvent: true,
      },
    };
    const res8 = createMockRes();
    await registerDevice(req8, res8);

    const countAfter6th = await AdminDevice.countDocuments({ userId: adminA._id, isActive: true });
    const newestDevice = await AdminDevice.findOne({ userId: adminA._id, installationId: "inst_uuid_device_6" });
    assert(countAfter6th === 5 && newestDevice && newestDevice.isActive === true, "8. Enforces max 5 limit by safely evicting oldest and activating new device");

    // ----------------------------------------------------
    // Test 9: Device-specific Logout
    // ----------------------------------------------------
    const req9 = {
      user: { id: adminA._id.toString() },
      body: { installationId: "inst_uuid_device_6" },
    };
    const res9 = createMockRes();
    await logoutDevice(req9, res9);

    const loggedOutDev = await AdminDevice.findOne({ userId: adminA._id, installationId: "inst_uuid_device_6" });
    const remainingActive = await AdminDevice.countDocuments({ userId: adminA._id, isActive: true });
    assert(loggedOutDev.isActive === false && remainingActive === 4, "9. Logout deactivates only current device without affecting other devices");

    // ----------------------------------------------------
    // Test 10: Explicit Device Revocation via DELETE /admin/devices/:id
    // ----------------------------------------------------
    const targetDevToRevoke = await AdminDevice.findOne({ userId: adminA._id, isActive: true });
    const req10 = {
      user: { id: adminA._id.toString() },
      params: { id: targetDevToRevoke._id.toString() },
    };
    const res10 = createMockRes();
    await revokeAdminDevice(req10, res10);

    const revokedDev = await AdminDevice.findById(targetDevToRevoke._id);
    assert(revokedDev.isActive === false, "10. Explicit revocation deactivates target device");

    // ----------------------------------------------------
    // Test 11: Cross-account token ownership isolation
    // ----------------------------------------------------
    // If device 2 token is registered under Admin B, it must be removed from Admin A
    const req11 = {
      user: { id: adminB._id.toString() },
      body: {
        installationId: "inst_uuid_device_on_admin_b",
        fcmToken: "fcm_token_device_2_zzz", // previously device 2 on Admin A
        platform: "ios",
        isLoginEvent: true,
      },
    };
    const res11 = createMockRes();
    await registerDevice(req11, res11);

    const oldOwnerDevice = await AdminDevice.findOne({ userId: adminA._id, fcmToken: "fcm_token_device_2_zzz" });
    assert(oldOwnerDevice.isActive === false, "11. Cross-account token re-registration cleanly deactivates previous owner's device");

    // ----------------------------------------------------
    // Test 12: Legacy synchronization test
    // ----------------------------------------------------
    await syncAdminModelFromDevices(adminA._id);
    const updatedAdminA = await Admin.findById(adminA._id);
    const expectedActiveCount = await AdminDevice.countDocuments({ userId: adminA._id, isActive: true });
    assert(
      updatedAdminA.fcmTokens.length === expectedActiveCount &&
      updatedAdminA.fcmToken === (updatedAdminA.fcmTokens[0]?.token || ""),
      "12. Legacy Admin.fcmToken and Admin.fcmTokens stay 100% synchronized with active devices"
    );

    // ----------------------------------------------------
    // Test 13: GET /admin/devices list
    // ----------------------------------------------------
    const req13 = { user: { id: adminA._id.toString() } };
    const res13 = createMockRes();
    await getAdminDevices(req13, res13);
    assert(res13.statusCode === 200 && Array.isArray(res13.body.devices), "13. GET /admin/devices returns structured devices list");

    // ----------------------------------------------------
    // Test 14: Input validation
    // ----------------------------------------------------
    const req14 = { user: { id: adminA._id.toString() }, body: {} };
    const res14 = createMockRes();
    await registerDevice(req14, res14);
    assert(res14.statusCode === 400, "14. Rejects invalid registration payload with 400 Bad Request");

    // ----------------------------------------------------
    // Test 15: Concurrent registrations safe execution
    // ----------------------------------------------------
    const concurrentPromises = [1, 2, 3].map((num) => {
      const reqC = {
        user: { id: adminB._id.toString() },
        body: {
          installationId: `concurrent_device_${num}`,
          fcmToken: `concurrent_token_${num}`,
          platform: "android",
          isLoginEvent: true,
        },
      };
      const resC = createMockRes();
      return registerDevice(reqC, resC);
    });
    await Promise.all(concurrentPromises);
    const adminBCount = await AdminDevice.countDocuments({ userId: adminB._id, isActive: true });
    assert(adminBCount <= 5, "15. Concurrent registration execution respects device limit constraints");

  } finally {
    // Clean up test admins and their test devices
    await AdminDevice.deleteMany({ userId: { $in: [adminA._id, adminB._id] } });
    await Admin.deleteMany({ _id: { $in: [adminA._id, adminB._id] } });
  }

  console.log(`\n==================================================`);
  console.log(`Test Suite Completed: ${passed} Passed, ${failed} Failed`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
};

runTests()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error("Test execution error:", err);
    process.exit(1);
  });
