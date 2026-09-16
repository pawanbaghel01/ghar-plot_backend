import Service from "../models/serviceSchema.js";
import haversine from "haversine-distance";
import fetch from "node-fetch"; // For geocoding API
import Razorpay from "razorpay";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import crypto from "crypto";




import { sendPushNotification } from "../utils/sendNotification.js";
import User from "../models/user.js"; // assuming user has fcmToken field

dotenv.config();


//  Add New Service (Main + Type)
export const addService = async (req, res) => {
  try {
    const { mainService, typeName, adminConfig } = req.body;

    // Check if main service already exists
    let existingService = await Service.findOne({ mainService });

    // If service exists, add new type
    if (existingService) {
      const typeExists = existingService.serviceTypes.some(
        (t) => t.typeName.toLowerCase() === typeName.toLowerCase()
      );

      if (typeExists) {
        return res.status(400).json({
          success: false,
          message: "This service type already exists under this main service",
        });
      }

      existingService.serviceTypes.push({ typeName, adminConfig });
      await existingService.save();

      return res.status(201).json({
        success: true,
        message: "New service type added successfully",
        data: existingService,
      });
    }

    // If main service does not exist, create it
    const newService = new Service({
      mainService,
      serviceTypes: [{ typeName, adminConfig }],
    });

    await newService.save();

    res.status(201).json({
      success: true,
      message: "Main service created successfully",
      data: newService,
    });
  } catch (error) {
    console.error("Error adding service:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



// Update Service Type Pricing (According to UI Screenshot)
export const updateService = async (req, res) => {
  try {
    const { id } = req.params; // Service ID
    const { typeId, typeName, baseCharges, distanceRatePerKm } = req.body;

    // Fetch service by ID
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Find service type index
    const typeIndex = service.serviceTypes.findIndex(
      (t) => t._id.toString() === typeId
    );

    if (typeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Service type not found",
      });
    }

    // Update Type Name
    if (typeName) {
      const duplicate = service.serviceTypes.some(
        (t) =>
          t.typeName.toLowerCase() === typeName.toLowerCase() &&
          t._id.toString() !== typeId
      );

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "This type name already exists under this service",
        });
      }

      service.serviceTypes[typeIndex].typeName = typeName;
    }

    //  Update Base Charges
    if (baseCharges) {
      service.serviceTypes[typeIndex].adminConfig.baseCharges = {
        ...service.serviceTypes[typeIndex].adminConfig.baseCharges,
        ...baseCharges,
      };
    }

    // Update Distance Charge (Per Km)
    if (distanceRatePerKm !== undefined) {
      service.serviceTypes[typeIndex].adminConfig.distanceRatePerKm =
        distanceRatePerKm;
    }

    await service.save();

    return res.status(200).json({
      success: true,
      message: "Service type updated successfully",
      data: service,
    });
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};




