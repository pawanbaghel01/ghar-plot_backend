import Inquiry from "../models/inquirySchema.js";
import Property from "../models/addProps.js";
import ManualInquiry from "../models/manualInquirySchema.js";
import User from "../models/user.js";
import LeadAssignment from "../models/leadAssignmentSchema.js";
import { sendPushNotification } from "../utils/sendNotification.js";

//  Add new Inquiry (prevent duplicates)
// export const addInquiry = async (req, res) => {
//   try {
//     const buyerId = req.user.id; // logged-in user
//     const { propertyId, fullName, email, contactNumber } = req.body;

//     // 1 Validation
//     if (!propertyId || !fullName || !email || !contactNumber) {
//       return res.status(400).json({ message: "All required fields must be filled" });
//     }

//     // 2 Find property
//     const property = await Property.findById(propertyId);
//     if (!property) {
//       return res.status(404).json({ message: "Property not found" });
//     }

//     // 3 Prevent owner from sending inquiry to own property
//     if (property.userId.toString() === buyerId) {
//       return res.status(400).json({ message: "You cannot inquire about your own property" });
//     }

//     // 4 Check if inquiry already exists (buyer → same property)
//     const existingInquiry = await Inquiry.findOne({ buyerId, propertyId });
//     if (existingInquiry) {
//       return res.status(400).json({
//         message: "You have already submitted an inquiry for this property.",
//         alreadyInquired: true,
//       });
//     }

//     // 5 Create new inquiry
//     const inquiry = new Inquiry({
//       propertyId,
//       buyerId,
//       ownerId: property.userId, // property owner
//       fullName,
//       email,
//       contactNumber,
//     });

//     await inquiry.save();

//     // 6 Response
//     res.status(201).json({
//       message: "Inquiry submitted successfully",
//       inquiry,
//     });
//   } catch (error) {
//     console.error("Add Inquiry Error:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

