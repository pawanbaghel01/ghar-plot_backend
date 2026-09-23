import express from "express";
import {
  generateExport,
  downloadFile,
  exportDirectCSV,
} from "../controllers/exportController.js";

const router = express.Router();

// POST /admin/export/generate - Generate file and return download link
router.post("/generate", generateExport);

// GET /admin/export/file/:id - Download generated file by ID
router.get("/file/:id", downloadFile);

// GET /admin/export/csv - Direct CSV download by type
router.get("/csv", exportDirectCSV);

export default router;
