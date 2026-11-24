import SiteTool from "../models/siteToolSchema.js";
import SiteToolTransfer from "../models/siteToolTransferSchema.js";
import { generateToolCode, generateTransferCode } from "../utils/counterHelper.js";

const DEFAULT_TOOLS = [
  {
    toolName: "Hammer Drill",
    businessAssociate: "admin",
    totalQty: 10,
    usedQty: 4,
    transferredQty: 2,
    closingQty: 4,
    dateStr: "10-09-2023",
    details: "Assigned for electrical conduit and masonry drill work at site",
  },
  {
    toolName: "Concrete Vibrator",
    businessAssociate: "admin",
    totalQty: 6,
    usedQty: 2,
    transferredQty: 1,
    closingQty: 3,
    dateStr: "15-10-2023",
    details: "Used for foundation, column & slab casting",
  },
  {
    toolName: "Plate Compactor",
    businessAssociate: "pawan",
    totalQty: 4,
    usedQty: 1,
    transferredQty: 0,
    closingQty: 3,
    dateStr: "28-10-2023",
    details: "Soil compaction and subbase preparation at Zone Inspire",
  },
  {
    toolName: "Cutter Machine",
    businessAssociate: "AslamKhan",
    totalQty: 8,
    usedQty: 3,
    transferredQty: 2,
    closingQty: 3,
    dateStr: "05-11-2023",
    details: "Tile and marble precision cutting machine",
  },
  {
    toolName: "Welding Machine",
    businessAssociate: "admin",
    totalQty: 5,
    usedQty: 2,
    transferredQty: 1,
    closingQty: 2,
    dateStr: "12-11-2023",
    details: "ARC Welding for reinforcement steel and gate structure",
  },
];

// ==========================================
// TOOL CRUD CONTROLLERS
// ==========================================

export const getSiteTools = async (req, res) => {
  try {
    const { ba, tool, date, search } = req.query;
    const filter = {};

    if (ba) filter.businessAssociate = { $regex: new RegExp(ba, "i") };
    if (tool) filter.toolName = { $regex: new RegExp(tool, "i") };
    if (date) filter.dateStr = { $regex: new RegExp(date, "i") };

    if (search) {
      const q = new RegExp(search, "i");
      filter.$or = [
        { toolName: q },
        { toolCode: q },
        { businessAssociate: q },
        { details: q },
      ];
    }

    let tools = await SiteTool.find(filter).sort({ createdAt: -1 });

    // Auto-seed if empty and no filters
    if (tools.length === 0 && Object.keys(filter).length === 0) {
      const count = await SiteTool.countDocuments();
      if (count === 0) {
        for (const item of DEFAULT_TOOLS) {
          const code = await generateToolCode();
          await SiteTool.create({
            ...item,
            toolCode: code,
          });
        }
        tools = await SiteTool.find(filter).sort({ createdAt: -1 });
      }
    }

    res.status(200).json({
      success: true,
      data: tools,
    });
  } catch (error) {
    console.error("Error fetching site tools:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch site tools",
      error: error.message,
    });
  }
};

export const createSiteTool = async (req, res) => {
  try {
    const {
      toolName,
      businessAssociate,
      totalQty,
      usedQty = 0,
      details,
      date,
      dateStr,
    } = req.body;

    if (!toolName || !toolName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tool name is required",
      });
    }

    const total = parseInt(totalQty, 10);
    if (isNaN(total) || total < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid total quantity is required",
      });
    }

    const used = parseInt(usedQty, 10) || 0;
    const closing = Math.max(0, total - used);
    const toolCode = await generateToolCode();
    const parsedDate = date ? new Date(date) : new Date();

    const newTool = await SiteTool.create({
      toolCode,
      toolName: toolName.trim(),
      businessAssociate: businessAssociate?.trim() || "admin",
      totalQty: total,
      usedQty: used,
      transferredQty: 0,
      closingQty: closing,
      date: parsedDate,
      dateStr: dateStr?.trim() || new Date().toISOString().slice(0, 10),
      details: details?.trim() || "",
      status: "Active",
    });

    res.status(201).json({
      success: true,
      message: "Tool created successfully",
      data: newTool,
    });
  } catch (error) {
    console.error("Error creating site tool:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create site tool",
      error: error.message,
    });
  }
};

