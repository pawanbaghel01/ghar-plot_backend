import Client from "../models/clientSchema.js";
import ClientType from "../models/clientTypeSchema.js";
import Employee from "../models/employeeSchema.js";

const VALID_STATUSES = ["New", "Follow Up", "Converted", "Closed", "Lost"];

// ─── SHARED VALIDATION HELPER ──────────────────────────────────────────────────
const validateRefs = async ({ source, clientType, propertySellerType, assignedTo, status }) => {
  // Validate status enum
  if (status && !VALID_STATUSES.includes(status)) {
    return `Invalid status. Allowed values: ${VALID_STATUSES.join(", ")}`;
  }

  // Validate source (must be a ClientType with category sourceType)
  if (source) {
    const found = await ClientType.findById(source);
    if (!found) return "Source not found";
    if (found.category !== "sourceType") return "Provided source is not of category 'sourceType'";
  }

  // Validate clientType (must be a ClientType with category clientType)
  if (clientType) {
    const found = await ClientType.findById(clientType);
    if (!found) return "Client type not found";
    if (found.category !== "clientType") return "Provided clientType is not of category 'clientType'";
  }

  // Validate propertySellerType (must be a ClientType with category propertySellerType)
  if (propertySellerType) {
    const found = await ClientType.findById(propertySellerType);
    if (!found) return "Property seller type not found";
    if (found.category !== "propertySellerType")
      return "Provided propertySellerType is not of category 'propertySellerType'";
  }

  // Validate assignedTo (must be an existing Employee)
  if (assignedTo) {
    const emp = await Employee.findById(assignedTo);
    if (!emp) return "Assigned employee not found";
  }

  return null; // no error
};

// ─── CREATE ────────────────────────────────────────────────────────────────────
export const createClient = async (req, res) => {
  try {
    const {
      name,
      contactNumber,
      comments,
      source,
      clientType,
      status,
      assignedTo,
      propertySellerType,
    } = req.body;

    if (!name || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: "Name and contact number are required",
      });
    }

    const validationError = await validateRefs({ source, clientType, propertySellerType, assignedTo, status });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const client = await Client.create({
      name: name.trim(),
      contactNumber: contactNumber.trim(),
      comments: comments || "",
      source: source || null,
      clientType: clientType || null,
      status: status || "New",
      assignedTo: assignedTo || null,
      propertySellerType: propertySellerType || null,
    });

    const populated = await client.populate([
      { path: "source", select: "name category" },
      { path: "clientType", select: "name category" },
      { path: "assignedTo", select: "name email phone" },
      { path: "propertySellerType", select: "name category" },
    ]);

    return res.status(201).json({
      success: true,
      message: "Client created successfully",
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ALL ───────────────────────────────────────────────────────────────────
// Query: ?status=New  ?assignedTo=<id>  ?clientType=<id>  ?search=john
export const getAllClients = async (req, res) => {
  try {
    const { status, assignedTo, clientType, search } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (clientType) filter.clientType = clientType;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { contactNumber: { $regex: search, $options: "i" } },
      ];
    }

    const clients = await Client.find(filter)
      .populate({ path: "source", select: "name category" })
      .populate({ path: "clientType", select: "name category" })
      .populate({ path: "assignedTo", select: "name email phone" })
      .populate({ path: "propertySellerType", select: "name category" })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: clients.length,
      data: clients,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET BY ID ─────────────────────────────────────────────────────────────────
export const getClientById = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findById(id)
      .populate({ path: "source", select: "name category" })
      .populate({ path: "clientType", select: "name category" })
      .populate({ path: "assignedTo", select: "name email phone" })
      .populate({ path: "propertySellerType", select: "name category" });

    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    return res.status(200).json({ success: true, data: client });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE ────────────────────────────────────────────────────────────────────
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      contactNumber,
      comments,
      source,
      clientType,
      status,
      assignedTo,
      propertySellerType,
    } = req.body;

    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    const validationError = await validateRefs({ source, clientType, propertySellerType, assignedTo, status });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name.trim();
    if (contactNumber !== undefined) updateFields.contactNumber = contactNumber.trim();
    if (comments !== undefined) updateFields.comments = comments;
    if (source !== undefined) updateFields.source = source || null;
    if (clientType !== undefined) updateFields.clientType = clientType || null;
    if (status !== undefined) updateFields.status = status;
    if (assignedTo !== undefined) updateFields.assignedTo = assignedTo || null;
    if (propertySellerType !== undefined) updateFields.propertySellerType = propertySellerType || null;

    const updated = await Client.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    })
      .populate({ path: "source", select: "name category" })
      .populate({ path: "clientType", select: "name category" })
      .populate({ path: "assignedTo", select: "name email phone" })
      .populate({ path: "propertySellerType", select: "name category" });

    return res.status(200).json({
      success: true,
      message: "Client updated successfully",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE ────────────────────────────────────────────────────────────────────
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    await Client.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Client deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ASSIGN TO EMPLOYEE ────────────────────────────────────────────────────────
export const assignClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: "assignedTo (employee ID) is required",
      });
    }

    const emp = await Employee.findById(assignedTo);
    if (!emp) {
      return res.status(404).json({ success: false, message: "Assigned employee not found" });
    }

    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    client.assignedTo = assignedTo;
    await client.save();

    const populated = await client.populate({
      path: "assignedTo",
      select: "name email phone",
    });

    return res.status(200).json({
      success: true,
      message: "Client assigned successfully",
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
