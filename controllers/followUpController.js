import mongoose from "mongoose";
import FollowUp from "../models/followUpSchema.js";
import UserLeadAssignment from "../models/userLeadAssignmentSchema.js";
import LeadAssignment from "../models/leadAssignmentSchema.js";
import Employee from "../models/employeeSchema.js";
import User from "../models/user.js";
import Inquiry from "../models/inquirySchema.js";
import ManualInquiry from "../models/manualInquirySchema.js";

// Create a new follow-up
export const createFollowUp = async (req, res) => {
  try {
    const {
      leadId,
      leadType,
      caseStatus,
      priority,
      assignedAgent,
      comment,
      actionTaken,
      nextFollowUpDate,
      tags,
      result,
      wordCount
    } = req.body;

    // Validate required fields
    if (!leadId || !leadType) {
      return res.status(400).json({
        success: false,
        message: "Lead ID and lead type are required"
      });
    }
    
    // Validate result field when closing follow-up
    if (caseStatus === 'close') {
      if (!result || result.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Result is required when closing a follow-up"
        });
      }
    }
    
    // Helper function to count words
    const countWords = (text) => {
      if (!text || typeof text !== 'string') return 0;
      return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    };

    // Auto-assign current user if no assignedAgent provided
    const finalAssignedAgent = assignedAgent || req.user.id;

    // Verify lead exists
    let leadExists = false;
    let leadData = {};
    
    if (leadType === 'UserLeadAssignment') {
      const userLead = await UserLeadAssignment.findById(leadId)
        .populate('userId', 'fullName email phone')
        .populate('employeeId', 'name email');
      
      if (userLead) {
        leadExists = true;
        leadData = {
          userId: userLead.userId._id,
          clientName: userLead.userId.fullName,
          clientPhone: userLead.userId.phone,
          clientEmail: userLead.userId.email,
          location: `${userLead.userId.city || ''} ${userLead.userId.state || ''}`.trim()
        };
      }
    } else if (leadType === 'LeadAssignment') {
      const enquiryLead = await LeadAssignment.findById(leadId);
      
      if (enquiryLead) {
        leadExists = true;
        
        // Get enquiry details based on type
        let enquiryDetails = null;
        if (enquiryLead.enquiryType === 'Inquiry') {
          enquiryDetails = await Inquiry.findById(enquiryLead.enquiryId)
            .populate('buyerId', 'fullName email phone')
            .populate('propertyId', 'propertyType propertyLocation');
        } else if (enquiryLead.enquiryType === 'ManualInquiry') {
          enquiryDetails = await ManualInquiry.findById(enquiryLead.enquiryId);
        }
        
        if (enquiryDetails) {
          leadData = {
            enquiryId: enquiryLead.enquiryId,
            enquiryType: enquiryLead.enquiryType,
            clientName: enquiryDetails.buyerId?.fullName || enquiryDetails.clientName,
            clientPhone: enquiryDetails.buyerId?.phone || enquiryDetails.contactNumber,
            clientEmail: enquiryDetails.buyerId?.email || 'N/A',
            propertyType: enquiryDetails.propertyId?.propertyType || enquiryDetails.productType,
            location: enquiryDetails.propertyId?.propertyLocation || enquiryDetails.location
          };
        }
      }
    }

    if (!leadExists) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    // Verify agent exists
    const agent = await Employee.findById(finalAssignedAgent);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Assigned agent not found"
      });
    }

    // Create follow-up
    const followUpData = {
      leadId,
      leadType,
      leadData,
      caseStatus: caseStatus || 'open',
      priority: priority || 'medium',
      assignedAgent: finalAssignedAgent,
      createdBy: req.user.id,
      createdByType: 'Employee', // Assuming all creators are employees
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : undefined,
      tags: tags || []
    };
    
    // Add result and word count if provided (for closed follow-ups)
    if (result) {
      followUpData.result = result.trim();
      followUpData.wordCount = countWords(result);
    }
    
    // Handle closing status
    if (caseStatus === 'close') {
      followUpData.isActive = false;
      followUpData.closedDate = new Date();
      followUpData.closedBy = req.user.id;
    }

    // Add initial comment if provided
    if (comment) {
      followUpData.comments = [{
        text: comment,
        commentBy: req.user.id,
        commentByName: req.user.name || req.user.fullName,
        actionTaken: actionTaken || 'other'
      }];
    }

    const followUp = new FollowUp(followUpData);
    await followUp.save();

    // Populate the response
    await followUp.populate([
      { path: 'assignedAgent', select: 'name email phone' },
      { path: 'createdBy', select: 'name email fullName' },
      { path: 'comments.commentBy', select: 'name email fullName' }
    ]);

    res.status(201).json({
      success: true,
      message: "Follow-up created successfully",
      data: followUp
    });

  } catch (error) {
    console.error("Error creating follow-up:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create follow-up",
      error: error.message
    });
  }
};

