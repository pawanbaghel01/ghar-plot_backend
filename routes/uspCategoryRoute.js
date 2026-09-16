import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/uspCategoryController.js";

const router = express.Router();

// Create a new category
router.post("/", createCategory);

// Get all categories
router.get("/", getAllCategories);

// Get single category by ID
router.get("/:id", getCategoryById);

// Update category
router.put("/:id", updateCategory);

// Delete category
router.delete("/:id", deleteCategory);

export default router;
