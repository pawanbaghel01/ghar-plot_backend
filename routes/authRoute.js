import express from "express";
import { sendPhoneOtp, verifyPhoneOtp, signup , loginUser, googleLogin } from "../controllers/authControlllers.js";

const router = express.Router();

router.post("/send-phone-otp", sendPhoneOtp);
router.post("/verify-phone-otp", verifyPhoneOtp);
router.post("/signup", signup);
router.post("/complete-registration", signup); // alias for signup
router.post("/login", loginUser);
router.post("/google-login", googleLogin );

export default router;
