import express from "express";
import { verifyAdminToken } from "../middlewares/adminAuthMiddleware.js";
import { verifyEmployeeToken, checkPermission } from "../middlewares/roleMiddleware.js";
import {
  getEmployeeReport,
  getEmployeePerformanceDashboard,
  exportEmployeeReport
} from "../controllers/employeeReportController.js";

const router = express.Router();

// Admin routes - full access to all employee reports
router.get("/all", 
  verifyAdminToken,
  getEmployeeReport
);

router.get("/performance-dashboard",
  verifyAdminToken,
  getEmployeePerformanceDashboard
);

router.get("/export",
  verifyAdminToken,
  exportEmployeeReport
);

// Manager routes - access with proper permissions
router.get("/manager/all",
  verifyEmployeeToken,
  checkPermission("employee_reports", "read"),
  getEmployeeReport
);

router.get("/manager/performance-dashboard",
  verifyEmployeeToken,
  checkPermission("employee_reports", "read"),
  getEmployeePerformanceDashboard
);

router.get("/manager/export",
  verifyEmployeeToken,
  checkPermission("employee_reports", "read"),
  exportEmployeeReport
);

// Employee self-report - employees can view their own reports
router.get("/my-report",
  verifyEmployeeToken,
  async (req, res) => {
    try {
      // Override employeeId with current user's ID for security
      req.query.employeeId = req.employee.id;
      
      // Call the main report function
      const { getEmployeeReport } = await import("../controllers/employeeReportController.js");
      await getEmployeeReport(req, res);
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching your report",
        error: error.message
      });
    }
  }
);

// Get specific employee report (for admin or managers with permission)
router.get("/:employeeId",
  async (req, res, next) => {
    // Check if user is admin or has permission
    const isAdmin = req.headers.authorization && 
                   req.headers.authorization.includes('admin');
    
    if (isAdmin) {
      verifyAdminToken(req, res, next);
    } else {
      verifyEmployeeToken(req, res, () => {
        checkPermission("employee_reports", "read")(req, res, next);
      });
    }
  },
  async (req, res) => {
    try {
      req.query.employeeId = req.params.employeeId;
      
      const { getEmployeeReport } = await import("../controllers/employeeReportController.js");
      await getEmployeeReport(req, res);
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching employee report",
        error: error.message
      });
    }
  }
);

export default router;