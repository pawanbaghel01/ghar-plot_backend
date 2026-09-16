import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { addInquiry, deleteInquiry,getEnquiries, createManualInquiry, getAllManualInquiries, getManualInquiryById, updateManualInquiry, deleteManualInquiry, addCommentToInquiry, getInquiryComments } from "../controllers/inquiryController.js";

const router = express.Router();

// Add inquiry
router.post("/add", verifyToken, addInquiry);

router.get("/get-enquiries", getEnquiries);

// Delete inquiry
router.delete("/delete/:id", verifyToken, deleteInquiry);

// Add comment to inquiry
router.post("/comment/:id", addCommentToInquiry);

// Get comments for inquiry
router.get("/comment/:id", getInquiryComments);

//  Create
router.post("/create", createManualInquiry);

//  Get All
router.get("/all", getAllManualInquiries);

//  Get by ID
router.get("/:id", getManualInquiryById);

//  Update
router.put("/update/:id", updateManualInquiry);

//  Delete
router.delete("/delete/:id", deleteManualInquiry);

export default router;
