import express from "express";
import { getAllRentProperties, getMyRentProperties, getOtherRentProperties } from "../controllers/rentController.js";
import { verifyToken } from '../middlewares/authMiddleware.js';


const router = express.Router();

// Get all properties with purpose = Rent/Lease
router.get('/rent', getAllRentProperties);

// Get Rent/Lease properties added by logged-in user
router.get('/my-rent', verifyToken, getMyRentProperties);

router.get('/other-rent', verifyToken, getOtherRentProperties);

export default router;