export const addInquiry = async (req, res) => {
  try {
    const buyerId = req.user?.id || req.employee?._id; // Logged-in user or employee
    const { propertyId, fullName, email, contactNumber } = req.body;

    // 1️⃣ Validation
    if (!propertyId || !fullName || !email || !contactNumber) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled" });
    }

    // 2️⃣ Find property
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // 3️⃣ Prevent owner from sending inquiry to own property
    if (property.userId.toString() === buyerId) {
      return res
        .status(400)
        .json({ message: "You cannot inquire about your own property" });
    }

    // 4️⃣ Check if inquiry already exists
    const existingInquiry = await Inquiry.findOne({ buyerId, propertyId });
    if (existingInquiry) {
      return res.status(400).json({
        message: "You have already submitted an inquiry for this property.",
        alreadyInquired: true,
      });
    }

    // 5️⃣ Create new inquiry
    const inquiry = new Inquiry({
      propertyId,
      buyerId,
      ownerId: property.userId, // property owner
      fullName,
      email,
      contactNumber,
    });

    await inquiry.save();

    // 6️⃣ Send Push Notification to Property Owner
    let fcmTokenFound = false;
    let notificationStatus = "not_sent";

    const owner = await User.findById(property.userId);

    if (owner) {
      if (owner.fcmToken) {
        fcmTokenFound = true;

        // Determine which type field to show
        const propertyTypeDetail =
          property.propertyType === "Residential"
            ? property.residentialType
            : property.commercialType;

        const title = "New Property Inquiry 🏠";
        const body = `You received a new inquiry for your property in ${property.propertyLocation}.
Property Type: ${property.propertyType} (${propertyTypeDetail})
From: ${fullName}
Email: ${email}
Contact: ${contactNumber}`;

        const data = {
          type: "property_inquiry",
          propertyLocation: property.propertyLocation,
          propertyType: property.propertyType,
          propertyTypeDetail,
          fullName,
          email,
          contactNumber,
        };

        try {
          await sendPushNotification(owner.fcmToken, title, body, data);
          notificationStatus = "sent";
          console.log(
            `✅ Notification sent to owner (${owner._id}) for property at ${property.propertyLocation}`
          );
        } catch (err) {
          console.error("❌ Notification Send Error:", err);
          notificationStatus = "failed";
        }
      } else {
        console.warn(
          `⚠️ No FCM token found for owner (${owner._id}) - cannot send notification`
        );
      }
    }

    // 7️⃣ Final Response
    res.status(201).json({
      message: "Inquiry submitted successfully",
      inquiry,
      fcmTokenFound,
      notificationStatus,
    });
  } catch (error) {
    console.error("Add Inquiry Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


//  Delete Inquiry
export const deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const buyerId = req.user?.id || req.employee?._id;

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

    // only the buyer who created it can delete it
    if (inquiry.buyerId.toString() !== buyerId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this inquiry" });
    }

    await Inquiry.findByIdAndDelete(id);
    res.status(200).json({ message: "Inquiry deleted successfully" });
  } catch (error) {
    console.error("Delete Inquiry Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//  Get Enquiries with filters and populated data
export const getEnquiries = async (req, res) => {
  try {
    const { buyerId, ownerId, propertyId, status } = req.query;

    //  Step 1: Build dynamic filter object
    const filter = {};
    if (buyerId) filter.buyerId = buyerId;
    if (ownerId) filter.ownerId = ownerId;
    if (propertyId) filter.propertyId = propertyId;
    if (status) filter.status = status;

    //  Step 2: Fetch enquiries with full populated data
    const enquiries = await Inquiry.find(filter)
      .populate("buyerId", "fullName email phone avatar city state")
      .populate("ownerId", "fullName email phone avatar city state")
      .populate("propertyId");

    //  Step 3: Add assignment information to each enquiry
    const enquiriesWithAssignment = await Promise.all(
      enquiries.map(async (enquiry) => {
        // Find active assignment for this enquiry
        const assignment = await LeadAssignment.findOne({
          enquiryId: enquiry._id,
          enquiryType: 'Inquiry',
          status: { $in: ['active', 'pending', 'in-progress'] }
        }).populate('employeeId', 'name email');

        return {
          ...enquiry.toObject(),
          assignment: assignment ? {
            employeeId: assignment.employeeId._id,
            employeeName: assignment.employeeId.name,
            employeeEmail: assignment.employeeId.email,
            status: assignment.status,
            assignedDate: assignment.assignedDate,
            priority: assignment.priority
          } : null
        };
      })
    );

    //  Step 4: Return response
    res.status(200).json({
      message: "Enquiries fetched successfully",
      count: enquiriesWithAssignment.length,
      data: enquiriesWithAssignment,
    });
  } catch (error) {
    console.error(" Error fetching enquiries:", error);
    res.status(500).json({
      message: "Server error while fetching enquiries",
      error: error.message,
    });
  }
};

// manual add enquiry (admin use)

// ===========================
//  Create Manual Inquiry
// ===========================
export const createManualInquiry = async (req, res) => {
  try {
    const {
      s_No,
      clientName,
      contactNumber,
      ClientCode,
      ProjectCode,
      productType,
      location,
      date,
      caseStatus,
      source,
      majorComments,
      address,
      weekOrActionTaken,
      actionPlan,
      referenceBy,
    } = req.body;

    //  Validation check
    if (
      !s_No ||
      !clientName ||
      !contactNumber ||
      !ClientCode ||
      !ProjectCode ||
      !productType ||
      !location ||
      !date
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields.",
      });
    }

    //  Create a new manual inquiry
    const newInquiry = new ManualInquiry({
      s_No,
      clientName,
      contactNumber,
      ClientCode,
      ProjectCode,
      productType,
      location,
      date,
      caseStatus,
      source,
      majorComments,
      address,
      weekOrActionTaken,
      actionPlan,
      referenceBy,
    });

    await newInquiry.save();

    res.status(201).json({
      success: true,
      message: "Manual inquiry created successfully",
      data: newInquiry,
    });
  } catch (error) {
    console.error("Error creating manual inquiry:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create manual inquiry",
      error: error.message,
    });
  }
};

