import express from "express";
import { boughtProperty, getBoughtPropertiesByUser, getBoughtProperties,deleteBoughtPropertyByAdmin, deleteBoughtPropertyByUser } from "../controllers/boughtPropertyController.js";
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Route to buy a property
router.post("/bought",verifyToken, boughtProperty);
// router.post("/bought", boughtProperty);


// Route to get all bought properties by userId
router.get("/get-bought-properties", verifyToken,getBoughtPropertiesByUser);

// Route to get all bought properties (admin)
router.get("/all-bought-properties", getBoughtProperties);


router.delete("/admin/delete/:id", deleteBoughtPropertyByAdmin);
router.delete("/user/delete/:id", verifyToken, deleteBoughtPropertyByUser);


export default router;
