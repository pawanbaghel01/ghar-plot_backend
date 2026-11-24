import express from "express";
import {
  checkIn,
  checkOut,
  getTodayAttendance,
  getEmployeeMonthlyAttendance,
  getAdminMonthlyMatrix,
  regularizeAttendance,
  getShifts,
  createShift,
  updateShift,
  assignShiftToEmployee,
} from "../controllers/attendanceController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ==========================================
// SHIFTS (Admin)
// ==========================================
router.get("/shifts", verifyToken, getShifts);
router.post("/shifts", verifyToken, createShift);
router.put("/shifts/:id", verifyToken, updateShift);
router.put("/assign-shift", verifyToken, assignShiftToEmployee);

// ==========================================
// EMPLOYEE ATTENDANCE
// ==========================================
router.post("/check-in", verifyToken, checkIn);
router.post("/check-out", verifyToken, checkOut);
router.get("/today", verifyToken, getTodayAttendance);
router.get("/my-monthly", verifyToken, getEmployeeMonthlyAttendance);
router.get("/employee/:employeeId/monthly", verifyToken, getEmployeeMonthlyAttendance);

// ==========================================
// ADMIN ATTENDANCE MANAGEMENT
// ==========================================
router.get("/monthly-matrix", verifyToken, getAdminMonthlyMatrix);
router.post("/regularize", verifyToken, regularizeAttendance);

export default router;
