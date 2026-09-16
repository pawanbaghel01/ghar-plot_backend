import express from "express";
import {
  addEmployeeByID,
  addEmployeeManually,
  getAllUSPEmployees,
  getEmployeesByCategory,
  getUSPEmployeeById,
  updateUSPEmployee,
  deleteUSPEmployee,
  getCategoriesWithCount,
} from "../controllers/uspEmployeeController.js";

const router = express.Router();

// Add employee to category by employee ID
router.post("/add-by-id", addEmployeeByID);

// Add employee manually to category
router.post("/add-manually", addEmployeeManually);

// Get all USP employees
router.get("/", getAllUSPEmployees);

// Get categories with employee count
router.get("/categories-with-count", getCategoriesWithCount);

// Get employees by category
router.get("/category/:categoryId", getEmployeesByCategory);

// Get single USP employee by ID
router.get("/:id", getUSPEmployeeById);

// Update USP employee
router.put("/:id", updateUSPEmployee);

// Delete employee from category
router.delete("/:id", deleteUSPEmployee);

export default router;
