import express from "express";
import { registerAdmin, loginAdmin, adminChangePassword, sendTwoFAOtp, verifyTwoFAOtp, disableTwoFA ,enableTwoFA, getActiveSessions, logoutSession,adminForgetPassword, adminVerifyOtp, adminResetPassword} from "../controllers/adminAuthController.js";
// import { verifyAdminToken } from "../middlewares/adminAuthMiddleware.js";
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Signup
router.post("/signup", registerAdmin);

// Login
router.post("/login", loginAdmin);

// PUT: Admin Change Password (with Auth)
router.put("/admin-change-password", verifyToken, adminChangePassword);
// router.put("/admin-change-password", adminChangePassword);

// Example protected route
// router.get("/me", verifyToken, (req, res) => {
//   res.status(200).json({ admin: req.user });
// });

//2FA
router.post("/send-otp", sendTwoFAOtp);
router.post("/verify-otp", verifyTwoFAOtp);
router.put("/enableTwoFA", verifyToken, enableTwoFA);
router.put("/disableTwoFA", verifyToken, disableTwoFA);

// Get all sessions for logged-in admin
router.get("/sessions", verifyToken, getActiveSessions);

// Logout from a specific session
router.delete("/sessions/:sessionId", verifyToken, logoutSession);

router.post("/forgot-password", adminForgetPassword);
router.post("/verify-otp", adminVerifyOtp);
router.post("/reset-password", adminResetPassword);



export default router;
