import express from "express";
import { getRecentProperties, getRecentAllProperties, getFeaturedProperties } from "../controllers/recentController.js";
import { togglePropertyFeatured } from "../controllers/addController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// recently added properties with optional limit
router.get("/recent", getRecentProperties);

// recently added properties excluding user's own with optional limit
router.get("/recent/all", getRecentAllProperties);

// dedicated featured properties endpoint
router.get("/featured", getFeaturedProperties);

// toggle featured status by property ID
router.put("/toggle-featured/:id", togglePropertyFeatured);
router.patch("/:id/toggle-featured", togglePropertyFeatured);

export default router;
