import WorkStatus from "../models/workStatusSchema.js";
import Project from "../models/projectSchema.js";
import Client from "../models/clientSchema.js";
import { syncWorkStatusFromCSV } from "../scripts/sync_work_status.js";

// Helper: parse date DD-MM-YYYY or ISO
const parseDateString = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.trim().split(/[-/]/);
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    const month = parseInt(m, 10) - 1;
    const day = parseInt(d, 10);
    return new Date(Date.UTC(year, month, day, 0, 0, 0));
  }
  return new Date(dateStr);
};

/**
 * GET /admin/work-status
 * Filter by project, client, date, fromDate, toDate, search, etc.
 */
export const getWorkStatuses = async (req, res) => {
  try {
    const {
      project,
      client,
      date,
      fromDate,
      toDate,
      search,
      hasContent,
      page = 1,
      limit = 50,
      export: isExport,
    } = req.query;

    const query = {};

    // Filter by Project (ObjectId or Name)
    if (project) {
      if (project.match(/^[0-9a-fA-F]{24}$/)) {
        query.project = project;
      } else {
        query.projectName = new RegExp(project.trim(), "i");
      }
    }

    // Filter by Client (ObjectId or Name)
    if (client) {
      if (client.match(/^[0-9a-fA-F]{24}$/)) {
        query.client = client;
      } else {
        query.clientName = new RegExp(client.trim(), "i");
      }
    }

    // Filter by Single Date (dateStr or date)
    if (date) {
      const dateFormatted = date.trim();
      query.$or = [
        { dateStr: dateFormatted },
        {
          date: {
            $gte: parseDateString(dateFormatted),
            $lte: new Date(parseDateString(dateFormatted).getTime() + 86400000 - 1),
          },
        },
      ];
    } else if (fromDate || toDate) {
      query.date = {};
      if (fromDate) {
        query.date.$gte = parseDateString(fromDate);
      }
      if (toDate) {
        const toObj = parseDateString(toDate);
        toObj.setUTCHours(23, 59, 59, 999);
        query.date.$lte = toObj;
      }
    }

    // Search query
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { projectName: regex },
        { clientName: regex },
        { today: regex },
        { tomorrow: regex },
        { dayAfterTomorrow: regex },
        { createdBy: regex },
      ];
    }

    // Filter by hasContent
    if (hasContent === "true" || hasContent === "1") {
      query.$or = [
        { today: { $exists: true, $ne: "" } },
        { tomorrow: { $exists: true, $ne: "" } },
        { dayAfterTomorrow: { $exists: true, $ne: "" } },
      ];
    }

    // Export all matching without pagination
    if (isExport === "true" || isExport === "1") {
      const allData = await WorkStatus.find(query)
        .sort({ date: -1, projectName: 1 })
        .populate("project", "projectName status")
        .populate("client", "name contactNumber")
        .lean();

      return res.status(200).json({
        success: true,
        total: allData.length,
        data: allData,
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      WorkStatus.find(query)
        .sort({ date: -1, projectName: 1 })
        .skip(skip)
        .limit(limitNum)
        .populate("project", "projectName status")
        .populate("client", "name contactNumber")
        .lean(),
      WorkStatus.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Error in getWorkStatuses:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching work status",
      error: error.message,
    });
  }
};

/**
 * GET /admin/work-status/:id
 */
