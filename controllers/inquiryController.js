import Inquiry from "../models/inquirySchema.js";
import Property from "../models/addProps.js";
import ManualInquiry from "../models/manualInquirySchema.js";
import User from "../models/user.js";
import Admin from "../models/adminAuthSchema.js";
import Notification from "../models/notificationModel.js";
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
      customPropertyId: property.customPropertyId || "",
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

        const title = `New Property Inquiry (${property.customPropertyId || 'Property'}) 🏠`;
        const body = `You received a new inquiry for property ${property.customPropertyId || ''} in ${property.propertyLocation}.
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

    // 6.5️⃣ Send Notification to Admins (DB + FCM)
    try {
      const adminTitle = `🏠 New Inquiry: ${property.customPropertyId || 'Property'}`;
      const adminBody = `Property: ${property.customPropertyId || property._id} | Loc: ${property.propertyLocation} | Inquirer: ${fullName} (${contactNumber})`;
      const adminData = {
        type: "property_inquiry",
        inquiryId: inquiry._id.toString(),
        propertyId: property._id.toString(),
        customPropertyId: property.customPropertyId || "",
        fullName,
        email,
        contactNumber,
        location: property.propertyLocation,
      };

      // 1. Save Notification in DB for Admin Inbox
      await Notification.create({
        title: adminTitle,
        message: adminBody,
        type: "property_inquiry",
        priority: "high",
        metadata: {
          inquiryId: inquiry._id,
          propertyId: property._id,
          customPropertyId: property.customPropertyId,
          buyerName: fullName,
          buyerPhone: contactNumber,
          buyerEmail: email,
          ownerId: property.userId,
        },
      });

      // 2. Send Push Notification to all Admins
      const admins = await Admin.find({
        $or: [
          { "fcmTokens.0": { $exists: true } },
          { fcmToken: { $exists: true, $ne: "", $ne: null } },
        ],
      });

      let adminTokens = [];
      admins.forEach((adm) => {
        if (adm.fcmToken) adminTokens.push(adm.fcmToken);
        if (Array.isArray(adm.fcmTokens)) {
          adm.fcmTokens.forEach((t) => {
            if (t.token) adminTokens.push(t.token);
          });
        }
      });
      adminTokens = [...new Set(adminTokens.filter(Boolean))];

      if (adminTokens.length > 0) {
        await sendPushNotification(adminTokens, adminTitle, adminBody, adminData);
        console.log(`✅ Push notification sent to ${adminTokens.length} admin token(s) for enquiry on ${property.customPropertyId || property._id}`);
      }
    } catch (adminNotifErr) {
      console.error("❌ Admin Notification Error:", adminNotifErr.message);
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
//  Delete Inquiry (Handles both ManualInquiry and client Inquiry, cleans up assignments)
export const deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it exists in ManualInquiry
    const deletedManual = await ManualInquiry.findByIdAndDelete(id);
    if (deletedManual) {
      await LeadAssignment.deleteMany({ enquiryId: id });
      return res.status(200).json({
        success: true,
        message: "Manual inquiry deleted successfully",
      });
    }

    // Check if it exists in client Inquiry
    const deletedClient = await Inquiry.findByIdAndDelete(id);
    if (deletedClient) {
      await LeadAssignment.deleteMany({ enquiryId: id });
      return res.status(200).json({
        success: true,
        message: "Client inquiry deleted successfully",
      });
    }

    return res.status(404).json({
      success: false,
      message: "Inquiry not found",
    });
  } catch (error) {
    console.error("Delete Inquiry Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting inquiry",
      error: error.message,
    });
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
      .populate("buyerId", "fullName email phone avatar city state clientCode")
      .populate("ownerId", "fullName email phone avatar city state clientCode")
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
      comments: (majorComments && typeof majorComments === 'string' && majorComments.trim())
        ? [{ comment: majorComments.trim(), addedBy: "Admin", addedAt: new Date() }]
        : [],
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
//  Update Manual Inquiry or Client Inquiry
// ===========================
export const updateManualInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    // 1. Try to find and update in ManualInquiry
    const updatedInquiry = await ManualInquiry.findByIdAndUpdate(
      id,
      updatedData,
      {
        new: true,
        runValidators: false,
      }
    );

    if (updatedInquiry) {
      return res.status(200).json({
        success: true,
        message: "Manual inquiry updated successfully",
        data: updatedInquiry,
      });
    }

    // 2. If not found in ManualInquiry, try client Inquiry
    const clientInquiry = await Inquiry.findById(id);
    if (clientInquiry) {
      if (updatedData.clientName) clientInquiry.fullName = updatedData.clientName;
      if (updatedData.contactNumber) clientInquiry.contactNumber = updatedData.contactNumber;
      if (updatedData.email) clientInquiry.email = updatedData.email;
      if (updatedData.status) clientInquiry.status = updatedData.status;
      if (updatedData.caseStatus) clientInquiry.status = updatedData.caseStatus;
      await clientInquiry.save();

      return res.status(200).json({
        success: true,
        message: "Enquiry updated successfully",
        data: clientInquiry,
      });
    }

    return res.status(404).json({
      success: false,
      message: "Inquiry not found",
    });
  } catch (error) {
    console.error("Update Inquiry Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update inquiry",
      error: error.message,
    });
  }
};

// ===========================
//  Delete Manual Inquiry (Alias to unified deleteInquiry)
// ===========================
export const deleteManualInquiry = deleteInquiry;

// ===========================
//  Delete All Inquiries (Admin Only)
// ===========================
export const deleteAllInquiries = async (req, res) => {
  try {
    const { source } = req.query;
    let manualDeleted = 0;
    let clientDeleted = 0;

    if (!source || source === "all" || source === "manual") {
      const resManual = await ManualInquiry.deleteMany({});
      manualDeleted = resManual.deletedCount || 0;
    }

    if (!source || source === "all" || source === "client") {
      const resClient = await Inquiry.deleteMany({});
      clientDeleted = resClient.deletedCount || 0;
    }

    // Clean up all LeadAssignments
    await LeadAssignment.deleteMany({});

    return res.status(200).json({
      success: true,
      message: "All clients/leads deleted successfully",
      deletedCount: manualDeleted + clientDeleted,
      details: { manualDeleted, clientDeleted },
    });
  } catch (error) {
    console.error("Delete All Inquiries Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting all enquiries",
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

    if (!comment || typeof comment !== "string" || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required",
      });
    }

    // Try to find in ManualInquiry first
    let inquiry = await ManualInquiry.findById(id);

    if (!inquiry) {
      // Try regular Inquiry
      inquiry = await Inquiry.findById(id);
    }

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    if (!Array.isArray(inquiry.comments)) {
      inquiry.comments = [];
    }

    const newCommentItem = {
      comment: comment.trim(),
      addedBy: addedBy || "Admin",
      addedAt: new Date(),
    };

    inquiry.comments.push(newCommentItem);
    await inquiry.save();

    return res.status(200).json({
      success: true,
      message: "Comment added successfully",
      data: inquiry,
      comment: newCommentItem,
    });

  } catch (error) {
    return res.status(500).json({
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

// ==========================================
// CLIENT: Get inquiries received on own properties
// ==========================================
export const getClientReceivedInquiries = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if Admin disabled inquiries for this client
    if (user.canReceiveInquiries === false) {
      return res.status(200).json({
        success: true,
        canReceiveInquiries: false,
        message: "Inquiries are currently managed directly by Admin for your account.",
        count: 0,
        data: [],
      });
    }

    // Fetch inquiries received for properties posted by this client
    const inquiries = await Inquiry.find({ ownerId: userId })
      .populate("propertyId")
      .populate("buyerId", "fullName email phone clientCode avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      canReceiveInquiries: true,
      count: inquiries.length,
      data: inquiries,
    });
  } catch (error) {
    console.error("Error fetching client received inquiries:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching inquiries",
      error: error.message,
    });
  }
};
