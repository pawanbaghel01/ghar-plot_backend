import express from "express";
import {
  createClientType,
  getClientTypes,
  getClientTypeById,
  updateClientType,
  deleteClientType,
} from "../controllers/clientTypeController.js";

const router = express.Router();

router.post("/", createClientType);

router.get("/", getClientTypes);

router.get("/:id", getClientTypeById);

router.put("/:id", updateClientType);

router.delete("/:id", deleteClientType);

export default router;