// Get all follow-ups with filters and pagination
export const getAllFollowUps = async (req, res) => {
  try {
    const {
      caseStatus,
      leadType,
      assignedAgent,
      priority,
      outcome,
      isActive,
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (caseStatus) filter.caseStatus = caseStatus;
    if (leadType) filter.leadType = leadType;
    if (assignedAgent) filter.assignedAgent = assignedAgent;
    if (priority) filter.priority = priority;
    if (outcome) filter.outcome = outcome;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Search functionality
    if (search) {
      filter.$or = [
        { 'leadData.clientName': { $regex: search, $options: 'i' } },
        { 'leadData.clientPhone': { $regex: search, $options: 'i' } },
        { 'leadData.clientEmail': { $regex: search, $options: 'i' } },
        { 'leadData.location': { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const followUps = await FollowUp.find(filter)
      .populate('assignedAgent', 'name email phone')
      .populate('createdBy', 'name email fullName')
      .populate('comments.commentBy', 'name email fullName')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FollowUp.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Get statistics
    const stats = await FollowUp.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$caseStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        followUps,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        statistics: stats
      }
    });

  } catch (error) {
    console.error("Error getting follow-ups:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get follow-ups",
      error: error.message
    });
  }
};

// Get follow-ups for a specific lead
export const getFollowUpsByLead = async (req, res) => {
  try {
    const { leadId, leadType } = req.params;

    if (!leadId || !leadType) {
      return res.status(400).json({
        success: false,
        message: "Lead ID and lead type are required"
      });
    }

    const followUps = await FollowUp.find({ leadId, leadType })
      .populate('assignedAgent', 'name email phone')
      .populate('createdBy', 'name email fullName')
      .populate('comments.commentBy', 'name email fullName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: followUps
    });

  } catch (error) {
    console.error("Error getting follow-ups for lead:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get follow-ups for lead",
      error: error.message
    });
  }
};

// Get follow-ups assigned to the logged-in agent
export const getMyFollowUps = async (req, res) => {
  try {
    const agentId = req.user.id;
    const {
      caseStatus,
      priority,
      page = 1,
      limit = 10,
      sortBy = 'nextFollowUpDate',
      sortOrder = 'asc'
    } = req.query;

    const filter = { assignedAgent: agentId };
    
    if (caseStatus) filter.caseStatus = caseStatus;
    if (priority) filter.priority = priority;

    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const followUps = await FollowUp.find(filter)
      .populate('assignedAgent', 'name email phone')
      .populate('createdBy', 'name email fullName')
      .populate('comments.commentBy', 'name email fullName')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FollowUp.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        followUps,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error("Error getting my follow-ups:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get follow-ups",
      error: error.message
    });
  }
};

// Update follow-up status
export const updateFollowUpStatus = async (req, res) => {
  try {
    const { followUpId } = req.params;
    const { caseStatus, outcome, closeReason, nextFollowUpDate, result } = req.body;
    
    // Helper function to count words
    const countWords = (text) => {
      if (!text || typeof text !== 'string') return 0;
      return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    };

    const followUp = await FollowUp.findById(followUpId);
    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: "Follow-up not found"
      });
    }
    
    // Validate result field when closing follow-up
    if (caseStatus === 'close') {
      if (!result || result.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Result is required when closing a follow-up"
        });
      }
    }

    // Update fields
    if (caseStatus) followUp.caseStatus = caseStatus;
    if (outcome) followUp.outcome = outcome;
    if (nextFollowUpDate) followUp.nextFollowUpDate = new Date(nextFollowUpDate);
    
    // Update result and word count
    if (result) {
      followUp.result = result.trim();
      followUp.wordCount = countWords(result);
    }

    // Handle closing
    if (caseStatus === 'close' || caseStatus === 'not-interested') {
      followUp.isActive = false;
      followUp.closedDate = new Date();
      followUp.closedBy = req.user.id;
      if (closeReason) followUp.closeReason = closeReason;
    } else if (caseStatus === 'open') {
      followUp.isActive = true;
      followUp.closedDate = undefined;
      followUp.closedBy = undefined;
      followUp.closeReason = undefined;
      followUp.result = undefined;
      followUp.wordCount = 0;
    }

    await followUp.save();

    // Populate response
    await followUp.populate([
      { path: 'assignedAgent', select: 'name email phone' },
      { path: 'createdBy', select: 'name email fullName' },
      { path: 'closedBy', select: 'name email fullName' }
    ]);

    res.status(200).json({
      success: true,
      message: "Follow-up status updated successfully",
      data: followUp
    });

  } catch (error) {
    console.error("Error updating follow-up status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update follow-up status",
      error: error.message
    });
  }
};