export const getWorkStatusById = async (req, res) => {
  try {
    const { id } = req.params;
    const workStatus = await WorkStatus.findById(id)
      .populate("project")
      .populate("client")
      .populate("createdByUser", "name email");

    if (!workStatus) {
      return res.status(404).json({ success: false, message: "Work status not found" });
    }

    return res.status(200).json({ success: true, data: workStatus });
  } catch (error) {
    console.error("Error in getWorkStatusById:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * POST /admin/work-status
 * Create or Upsert a work status entry for a project & date
 */
export const createWorkStatus = async (req, res) => {
  try {
    let {
      projectName,
      project,
      clientName,
      client,
      date,
      dateStr,
      today = "",
      tomorrow = "",
      dayAfterTomorrow = "",
      createdBy = "Admin",
      notes = "",
    } = req.body;

    if (!projectName && !project) {
      return res.status(400).json({ success: false, message: "Project Name or Project ID is required" });
    }

    // Resolve project details if only ID or Name provided
    if (project && !projectName) {
      const pDoc = await Project.findById(project).populate("client");
      if (pDoc) {
        projectName = pDoc.projectName;
        if (!client && pDoc.client) {
          client = pDoc.client._id;
          clientName = pDoc.client.name;
        }
      }
    } else if (projectName && !project) {
      const pDoc = await Project.findOne({ projectName: projectName.trim() });
      if (pDoc) project = pDoc._id;
    }

    // Resolve client
    if (client && !clientName) {
      const cDoc = await Client.findById(client);
      if (cDoc) clientName = cDoc.name;
    } else if (clientName && !client) {
      const cDoc = await Client.findOne({ name: clientName.trim() });
      if (cDoc) client = cDoc._id;
    }

    if (!dateStr && date) {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, "0");
      const mon = String(d.getMonth() + 1).padStart(2, "0");
      const yr = d.getFullYear();
      dateStr = `${day}-${mon}-${yr}`;
    } else if (!dateStr) {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const mon = String(now.getMonth() + 1).padStart(2, "0");
      const yr = now.getFullYear();
      dateStr = `${day}-${mon}-${yr}`;
    }

    const dateObj = parseDateString(dateStr);

    const filter = { projectName: projectName.trim(), dateStr: dateStr.trim() };
    const updateDoc = {
      projectName: projectName.trim(),
      project: project || null,
      clientName: (clientName || "").trim(),
      client: client || null,
      date: dateObj,
      dateStr: dateStr.trim(),
      today: today.trim(),
      tomorrow: tomorrow.trim(),
      dayAfterTomorrow: dayAfterTomorrow.trim(),
      createdBy: createdBy || "Admin",
      notes: notes.trim(),
    };

    const doc = await WorkStatus.findOneAndUpdate(filter, updateDoc, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    return res.status(201).json({
      success: true,
      message: "Work status saved successfully",
      data: doc,
    });
  } catch (error) {
    console.error("Error in createWorkStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating work status",
      error: error.message,
    });
  }
};

/**
 * PUT /admin/work-status/:id
 * Update an existing work status
 */
export const updateWorkStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { today, tomorrow, dayAfterTomorrow, notes, createdBy } = req.body;

    const updateFields = {};
    if (today !== undefined) updateFields.today = today.trim();
    if (tomorrow !== undefined) updateFields.tomorrow = tomorrow.trim();
    if (dayAfterTomorrow !== undefined) updateFields.dayAfterTomorrow = dayAfterTomorrow.trim();
    if (notes !== undefined) updateFields.notes = notes.trim();
    if (createdBy !== undefined) updateFields.createdBy = createdBy.trim();

    const updated = await WorkStatus.findByIdAndUpdate(id, { $set: updateFields }, { new: true });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Work status not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Work status updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error in updateWorkStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating work status",
      error: error.message,
    });
  }
};

/**
 * DELETE /admin/work-status/:id
 */
export const deleteWorkStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await WorkStatus.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Work status not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Work status deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteWorkStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting work status",
      error: error.message,
    });
  }
};

/**
 * POST /admin/work-status/sync
 * Manually trigger CSV synchronization
 */
export const syncFromCsv = async (req, res) => {
  try {
    const result = await syncWorkStatusFromCSV();
    return res.status(200).json({
      success: true,
      message: "Work status synchronized successfully from CSV",
      result,
    });
  } catch (error) {
    console.error("Error syncing from CSV:", error);
    return res.status(500).json({
      success: false,
      message: "Sync failed",
      error: error.message,
    });
  }
};