// ===========================
//  Get All Manual Inquiries
// ===========================
export const getAllManualInquiries = async (req, res) => {
  try {
    const inquiries = await ManualInquiry.find().sort({ createdAt: -1 });

    // Add assignment information to each manual inquiry
    const inquiriesWithAssignment = await Promise.all(
      inquiries.map(async (inquiry) => {
        // Find active assignment for this manual inquiry
        const assignment = await LeadAssignment.findOne({
          enquiryId: inquiry._id,
          enquiryType: 'ManualInquiry',
          status: { $in: ['active', 'pending', 'in-progress'] }
        }).populate('employeeId', 'name email');

        return {
          ...inquiry.toObject(),
          assignment: assignment ? {
            employeeId: assignment.employeeId._id,
            employeeName: assignment.employeeId.name,
            employeeEmail: assignment.employeeId.email,
            status: assignment.status,
            assignedDate: assignment.assignedDate,
            priority: assignment.priority
          } : null
        };
      })
    );

    res.status(200).json({
      success: true,
      total: inquiriesWithAssignment.length,
      data: inquiriesWithAssignment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch manual inquiries",
      error: error.message,
    });
  }
};

// ===========================
//  Get Manual Inquiry by ID
// ===========================
export const getManualInquiryById = async (req, res) => {
  try {
    const { id } = req.params;
    const inquiry = await ManualInquiry.findById(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Manual inquiry not found",
      });
    }

    res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch manual inquiry",
      error: error.message,
    });
  }
};

// ===========================
//  Update Manual Inquiry
// ===========================
export const updateManualInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const updatedInquiry = await ManualInquiry.findByIdAndUpdate(
      id,
      updatedData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedInquiry) {
      return res.status(404).json({
        success: false,
        message: "Manual inquiry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Manual inquiry updated successfully",
      data: updatedInquiry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update manual inquiry",
      error: error.message,
    });
  }
};

// ===========================
//  Delete Manual Inquiry
// ===========================
export const deleteManualInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedInquiry = await ManualInquiry.findByIdAndDelete(id);

    if (!deletedInquiry) {
      return res.status(404).json({
        success: false,
        message: "Manual inquiry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Manual inquiry deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete manual inquiry",
      error: error.message,
    });
  }
};

// ===========================
//  Add Comment to Inquiry
// ===========================
export const addCommentToInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, addedBy } = req.body;

    if (!comment || !addedBy) {
      return res.status(400).json({
        success: false,
        message: "Comment and addedBy are required",
      });
    }

    // Try to find in ManualInquiry first
    let inquiry = await ManualInquiry.findById(id);
    let isManualInquiry = true;

    if (!inquiry) {
      // Try regular Inquiry
      inquiry = await Inquiry.findById(id);
      isManualInquiry = false;
    }

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    // For ManualInquiry, add to comments array
    if (isManualInquiry) {
      inquiry.comments.push({
        comment,
        addedBy,
        addedAt: new Date()
      });
      
      await inquiry.save();

      return res.status(200).json({
        success: true,
        message: "Comment added successfully",
        data: inquiry,
      });
    }

    // For regular Inquiry, we need to add a comments field or use LeadAssignment
    return res.status(400).json({
      success: false,
      message: "Regular inquiries don't support direct comments. Please use LeadAssignment follow-up history instead.",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add comment",
      error: error.message,
    });
  }
};

// ===========================
//  Get Comments for Inquiry
// ===========================
export const getInquiryComments = async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find in ManualInquiry first
    let inquiry = await ManualInquiry.findById(id).select('comments clientName contactNumber');
    let isManualInquiry = true;

    if (!inquiry) {
      // Try regular Inquiry
      inquiry = await Inquiry.findById(id);
      isManualInquiry = false;
    }

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    // For ManualInquiry, return comments array
    if (isManualInquiry) {
      return res.status(200).json({
        success: true,
        total: inquiry.comments?.length || 0,
        data: {
          inquiryId: inquiry._id,
          clientName: inquiry.clientName,
          contactNumber: inquiry.contactNumber,
          comments: inquiry.comments || []
        }
      });
    }

    // For regular Inquiry
    return res.status(200).json({
      success: false,
      message: "Regular inquiries don't support direct comments. Please use LeadAssignment follow-up history instead.",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch comments",
      error: error.message,
    });
  }
};
