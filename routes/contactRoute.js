import express from "express";
import {
    createContact,
    getAllContacts,
    getMyContacts,
    updateContact,
    deleteContact
} from "../controllers/contactController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Create new inquiry (public)
router.post("/", createContact);

// Get all inquiries (admin)
router.get("/", getAllContacts);

// Get logged-in user's inquiries
router.get("/me", verifyToken, getMyContacts);

// Update logged-in user's inquiry
router.put("/:id", verifyToken, updateContact);

// Delete logged-in user's inquiry
router.delete("/:id", deleteContact);

export default router;
