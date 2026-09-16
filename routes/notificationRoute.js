import express from "express";
import { createNotification, getNotifications, markNotificationAsRead, deleteNotification } from "../controllers/notificationController.js";

const router = express.Router();

//Create Notification (already in your project)
router.post("/create", createNotification);

//  Get Notifications
router.get("/list", getNotifications);


//  Mark Notification as Read
router.patch("/mark-read/:id", markNotificationAsRead);

//  Delete Notification
router.delete("/:id", deleteNotification);


export default router;
