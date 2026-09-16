import express from "express";
import { sendAppUpdateNotification } from "../controllers/updateNotificationController.js";

const router = express.Router();

//  Route to send update notification to all users
router.post("/notify-update", sendAppUpdateNotification);

export default router;
