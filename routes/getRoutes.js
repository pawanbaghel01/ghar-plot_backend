import express from "express";
import {
  getAllProperties,
  getAllOtherProperties,
  getPropertiesByCategory,
  getPropertiesByMainCategory,
  getSubCategoryCounts,
  searchProperties,
} from "../controllers/getControllers.js";
const router = express.Router();
import { verifyToken } from '../middlewares/authMiddleware.js';

// Search properties with dynamic location, price & type filters (limit 5)
router.get("/search", searchProperties);

// Get all properties
router.get("/all", getAllProperties);

// get all properties added by other users
router.get("/allOther", verifyToken, getAllOtherProperties);

// sub-category-based properties
router.get("/category/:category", verifyToken, getPropertiesByCategory);

// main category-based properties[Residential , Commercial]
router.get("/main-category/:mainCategory", getPropertiesByMainCategory);

// Get counts of properties in each sub-category
router.get("/sub-category-counts", getSubCategoryCounts);

export default router;