// Add comment to follow-up
export const addFollowUpComment = async (req, res) => {
  try {
    console.log("Adding comment - User:", req.user);
    console.log("Adding comment - Body:", req.body);
    console.log("Adding comment - Params:", req.params);
    
    const { followUpId } = req.params;
    const { text, actionTaken } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required"
      });
    }

    const followUp = await FollowUp.findById(followUpId);
    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: "Follow-up not found"
      });
    }

    console.log("Found follow-up:", followUp._id);

    // Add comment
    const newComment = {
      text,
      commentBy: req.user.id,
      commentByName: req.user.name || req.user.fullName,
      actionTaken: actionTaken || 'other',
      commentDate: new Date()
    };

    followUp.comments.push(newComment);
    followUp.lastContactDate = new Date();
    
    await followUp.save();

    // Populate the new comment
    await followUp.populate('comments.commentBy', 'name email fullName');

    res.status(200).json({
      success: true,
      message: "Comment added successfully",
      data: {
        comment: followUp.comments[followUp.comments.length - 1],
        followUp
      }
    });

  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add comment",
      error: error.message
    });
  }
};

// Get follow-up statistics
export const getFollowUpStats = async (req, res) => {
  try {
    const { agentId, dateFrom, dateTo } = req.query;
    
    let matchFilter = {};
    
    if (agentId) {
      matchFilter.assignedAgent = mongoose.Types.ObjectId(agentId);
    }
    
    if (dateFrom || dateTo) {
      matchFilter.createdAt = {};
      if (dateFrom) matchFilter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchFilter.createdAt.$lte = new Date(dateTo);
    }

    const stats = await FollowUp.aggregate([
      { $match: matchFilter },
      {
        $facet: {
          statusCounts: [
            {
              $group: {
                _id: '$caseStatus',
                count: { $sum: 1 }
              }
            }
          ],
          priorityCounts: [
            {
              $group: {
                _id: '$priority',
                count: { $sum: 1 }
              }
            }
          ],
          outcomeCounts: [
            {
              $group: {
                _id: '$outcome',
                count: { $sum: 1 }
              }
            }
          ],
          leadTypeCounts: [
            {
              $group: {
                _id: '$leadType',
                count: { $sum: 1 }
              }
            }
          ],
          total: [
            {
              $count: 'total'
            }
          ]
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats[0]
    });

  } catch (error) {
    console.error("Error getting follow-up stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get follow-up statistics",
      error: error.message
    });
  }
};

// Create follow-up directly from lead data (simplified endpoint)
export const createFollowUpFromLead = async (req, res) => {
  try {
    const {
      leadType,
      leadId,
      clientName,
      clientEmail,
      clientPhone,
      followUpDate,
      notes,
      priority
    } = req.body;
    
    const employeeId = req.user.id || req.user._id;

    console.log('Creating follow-up from lead:', { leadType, leadId, clientName, followUpDate, employeeId });

    // Validate required fields
    if (!followUpDate) {
      return res.status(400).json({
        success: false,
        message: "Follow-up date is required"
      });
    }

    if (!clientName) {
      return res.status(400).json({
        success: false,
        message: "Client name is required"
      });
    }

    // Validate employeeId
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID not found in token"
      });
    }

    // Create simplified follow-up data structure
    const leadData = {
      clientName: clientName?.trim(),
      clientPhone: clientPhone?.trim(),
      clientEmail: clientEmail?.trim(),
      propertyType: 'General',
      location: 'N/A'
    };

    // Map frontend lead types to valid backend types
    let mappedLeadType = leadType || 'Lead';
    if (leadType === 'client') {
      mappedLeadType = 'client';
    } else if (leadType === 'enquiry') {
      mappedLeadType = 'enquiry';
    }

    // Create follow-up
    const followUpData = {
      leadId: leadId || null,
      leadType: mappedLeadType,
      leadData,
      caseStatus: 'open',
      priority: priority || 'medium',
      assignedAgent: employeeId,
      createdBy: employeeId,
      createdByType: 'Employee',
      nextFollowUpDate: new Date(followUpDate),
      tags: [],
      isActive: true
    };

    // Add initial comment if provided
    if (notes && notes.trim()) {
      followUpData.comments = [{
        text: notes.trim(),
        commentBy: employeeId,
        commentByName: req.user.name || req.user.fullName || 'Employee',
        actionTaken: 'follow_up_scheduled'
      }];
    }

    const followUp = new FollowUp(followUpData);
    await followUp.save();

    // Populate the response
    await followUp.populate([
      { path: 'assignedAgent', select: 'name email phone' },
      { path: 'createdBy', select: 'name email fullName' }
    ]);

    res.status(201).json({
      success: true,
      message: "Follow-up scheduled successfully",
      data: followUp
    });

  } catch (error) {
    console.error("Error creating follow-up from lead:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // More specific error messages
    let errorMessage = "Failed to schedule follow-up";
    if (error.name === 'ValidationError') {
      errorMessage = `Validation Error: ${Object.values(error.errors).map(e => e.message).join(', ')}`;
    } else if (error.name === 'CastError') {
      errorMessage = `Invalid data format: ${error.message}`;
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Delete follow-up (admin only)
export const deleteFollowUp = async (req, res) => {
  try {
    const { followUpId } = req.params;

    const followUp = await FollowUp.findByIdAndDelete(followUpId);
    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: "Follow-up not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Follow-up deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting follow-up:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete follow-up",
      error: error.message
    });
  }
};