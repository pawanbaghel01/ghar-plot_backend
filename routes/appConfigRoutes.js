import express from "express";
import {
  createAppConfig,
  getAppConfig,
  updateAppConfig,
} from "../controllers/appconfigController.js";

const router = express.Router();

router.post("/", createAppConfig);
router.get("/", getAppConfig);
router.put("/:platform", updateAppConfig);

export default router;