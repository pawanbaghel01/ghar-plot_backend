import express from "express";
import { verifyEmployeeToken, checkPermission } from "../middlewares/roleMiddleware.js";
import {
  getAllProperties,
  getAllOtherProperties,
  getSubCategoryCounts
} from "../controllers/getControllers.js";
import { getBoughtProperties } from "../controllers/boughtPropertyController.js";
import { getAllRentProperties } from "../controllers/rentController.js";
import { getRevenueStatus } from "../controllers/revenueController.js";

const router = express.Router();

// Apply employee token verification to all routes
router.use(verifyEmployeeToken);

// Dashboard routes with permission checks
router.get("/properties/all", 
  checkPermission("properties", "read"), 
  getAllProperties
);

router.get("/properties/bought", 
  checkPermission("properties", "read"), 
  getBoughtProperties
);

router.get("/properties/rent", 
  checkPermission("properties", "read"), 
  getAllRentProperties
);

router.get("/properties/recent", 
  checkPermission("properties", "read"), 
  async (req, res) => {
    try {
      // Import and call the recent properties controller
      const { getRecentProperties } = await import("../controllers/recentController.js");
      await getRecentProperties(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching recent properties",
        error: error.message
      });
    }
  }
);

router.get("/subcategory-counts", 
  checkPermission("properties", "read"), 
  getSubCategoryCounts
);

router.get("/revenue", 
  checkPermission("dashboard", "read"), 
  getRevenueStatus
);

// Dashboard stats endpoint
router.get("/stats", 
  checkPermission("dashboard", "read"), 
  async (req, res) => {
    try {
      // Import models directly for stats calculation
      const Property = (await import("../models/addProps.js")).default;
      const BoughtProperty = (await import("../models/buyPropertySchema.js")).default;
      const RentProperty = (await import("../models/addProps.js")).default; // Assuming rent uses same model

      // Get counts directly from database
        const [totalProperties, boughtPropertiesCount, rentPropertiesCount] = await Promise.all([
        Property.countDocuments(),
        BoughtProperty.countDocuments(),
        Property.countDocuments({ type: "rent" }) // Adjust this based on your rent property logic
      ]);      res.json({
        success: true,
        data: {
          totalProperties,
          boughtProperties: boughtPropertiesCount,
          rentProperties: rentPropertiesCount,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching dashboard statistics",
        error: error.message
      });
    }
  }
);

export default router;