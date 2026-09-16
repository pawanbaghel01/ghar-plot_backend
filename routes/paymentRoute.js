import express from "express";
import { createOrder, verifyPayment } from "../controllers/paymentController.js";

const router = express.Router();

//  Create Razorpay order
router.post("/create-order", createOrder);

//  Verify payment signature
router.post("/verify", verifyPayment);

export default router;
