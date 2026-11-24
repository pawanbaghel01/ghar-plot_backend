import express from "express";
import {
  getSiteIssues,
  createSiteIssue,
  updateSiteIssue,
  deleteSiteIssue,
  getSiteIssueCategories,
  createSiteIssueCategory,
  deleteSiteIssueCategory,
} from "../controllers/siteIssueController.js";

const router = express.Router();

// Categories routes (Place before parameterized :id routes)
router.get("/categories", getSiteIssueCategories);
router.post("/categories", createSiteIssueCategory);
router.delete("/categories/:id", deleteSiteIssueCategory);

// Site Issues CRUD routes
router.get("/", getSiteIssues);
router.post("/", createSiteIssue);
router.put("/:id", updateSiteIssue);
router.delete("/:id", deleteSiteIssue);

export default router;
