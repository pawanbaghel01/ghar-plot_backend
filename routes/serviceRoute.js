import express from "express";
import {
  addService,
  getAllServices,
  verifyPaymentAndCreateRequest,
  createOrder,
  getUserServices,
  deleteUserServiceRequest,
  deleteServiceRequestByAdmin,
  deleteMainService,
  deleteServiceType,
  updateService,
  getAllServiceRequests,
  cancelServiceRequestByAdmin,
  markServiceRequestCompleted
} from "../controllers/serviceController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Admin
router.post("/add", addService); // later: verifyAdmin

// update service 
router.put("/update/:id", updateService);

//Admin
router.get("/", getAllServices);

// User
router.get("/my-services", verifyToken, getUserServices);

// Admin can view all requests
router.get("/all-services", getAllServiceRequests);


// User can delete their own requests
router.delete("/user/delete/:requestId", verifyToken, deleteUserServiceRequest);

// Admin can delete any request directly
router.delete("/admin/delete/:requestId", deleteServiceRequestByAdmin); 

// Delete APIs (Admin)
router.delete("/delete-main/:mainServiceId", deleteMainService);
router.delete("/delete-type/:mainServiceId/:typeId", deleteServiceType);

// router.post("/request", verifyToken, createServiceRequest);
router.post("/payment/create-order", createOrder);
router.post("/payment/verify", verifyToken, verifyPaymentAndCreateRequest);

router.put("/cancel-request/:requestId", cancelServiceRequestByAdmin);
router.post("/complete/:requestId", markServiceRequestCompleted);

export default router;

