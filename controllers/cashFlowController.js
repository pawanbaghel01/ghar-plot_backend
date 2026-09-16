import CashFlow from "../models/cashFlowSchema.js";
import Employee from "../models/employeeSchema.js";

// ─── CREATE CASH FLOW ──────────────────────────────────────────────────────────
export const createCashFlow = async (req, res) => {
  try {
    const { businessAssociate, date, openingBalance, entries } = req.body;

    if (!businessAssociate || !date) {
      return res.status(400).json({
        success: false,
        message: "businessAssociate and date are required fields",
      });
    }

    // Validate businessAssociate exists
    const employeeExists = await Employee.findById(businessAssociate);
    if (!employeeExists) {
      return res.status(404).json({
        success: false,
        message: "Business Associate (Employee) not found",
      });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    // Check if a cash flow record already exists for this businessAssociate on this calendar date
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existing = await CashFlow.findOne({
      businessAssociate,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A cash flow entry already exists for this business associate on this date",
      });
    }

    const cashFlow = new CashFlow({
      businessAssociate,
      date: targetDate,
      openingBalance: openingBalance !== undefined ? openingBalance : 0,
      entries: entries || [],
      createdBy: req.user?._id,
    });

    await cashFlow.save();

    const populated = await cashFlow.populate([
      { path: "businessAssociate", select: "name email phone department" },
      { path: "createdBy", select: "name email" },
    ]);

    return res.status(201).json({
      success: true,
      message: "Cash Flow entry created successfully",
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── GET ALL CASH FLOWS ────────────────────────────────────────────────────────
export const getAllCashFlows = async (req, res) => {
  try {
    const { businessAssociate, startDate, endDate } = req.query;

    const filter = {};
    if (businessAssociate) {
      filter.businessAssociate = businessAssociate;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }

    const cashFlows = await CashFlow.find(filter)
      .populate([
        { path: "businessAssociate", select: "name email phone department" },
        { path: "createdBy", select: "name email" },
      ])
      .sort({ date: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: cashFlows.length,
      data: cashFlows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── GET CASH FLOW BY ID ───────────────────────────────────────────────────────
export const getCashFlowById = async (req, res) => {
  try {
    const { id } = req.params;

    const cashFlow = await CashFlow.findById(id).populate([
      { path: "businessAssociate", select: "name email phone department" },
      { path: "createdBy", select: "name email" },
    ]);

    if (!cashFlow) {
      return res.status(404).json({
        success: false,
        message: "Cash Flow record not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: cashFlow,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── UPDATE CASH FLOW ──────────────────────────────────────────────────────────
export const updateCashFlow = async (req, res) => {
  try {
    const { id } = req.params;
    const { businessAssociate, date, openingBalance, entries } = req.body;

    const cashFlow = await CashFlow.findById(id);
    if (!cashFlow) {
      return res.status(404).json({
        success: false,
        message: "Cash Flow record not found",
      });
    }

    if (businessAssociate !== undefined) {
      // Validate businessAssociate exists
      const employeeExists = await Employee.findById(businessAssociate);
      if (!employeeExists) {
        return res.status(404).json({
          success: false,
          message: "Business Associate (Employee) not found",
        });
      }
      cashFlow.businessAssociate = businessAssociate;
    }

    if (date !== undefined) {
      const targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format",
        });
      }
      cashFlow.date = targetDate;
    }

    if (openingBalance !== undefined) {
      cashFlow.openingBalance = openingBalance;
    }

    if (entries !== undefined) {
      cashFlow.entries = entries;
    }

    // Save will trigger the pre-save hook to calculate totalReceived and closingBalance
    await cashFlow.save();

    const populated = await cashFlow.populate([
      { path: "businessAssociate", select: "name email phone department" },
      { path: "createdBy", select: "name email" },
    ]);

    return res.status(200).json({
      success: true,
      message: "Cash Flow entry updated successfully",
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── DELETE CASH FLOW ──────────────────────────────────────────────────────────
export const deleteCashFlow = async (req, res) => {
  try {
    const { id } = req.params;

    const cashFlow = await CashFlow.findById(id);
    if (!cashFlow) {
      return res.status(404).json({
        success: false,
        message: "Cash Flow record not found",
      });
    }

    await CashFlow.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Cash Flow entry deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
