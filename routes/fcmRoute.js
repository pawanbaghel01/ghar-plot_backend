import express from "express";
import { saveToken, saveEmployeeToken, saveAdminToken } from "../controllers/fcmController.js";
import admin from "../config/firebase.js";

const router = express.Router();

//  Route to save FCM token for users
router.post("/save-token", saveToken);

//  Route to save FCM token for employees
router.post("/save-employee-token", saveEmployeeToken);

//  Route to save FCM token for admins
router.post("/save-admin-token", saveAdminToken);

export default router;