//  Get All Services (Admin / Public)
export const getAllServices = async (req, res) => {
  try {
    const services = await Service.find();

    if (!services.length) {
      return res.status(201).json({
        success: false,
        message: "No services found",
      });
    }

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Get User's Service Requests
export const getUserServices = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1 Find services containing requests by this user
    const services = await Service.find({ "serviceTypes.requests.userId": userId })
      .select("mainService serviceTypes.requests serviceTypes.typeName")
      .lean();

    const userRequests = [];

    // 2 Extract only requests belonging to this user
    services.forEach(service => {
      service.serviceTypes.forEach(type => {
        type.requests.forEach(reqItem => {
          if (reqItem.userId.toString() === userId) {
            userRequests.push({
              mainService: service.mainService,
              serviceType: type.typeName,
              ...reqItem,
            });
          }
        });
      });
    });

    // 3 Sort requests (latest first)
    userRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 4 Send response
    res.status(200).json({
      success: true,
      count: userRequests.length,
      data: userRequests,
    });
  } catch (error) {
    console.error("Error fetching user services:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



// ===============================
//  Get All Service Requests (Admin)
// ===============================
export const getAllServiceRequests = async (req, res) => {
  try {
    // 1 Fetch all services
    const services = await Service.find()
      .select("mainService serviceTypes.requests serviceTypes.typeName")
      .lean();

    const allRequests = [];

    // 2 Extract all nested requests from each service
    services.forEach(service => {
      service.serviceTypes.forEach(type => {
        type.requests.forEach(reqItem => {
          allRequests.push({
            mainService: service.mainService,
            serviceType: type.typeName,
            ...reqItem,
          });
        });
      });
    });

    // 3 Sort requests (latest first)
    allRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 4 Send response
    res.status(200).json({
      success: true,
      count: allRequests.length,
      data: allRequests,
    });
  } catch (error) {
    console.error("Error fetching all service requests:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// =============================
// Delete Service Request (User)
// =============================
export const deleteUserServiceRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({ success: false, message: "Missing request ID" });
    }

    // Find the service that contains this request belonging to this user
    const service = await Service.findOne({
      "serviceTypes.requests": {
        $elemMatch: { _id: requestId, userId },
      },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service request not found or you are not authorized to delete it",
      });
    }

    // Pull the request from nested array
    await Service.updateOne(
      { "serviceTypes.requests._id": requestId },
      { $pull: { "serviceTypes.$[].requests": { _id: requestId, userId } } }
    );

    res.status(200).json({
      success: true,
      message: "Your service request has been deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user service request:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// =======================================
// Delete Service Request (Admin / Direct)
// =======================================
export const deleteServiceRequestByAdmin = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({ success: false, message: "Missing request ID" });
    }

    const service = await Service.findOne({ "serviceTypes.requests._id": requestId });

    if (!service) {
      return res.status(404).json({ success: false, message: "Service request not found" });
    }

    await Service.updateOne(
      { "serviceTypes.requests._id": requestId },
      { $pull: { "serviceTypes.$[].requests": { _id: requestId } } }
    );

    res.status(200).json({
      success: true,
      message: "Service request deleted successfully (Admin)",
    });
  } catch (error) {
    console.error("Error deleting service request (admin):", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// =======================================
// Delete Main Service (Admin)
// =======================================
export const deleteMainService = async (req, res) => {
  try {
    const { mainServiceId } = req.params;

    if (!mainServiceId) {
      return res.status(400).json({
        success: false,
        message: "Missing mainServiceId",
      });
    }

    const deleted = await Service.findByIdAndDelete(mainServiceId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Main service not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Main service '${deleted.mainService}' deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting main service:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// =======================================
// Delete Service Type (Admin)
// =======================================
export const deleteServiceType = async (req, res) => {
  try {
    const { mainServiceId, typeId } = req.params;

    if (!mainServiceId || !typeId) {
      return res.status(400).json({
        success: false,
        message: "Missing mainServiceId or typeId",
      });
    }

    const service = await Service.findById(mainServiceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Main service not found",
      });
    }

    // Pull the type from serviceTypes array
    const updated = await Service.findByIdAndUpdate(
      mainServiceId,
      { $pull: { serviceTypes: { _id: typeId } } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Service type deleted successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error deleting service type:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};







// ------------------- Razorpay Setup -------------------
let razorpay;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  } else {
    console.warn('⚠️ Razorpay keys not found in environment variables');
  }
} catch (error) {
  console.error('❌ Error initializing Razorpay:', error.message);
}

// ------------------- Email Function -------------------
const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"99Acer Services" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(` Email sent successfully to: ${to}`);
  } catch (error) {
    console.error(" Error sending email:", error.message);
  }
};

// ------------------- Convert Address → Lat/Lon -------------------
const getCoordinatesFromAddress = async (address) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null;
  }
};

// ============================================================
//  STEP 1 Create Razorpay Order
// ============================================================
export const createOrder = async (req, res) => {
  try {
    const { amount, currency } = req.body;

    if (!amount) {
      return res
        .status(400)
        .json({ success: false, message: "Amount is required" });
    }

    const options = {
      amount: amount * 100,
      currency: currency || "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    };

    if (!razorpay) {
      return res.status(500).json({ 
        success: false, 
        error: 'Payment service not configured' 
      });
    }

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================================
//  STEP 2  Verify Payment & Create Service Request
// ============================================================
export const verifyPaymentAndCreateRequest = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      mainService,
      serviceType,
      propertyDetails,
      address,
      schedule,
      contact,
      specialInstructions,
    } = req.body;

    // 1 Verify Razorpay Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    // 2 Convert Admin Address → Lat/Lon
    const adminCoordinates = await getCoordinatesFromAddress(
      process.env.ADMIN_ADDRESS
    );
    if (!adminCoordinates) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to get admin coordinates" });
    }

    // 3 Convert User Address → Lat/Lon
    const userCoordinates = await getCoordinatesFromAddress(
      address?.completeAddress
    );
    if (!userCoordinates) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user address" });
    }

    // 4 Find Main Service
    const service = await Service.findOne({ mainService });
    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Main service not found" });
    }

    // 5 Find Type
    const selectedType = service.serviceTypes.find(
      (t) => t.typeName.toLowerCase() === serviceType.toLowerCase()
    );
    if (!selectedType) {
      return res
        .status(404)
        .json({ success: false, message: "Service type not found" });
    }

    // 6 Calculate Charges
    const propertySize = propertyDetails?.size;
    const baseCharge = selectedType.adminConfig.baseCharges[propertySize] || 0;

    const distanceInMeters = haversine(adminCoordinates, userCoordinates);
    const distanceInKm = +(distanceInMeters / 1000).toFixed(2);
    const distanceCharge =
      distanceInKm * selectedType.adminConfig.distanceRatePerKm;
    const totalCharge = baseCharge + distanceCharge;

    // 7 Create Service Request Object
    const newRequest = {
      userId: req.user?.id || null,
      propertyDetails,
      address: {
        ...address,
        latitude: userCoordinates.latitude,
        longitude: userCoordinates.longitude,
      },
      schedule,
      contact,
      specialInstructions,
      baseCharge,
      distanceCharge,
      totalCharge,
      distanceInKm,
      status: "accepted", // Auto-confirmed after payment
      createdAt: new Date(),
    };

    selectedType.requests.push(newRequest);
    await service.save();

    // 8 Send Confirmation Emails
    const userEmail = contact.email;
    const adminEmail = process.env.ADMIN_EMAIL;

    const htmlToUser = `
      <h2> Service Request Confirmed</h2>
      <p>Hello <b>${contact.fullName}</b>,</p>
      <p>Your service request for <b>${mainService}</b> (${serviceType}) has been confirmed after successful payment.</p>
      <p><b>Amount Paid:</b> ₹${totalCharge}</p>
      <p><b>Address:</b> ${address.completeAddress}</p>
      <p><b>Date:</b> ${schedule.date}</p>
      <p><b>Time Slot:</b> ${schedule.timeSlot}</p>
      <br/>
      <p>Thank you for choosing <b>99Acer Services</b>.</p>
    `;

    const htmlToAdmin = `
      <h2>New Service Request Confirmed</h2>
      <p><b>Service:</b> ${mainService} (${serviceType})</p>
      <p><b>Client Name:</b> ${contact.fullName}</p>
      <p><b>Client Email:</b> ${userEmail}</p>
      <p><b>Client Phone:</b> ${contact.phoneNumber}</p>
      <p><b>Total Amount:</b> ₹${totalCharge}</p>
      <p><b>Address:</b> ${address.completeAddress}</p>
      <p><b>Date:</b> ${schedule.date}</p>
      <p><b>Time Slot:</b> ${schedule.timeSlot}</p>
    `;

    await sendEmail({
      to: userEmail,
      subject: "Service Request Confirmed - 99Acer",
      html: htmlToUser,
    });

    await sendEmail({
      to: adminEmail,
      subject: "New Service Request Confirmed",
      html: htmlToAdmin,
    });

    // 9 Response
    res.status(200).json({
      success: true,
      message: "Payment verified and service request created successfully",
      data: newRequest,
      paymentId: razorpay_payment_id,

    });
  } catch (error) {
    console.error("Error in verifyPaymentAndCreateRequest:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// //  Create Service Request


// // Function to convert address → lat/lon using OpenStreetMap (Nominatim)
// const getCoordinatesFromAddress = async (address) => {
//   try {
//     const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
//       address
//     )}`;
//     const response = await fetch(url);
//     const data = await response.json();

//     if (data && data.length > 0) {
//       return {
//         latitude: parseFloat(data[0].lat),
//         longitude: parseFloat(data[0].lon),
//       };
//     }
//     return null;
//   } catch (error) {
//     console.error("Error fetching coordinates:", error);
//     return null;
//   }
// };

// export const createServiceRequest = async (req, res) => {
//   try {
//     const {
//       mainService,
//       serviceType, // e.g. "Office"
//       propertyDetails,
//       address,
//       schedule,
//       contact,
//       specialInstructions,
//     } = req.body;

//     // 1 Convert Admin address → lat/lon (from .env)
//     const adminAddress = process.env.ADMIN_ADDRESS;
//     const adminCoordinates = await getCoordinatesFromAddress(adminAddress);

//     if (!adminCoordinates) {
//       return res
//         .status(500)
//         .json({ success: false, message: "Failed to get admin coordinates" });
//     }

//     // 2 Convert User address → lat/lon automatically
//     const userCoordinates = await getCoordinatesFromAddress(
//       address?.completeAddress
//     );

//     if (!userCoordinates) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid user address" });
//     }

//     // 3 Find main service
//     const service = await Service.findOne({ mainService });
//     if (!service) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Main service not found" });
//     }

//     // 4 Find specific service type
//     const selectedType = service.serviceTypes.find(
//       (t) => t.typeName.toLowerCase() === serviceType.toLowerCase()
//     );
//     if (!selectedType) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Service type not found" });
//     }

//     // 5 Base charge based on property size
//     const propertySize = propertyDetails?.size;
//     const baseCharge = selectedType.adminConfig.baseCharges[propertySize] || 0;

//     // 6 Distance calculation (auto using lat/lon)
//     const distanceInKm =
//       haversine(adminCoordinates, userCoordinates) / 1000 || 0;

//     const distanceCharge = Math.round(
//       distanceInKm * selectedType.adminConfig.distanceRatePerKm
//     );

//     // 7 Total charge
//     const totalCharge = baseCharge + distanceCharge;

//     // 8 New request object
//     const newRequest = {
//       userId: req.user?.id || null,
//       propertyDetails,
//       address: {
//         ...address,
//         latitude: userCoordinates.latitude,
//         longitude: userCoordinates.longitude,
//       },
//       schedule,
//       contact,
//       specialInstructions,
//       baseCharge,
//       distanceCharge,
//       totalCharge,
//       distanceInKm: Math.round(distanceInKm * 100) / 100,
//       status: "pending",
//       createdAt: new Date(),
//     };

//     // 9 Push inside correct service type
//     selectedType.requests.push(newRequest);
//     await service.save();

//     res.status(201).json({
//       success: true,
//       message: "Service request created successfully",
//       data: {
//         mainService,
//         serviceType,
//         ...newRequest,
//       },
//     });
//   } catch (error) {
//     console.error("Error creating service request:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// =======================================
// Cancel Service Request (Admin)
// =======================================


export const cancelServiceRequestByAdmin = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body; // Optional reason for cancellation

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "Missing request ID",
      });
    }

    //  Find service that contains the request
    const service = await Service.findOne({ "serviceTypes.requests._id": requestId });
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service request not found",
      });
    }

    //  Find the exact request and service type
    let selectedRequest = null;
    let selectedType = null;

    service.serviceTypes.forEach((type) => {
      const foundReq = type.requests.find(
        (req) => req._id.toString() === requestId
      );
      if (foundReq) {
        selectedRequest = foundReq;
        selectedType = type;
      }
    });

    if (!selectedRequest) {
      return res.status(404).json({
        success: false,
        message: "Request not found inside any service type",
      });
    }

    //  Update status
    selectedRequest.status = "cancelled";
    selectedRequest.cancelledAt = new Date();
    if (reason) selectedRequest.cancelReason = reason;

    await service.save();

    //  Notify User (Email + Push Notification)
    const userEmail = selectedRequest.contact?.email;
    const userName = selectedRequest.contact?.fullName || "User";
    const userPhone = selectedRequest.contact?.phone;

    //  Try finding user document to get their fcmToken
    const user = await User.findOne({
      $or: [
        { email: userEmail },
        { phone: userPhone },
      ],
    });

    // ============  EMAIL NOTIFICATION ============
    if (userEmail) {
      const html = `
        <h2>Service Request Cancelled</h2>
        <p>Hello <b>${userName}</b>,</p>
        <p>We regret to inform you that your service request for 
        <b>${service.mainService}</b> (${selectedType.typeName}) has been <b>cancelled</b> by the admin.</p>
        ${reason ? `<p><b>Reason:</b> ${reason}</p>` : ""}
        <p><b>Request ID:</b> ${requestId}</p>
        <p><b>Status:</b> Cancelled</p>
        <br/>
        <p>We apologize for any inconvenience caused. Please contact support if you have any questions.</p>
        <p>— GharPlot Services Team</p>
      `;

      await sendEmail({
        to: userEmail,
        subject: "Service Request Cancelled - 99Acer Services",
        html,
      });
    }

    // ============  PUSH NOTIFICATION ============
    if (user?.fcmToken) {
      await sendPushNotification(
        user.fcmToken,
        " Service Request Cancelled",
        `Your request for ${service.mainService} (${selectedType.typeName}) has been cancelled by admin.`,
        {
          requestId,
          status: "cancelled",
          reason: reason || "",
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          type: "service_cancel",
        }
      );
      console.log(" Push notification sent to:", userEmail || userPhone);
    } else {
      console.warn(" No FCM token found for user:", userEmail || userPhone);
    }

    //  Final Response
    res.status(200).json({
      success: true,
      message: "Service request cancelled successfully. User notified via email & push notification.",
      data: {
        requestId,
        status: "cancelled",
        reason: reason || null,
      },
    });
  } catch (error) {
    console.error(" Error cancelling service request:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// export const cancelServiceRequestByAdmin = async (req, res) => {
//   try {
//     const { requestId } = req.params;
//     const { reason } = req.body; // Optional reason for cancellation

//     if (!requestId) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing request ID",
//       });
//     }

//     // Find the service containing this request
//     const service = await Service.findOne({ "serviceTypes.requests._id": requestId });
//     if (!service) {
//       return res.status(404).json({
//         success: false,
//         message: "Service request not found",
//       });
//     }

//     // Locate the service type and the request inside it
//     let selectedRequest = null;
//     let selectedType = null;

//     service.serviceTypes.forEach((type) => {
//       const foundReq = type.requests.find(
//         (req) => req._id.toString() === requestId
//       );
//       if (foundReq) {
//         selectedRequest = foundReq;
//         selectedType = type;
//       }
//     });

//     if (!selectedRequest) {
//       return res.status(404).json({
//         success: false,
//         message: "Request not found inside any service type",
//       });
//     }

//     //  Update status to 'cancelled'
//     selectedRequest.status = "cancelled";
//     selectedRequest.cancelledAt = new Date();
//     if (reason) selectedRequest.cancelReason = reason;

//     await service.save();

//     //  Send email notification to user
//     const userEmail = selectedRequest.contact?.email;
//     const userName = selectedRequest.contact?.fullName || "User";

//     if (userEmail) {
//       const html = `
//         <h2>Service Request Cancelled</h2>
//         <p>Hello <b>${userName}</b>,</p>
//         <p>We regret to inform you that your service request for 
//         <b>${service.mainService}</b> (${selectedType.typeName}) has been <b>cancelled</b> by the admin.</p>
//         ${reason ? `<p><b>Reason:</b> ${reason}</p>` : ""}
//         <p><b>Request ID:</b> ${requestId}</p>
//         <p><b>Status:</b> Cancelled</p>
//         <br/>
//         <p>We apologize for any inconvenience caused. Please contact support if you have any questions.</p>
//         <p>— GharPlot Services Team</p>
//       `;

//       await sendEmail({
//         to: userEmail,
//         subject: "Service Request Cancelled - 99Acer Services",
//         html,
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Service request cancelled successfully and user notified via email",
//       data: {
//         requestId,
//         status: "cancelled",
//         reason: reason || null,
//       },
//     });
//   } catch (error) {
//     console.error("Error cancelling service request:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };



export const markServiceRequestCompleted = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "Missing request ID",
      });
    }

    // 1 Find the service containing this request
    const service = await Service.findOne({
      "serviceTypes.requests._id": requestId,
    });
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service request not found",
      });
    }

    // 2 Locate the exact request
    let selectedRequest = null;
    let selectedType = null;
    service.serviceTypes.forEach((type) => {
      const foundReq = type.requests.find(
        (r) => r._id.toString() === requestId
      );
      if (foundReq) {
        selectedRequest = foundReq;
        selectedType = type;
      }
    });

    if (!selectedRequest) {
      return res.status(404).json({
        success: false,
        message: "Request not found in service types",
      });
    }

    // 3 Update status to completed
    selectedRequest.status = "completed";
    selectedRequest.completedAt = new Date();

    await service.save();

    // 4 Find user for notifications
    const userEmail = selectedRequest.contact?.email;
    const userName = selectedRequest.contact?.fullName || "User";
    const userPhone = selectedRequest.contact?.phone;

    const user = await User.findOne({
      $or: [{ email: userEmail }, { phone: userPhone }],
    });

    // 5 Send Completion Email
    if (userEmail) {
      const html = `
        <h2>🎉 Service Completed Successfully!</h2>
        <p>Hello <b>${userName}</b>,</p>
        <p>Your <b>${service.mainService}</b> (${selectedType.typeName}) service request has been successfully <b>completed</b>.</p>
        <p>Thank you for trusting us!</p>
        <br/>
        <p>— 99Acer Services Team</p>
      `;
      await sendEmail({
        to: userEmail,
        subject: "Service Completed - 99Acer Services",
        html,
      });
    }

    // 6 Send Push Notification - Completion
    if (user?.fcmToken) {
      await sendPushNotification(
        user.fcmToken,
        "🎉 Service Completed",
        `Your ${service.mainService} (${selectedType.typeName}) service has been completed successfully.`,
        {
          requestId,
          type: "completion",
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        }
      );
    }

    // 7 Send Rating Reminder (Email + Push)
    const ratingLink = `https://99acer.com/rate-service/${requestId}`;
    if (userEmail) {
      const html = `
        <h2>🌟 We Value Your Feedback!</h2>
        <p>Hello <b>${userName}</b>,</p>
        <p>Your service was completed recently. Please rate your experience to help us improve.</p>
        <a href="${ratingLink}" 
           style="display:inline-block; background:#007bff; color:#fff; padding:10px 15px; text-decoration:none; border-radius:5px;">
           Rate Your Service
        </a>
        <br/><br/>
        <p>Thank you for choosing 99Acer!</p>
      `;
      await sendEmail({
        to: userEmail,
        subject: "Rate Your Service Experience - 99Acer",
        html,
      });
    }

    if (user?.fcmToken) {
      await sendPushNotification(
        user.fcmToken,
        "🌟 Please Rate Your Service",
        `How was your experience with ${service.mainService}? Tap to rate now!`,
        {
          requestId,
          type: "rating_reminder",
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          ratingLink,
        }
      );
    }

    res.status(200).json({
      success: true,
      message:
        "Service marked as completed, and user notified via email & push with rating reminder.",
    });
  } catch (error) {
    console.error("Error marking service completed:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};