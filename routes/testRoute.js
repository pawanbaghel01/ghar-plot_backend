import express from "express";
import { createTestEmployee } from "../controllers/testController.js";

const router = express.Router();

// Test route to create sample employee
router.get("/create-test-employee", createTestEmployee);

export default router;