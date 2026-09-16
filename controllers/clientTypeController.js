import ClientType from "../models/clientTypeSchema.js";

export const createClientType = async (req, res) => {
  try {
    const { name, category } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const existing = await ClientType.findOne({
      name: name.trim(),
      category,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `${category} already exists`,
      });
    }

    const clientType = await ClientType.create({
      name: name.trim(),
      category,
    });

    return res.status(201).json({
      success: true,
      message: "Created successfully",
      data: clientType,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── GET ALL (optionally filter by category) ───────────────────────────────────
// Query: ?category=clientType  or  ?category=sourceType  (omit for all)

export const getClientTypes = async (req, res) => {
  try {
    const { category } = req.query;

    const filter = {};

    if (category) {
      filter.category = category;
    }

    const data = await ClientType.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── GET BY ID ─────────────────────────────────────────────────────────────────
export const getClientTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await ClientType.findById(id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── UPDATE ────────────────────────────────────────────────────────────────────
export const updateClientType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category } = req.body;

    const existing = await ClientType.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    const duplicate = await ClientType.findOne({
      _id: { $ne: id },
      name: name?.trim(),
      category,
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `${category} already exists`,
      });
    }

    const updated = await ClientType.findByIdAndUpdate(
      id,
      {
        ...(name && { name: name.trim() }),
        ...(category && { category }),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Updated successfully",
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
export const deleteClientType = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await ClientType.findById(id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    await ClientType.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