export const updateSiteTool = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      toolName,
      businessAssociate,
      totalQty,
      usedQty,
      transferredQty,
      details,
      dateStr,
      status,
    } = req.body;

    const tool = await SiteTool.findById(id);
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: "Tool not found",
      });
    }

    if (toolName !== undefined) tool.toolName = toolName.trim();
    if (businessAssociate !== undefined) tool.businessAssociate = businessAssociate.trim();
    if (totalQty !== undefined) tool.totalQty = Math.max(0, parseInt(totalQty, 10) || 0);
    if (usedQty !== undefined) tool.usedQty = Math.max(0, parseInt(usedQty, 10) || 0);
    if (transferredQty !== undefined) tool.transferredQty = Math.max(0, parseInt(transferredQty, 10) || 0);
    if (details !== undefined) tool.details = details.trim();
    if (dateStr !== undefined) tool.dateStr = dateStr;
    if (status !== undefined) tool.status = status;

    // Recalculate closing quantity
    tool.closingQty = Math.max(0, tool.totalQty - tool.usedQty - tool.transferredQty);

    await tool.save();

    res.status(200).json({
      success: true,
      message: "Tool updated successfully",
      data: tool,
    });
  } catch (error) {
    console.error("Error updating site tool:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update site tool",
      error: error.message,
    });
  }
};

export const deleteSiteTool = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await SiteTool.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Tool not found",
      });
    }

    // Delete associated transfers
    await SiteToolTransfer.deleteMany({ toolId: id });

    res.status(200).json({
      success: true,
      message: "Tool deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting site tool:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete site tool",
      error: error.message,
    });
  }
};

// ==========================================
// TOOL VERIFICATION & TRANSFER CONTROLLERS
// ==========================================

export const verifyAndTransferTool = async (req, res) => {
  try {
    const { toolId, toolCode, toolName, businessAssociate, assignedAgent, quantity, remarks, dateStr } = req.body;

    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid transfer quantity greater than 0 is required",
      });
    }

    if (!assignedAgent || !assignedAgent.trim()) {
      return res.status(400).json({
        success: false,
        message: "Assigned Agent/Incharge is required",
      });
    }

    // Find the tool by ID, or by toolCode, or by matching BA + toolName
    let tool;
    if (toolId) {
      tool = await SiteTool.findById(toolId);
    } else if (toolCode) {
      tool = await SiteTool.findOne({ toolCode });
    } else if (toolName && businessAssociate) {
      tool = await SiteTool.findOne({
        businessAssociate: { $regex: new RegExp(`^${businessAssociate.trim()}$`, "i") },
        toolName: { $regex: new RegExp(`^${toolName.trim()}$`, "i") },
        closingQty: { $gte: qty },
      });
      if (!tool) {
        tool = await SiteTool.findOne({
          businessAssociate: { $regex: new RegExp(`^${businessAssociate.trim()}$`, "i") },
          toolName: { $regex: new RegExp(`^${toolName.trim()}$`, "i") },
        });
      }
    }

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: "Matching tool record not found for verification",
      });
    }

    if (tool.closingQty < qty) {
      return res.status(400).json({
        success: false,
        message: `Transfer quantity (${qty}) exceeds available closing quantity (${tool.closingQty}) for ${tool.toolName} [${tool.toolCode}]`,
      });
    }

    // Deduct from closingQty and add to transferredQty
    tool.transferredQty = (tool.transferredQty || 0) + qty;
    tool.closingQty = Math.max(0, tool.totalQty - tool.usedQty - tool.transferredQty);
    await tool.save();

    // Create Transfer / Verification Log
    const transferCode = await generateTransferCode();
    const transferLog = await SiteToolTransfer.create({
      transferCode,
      toolId: tool._id,
      toolCode: tool.toolCode,
      toolName: tool.toolName,
      businessAssociate: tool.businessAssociate,
      assignedAgent: assignedAgent.trim(),
      quantity: qty,
      transferDate: new Date(),
      dateStr: dateStr?.trim() || new Date().toISOString().slice(0, 10),
      status: "Verified",
      remarks: remarks?.trim() || "",
    });

    res.status(200).json({
      success: true,
      message: `${qty} units of ${tool.toolName} (${tool.toolCode}) verified and assigned to ${assignedAgent}`,
      data: {
        tool,
        transfer: transferLog,
      },
    });
  } catch (error) {
    console.error("Error in verifyAndTransferTool:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify and transfer tool",
      error: error.message,
    });
  }
};

export const getToolTransfers = async (req, res) => {
  try {
    const { toolCode, assignedAgent } = req.query;
    const filter = {};
    if (toolCode) filter.toolCode = toolCode;
    if (assignedAgent) filter.assignedAgent = { $regex: new RegExp(assignedAgent, "i") };

    const transfers = await SiteToolTransfer.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: transfers,
    });
  } catch (error) {
    console.error("Error fetching tool transfers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tool transfers",
      error: error.message,
    });
  }
};
