import express from "express";
import {getAllProperties, getAllOtherProperties, getPropertiesByCategory, getPropertiesByMainCategory,getSubCategoryCounts } from "../controllers/getControllers.js";
// import { getAllRentProperties } from "../controllers/buyControllers.js";
// import { getSubCategoryCounts } from "../controllers/statsController.js";
const router = express.Router();
import { verifyToken } from '../middlewares/authMiddleware.js';

// Get all properties
router.get("/all", getAllProperties);

// get all properties added by other users
router.get("/allOther", verifyToken,getAllOtherProperties);

//sub-category-based properties
router.get("/category/:category", verifyToken,getPropertiesByCategory);

//main category-based properties[Residential , Commercial]
router.get("/main-category/:mainCategory", getPropertiesByMainCategory);

// Get counts of properties in each sub-category
router.get("/sub-category-counts", getSubCategoryCounts);



export default router;
