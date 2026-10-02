import Project from "../models/projectSchema.js";
import Client from "../models/clientSchema.js";
import User from "../models/user.js";
import Expense from "../models/expenseSchema.js";

// Helper to resolve client: checks Client collection, if not found checks User collection and auto-syncs
const resolveClientOrUser = async (clientIdOrUserId) => {
  let clientDoc = await Client.findById(clientIdOrUserId);
  if (clientDoc) return clientDoc._id;

  // Check if it's a registered User
  const userDoc = await User.findById(clientIdOrUserId);
  if (userDoc) {
    // Check if Client already exists with this phone
    let existingClient = await Client.findOne({ contactNumber: userDoc.phone });
    if (!existingClient) {
      existingClient = await Client.create({
        name: userDoc.fullName,
        contactNumber: userDoc.phone,
        comments: "Auto-synced from registered user",
        status: "Converted",
      });
    }
    return existingClient._id;
  }

  return null;
};

// ─── CREATE ────────────────────────────────────────────────────────────────────
export const createProject = async (req, res) => {
  try {
    const { projectName, client, status, assignedEmployees } = req.body;

    if (!projectName || !client) {
      return res.status(400).json({
        success: false,
        message: "Project name and client are required",
      });
    }

    // Validate client or user exists
    const resolvedClientId = await resolveClientOrUser(client);
    if (!resolvedClientId) {
      return res.status(404).json({
        success: false,
        message: "Client or registered user not found",
      });
    }

    let normalizedStatus = status || "Active";
    if (normalizedStatus.toLowerCase() === "inactive") {
      normalizedStatus = "Inactive";
    } else if (normalizedStatus.toLowerCase() === "complete" || normalizedStatus.toLowerCase() === "completed") {
      normalizedStatus = "Completed";
    } else {
      normalizedStatus = "Active";
    }

    const project = await Project.create({
      projectName: projectName.trim(),
      client: resolvedClientId,
      assignedEmployees: Array.isArray(assignedEmployees) ? assignedEmployees : (assignedEmployees ? [assignedEmployees] : []),
      status: normalizedStatus,
    });

    const populated = await project.populate({
      path: "client",
      select: "name contactNumber status assignedTo",
    });

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── GET ALL ───────────────────────────────────────────────────────────────────
// Query: ?status=Active  ?client=<id>  ?search=projectName  ?employeeId=<id>
export const getAllProjects = async (req, res) => {
  try {
    const { status, client, search, employeeId } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (client) filter.client = client;
    if (search) filter.projectName = { $regex: search, $options: "i" };

    if (employeeId) {
      // Find clients assigned to this employee
      const assignedClients = await Client.find({ assignedTo: employeeId }).select('_id');
      const clientIds = assignedClients.map(c => c._id);

      // Find projects where this employee has logged expenses
      let expenseProjectIds = [];
      try {
        expenseProjectIds = await Expense.distinct('project', { businessAssociate: employeeId });
      } catch (e) {
        console.warn('Error finding expense project IDs:', e);
      }

      filter.$or = [
        { assignedEmployees: employeeId },
        { client: { $in: clientIds } },
        { _id: { $in: expenseProjectIds } },
      ];
    }

    const projects = await Project.find(filter)
      .populate({ path: "client", select: "name contactNumber status assignedTo" })
      .populate({ path: "assignedEmployees", select: "name email phone" })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── GET BY ID ─────────────────────────────────────────────────────────────────
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id).populate({
      path: "client",
      select: "name contactNumber status",
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── UPDATE ────────────────────────────────────────────────────────────────────
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { projectName, client, status, assignedEmployees } = req.body;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const updateFields = {};
    if (projectName !== undefined) updateFields.projectName = projectName.trim();
    if (assignedEmployees !== undefined) {
      updateFields.assignedEmployees = Array.isArray(assignedEmployees) ? assignedEmployees : (assignedEmployees ? [assignedEmployees] : []);
    }
    if (client !== undefined) {
      const resolvedClientId = await resolveClientOrUser(client);
      if (!resolvedClientId) {
        return res.status(404).json({
          success: false,
          message: "Client or registered user not found",
        });
      }
      updateFields.client = resolvedClientId;
    }
    if (status !== undefined) {
      let normalizedStatus = status;
      if (normalizedStatus.toLowerCase() === "inactive") {
        normalizedStatus = "Inactive";
      } else if (normalizedStatus.toLowerCase() === "complete" || normalizedStatus.toLowerCase() === "completed") {
        normalizedStatus = "Completed";
      } else {
        normalizedStatus = "Active";
      }
      updateFields.status = normalizedStatus;
    }

    const updated = await Project.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    })
      .populate({ path: "client", select: "name contactNumber status assignedTo" })
      .populate({ path: "assignedEmployees", select: "name email phone" });

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── DELETE ────────────────────────────────────────────────────────────────────
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    await Project.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
