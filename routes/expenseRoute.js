import express from "express";
import {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseCategories,
  addExpenseCategory,
  getDateExpensesSummary,
  getDailyProjectExpenseSheet,
  createBatchExpenses,
} from "../controllers/expenseController.js";
import { verifyAdminToken } from "../middlewares/adminAuthMiddleware.js";

const router = express.Router();

// Categories routes
router.get("/categories", getExpenseCategories);
router.post("/categories", addExpenseCategory);

// Daily Project Expense Sheet (Single Sheet View for a date grouped by project)
router.get("/daily-sheet", getDailyProjectExpenseSheet);

// Batch create expenses (multiple projects / categories in one go)
router.post("/batch", createBatchExpenses);

// Date summary for cash flow modal & date export
router.get("/date-summary", getDateExpensesSummary);

// CRUD
router.get("/", getAllExpenses);
router.get("/:id", getExpenseById);
router.post("/", createExpense);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

export default router;
