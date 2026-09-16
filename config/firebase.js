import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceAccountPath = path.resolve(__dirname, "../serviceAccountKey.json");

let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === "string"
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : process.env.FIREBASE_SERVICE_ACCOUNT;
  } catch (err) {
    console.error("❌ Error parsing FIREBASE_SERVICE_ACCOUNT environment variable:", err.message);
  }
} else if (existsSync(serviceAccountPath)) {
  try {
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
  } catch (err) {
    console.error("❌ Error reading serviceAccountKey.json:", err.message);
  }
}

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  if (serviceAccount) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("🔥 Firebase Admin initialized successfully!");
    } catch (err) {
      console.error("❌ Firebase Admin initialization error:", err.message);
    }
  } else {
    console.warn("⚠️ Firebase credentials not found. Notifications/Chat FCM may not function until configured.");
  }
}

export default admin;
