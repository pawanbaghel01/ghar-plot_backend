import express from "express";
import { getOrCreateChat, sendMessage, getMessages, deleteChat, getChatHistory } from "../controllers/chatController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/get-or-create", verifyToken, getOrCreateChat);
router.post("/send", verifyToken, sendMessage);
router.get("/:chatId/messages", verifyToken, getMessages);
router.get("/history/list", verifyToken, getChatHistory);
router.delete("/:chatId", verifyToken, deleteChat);

export default router;
