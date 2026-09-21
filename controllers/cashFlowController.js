import CashFlow from "../models/cashFlowSchema.js";
import Employee from "../models/employeeSchema.js";
import Expense from "../models/expenseSchema.js";
import { cascadeRecalculate } from "./expenseController.js";
import { ensureTodayCashFlowsExist } from "../cron/dailyCashFlowCron.js";

// ─── GET PREVIOUS DAY'S CLOSING BALANCE (FOR AUTO OPENING BALANCE) ────────────
export const getPreviousClosingBalance = async (req, res) => {
  try {
    const { associateId } = req.params;
    const { date } = req.query;

    if (!associateId) {
      return res.status(400).json({ success: false, message: "associateId is required" });
    }

    const targetDate = date ? new Date(date) : new Date();
    const startOfTarget = new Date(targetDate);
    startOfTarget.setUTCHours(0, 0, 0, 0);

    // Find the latest CashFlow record strictly before this date
    const prevCashFlow = await CashFlow.findOne({
      businessAssociate: associateId,
      date: { $lt: startOfTarget },
    }).sort({ date: -1 });

    if (prevCashFlow) {
      return res.status(200).json({
        success: true,
        openingBalance: prevCashFlow.closingBalance || 0,
        previousDate: prevCashFlow.date,
        isInitial: false,
      });
    }

    // If no previous record found, return 0 (initial record)
    return res.status(200).json({
      success: true,
      openingBalance: 0,
      previousDate: null,
      isInitial: true,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

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

    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Check if a cash flow record already exists for this associate on this date
    let existingCashFlow = await CashFlow.findOne({
      businessAssociate,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    // If existing record exists, settle and append new cash entries into it
    if (existingCashFlow) {
      if (entries && Array.isArray(entries) && entries.length > 0) {
        existingCashFlow.entries.push(...entries);
      }

      // If opening balance was explicitly provided and existing was 0, update it
      if (openingBalance !== undefined && openingBalance !== null && !isNaN(parseFloat(openingBalance))) {
        if ((existingCashFlow.openingBalance || 0) === 0 && parseFloat(openingBalance) !== 0) {
          existingCashFlow.openingBalance = parseFloat(openingBalance);
        }
      }

      // Re-calculate today's total expenses from Expense collection
      const dailyExpenses = await Expense.find({
        businessAssociate,
        date: { $gte: startOfDay, $lte: endOfDay },
      });
      existingCashFlow.totalExpense = dailyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      await existingCashFlow.save();

      // Recalculate forward cash flows
      await cascadeRecalculate(businessAssociate, endOfDay);

      const populated = await existingCashFlow.populate([
        { path: "businessAssociate", select: "name email phone department" },
        { path: "createdBy", select: "name email" },
      ]);

      return res.status(200).json({
        success: true,
        message: "Cash Flow entry settled and merged with existing associate record successfully",
        data: populated,
      });
    }

    // Fetch previous closing balance if openingBalance is not explicitly provided or 0
    let finalOpeningBalance = openingBalance !== undefined ? parseFloat(openingBalance) : 0;
    if (openingBalance === undefined || openingBalance === null) {
      const prev = await CashFlow.findOne({
        businessAssociate,
        date: { $lt: startOfDay },
      }).sort({ date: -1 });
      if (prev) {
        finalOpeningBalance = prev.closingBalance || 0;
      }
    }

    // Check total expenses for this associate on this date
    const dailyExpenses = await Expense.find({
      businessAssociate,
      date: { $gte: startOfDay, $lte: endOfDay },
    });
    const totalExpense = dailyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const cashFlow = new CashFlow({
      businessAssociate,
      date: targetDate,
      openingBalance: finalOpeningBalance,
      entries: entries || [],
      totalExpense,
      createdBy: req.user?._id,
    });

    await cashFlow.save();

    // Recalculate forward cash flows if this was an older date entry
    await cascadeRecalculate(businessAssociate, endOfDay);

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
    // Ensure today's auto cash flow entries exist for active employees in background without blocking response
    ensureTodayCashFlowsExist().catch((err) =>
      console.error("[DailyCashFlow] Background auto-entry check error:", err)
    );

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

    // Efficiently compute expense count with a single aggregation instead of N queries
    let countMap = new Map();
    try {
      const expenseCounts = await Expense.aggregate([
        {
          $group: {
            _id: {
              businessAssociate: "$businessAssociate",
              date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            },
            count: { $sum: 1 },
          },
        },
      ]);
      for (const ec of expenseCounts) {
        if (ec._id?.businessAssociate && ec._id?.date) {
          countMap.set(`${ec._id.businessAssociate.toString()}_${ec._id.date}`, ec.count);
        }
      }
    } catch (aggErr) {
      console.warn("[CashFlow] Aggregate expense count error:", aggErr.message);
    }

    const results = cashFlows.map((cf) => {
      const cfObj = cf.toObject();
      const assocId = cf.businessAssociate?._id
        ? cf.businessAssociate._id.toString()
        : cf.businessAssociate?.toString();
      const dateStr = cf.date ? new Date(cf.date).toISOString().split("T")[0] : "";
      cfObj.expenseCount = countMap.get(`${assocId}_${dateStr}`) || 0;
      return cfObj;
    });

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results,
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
      cashFlow.openingBalance = parseFloat(openingBalance) || 0;
    }

    if (entries !== undefined) {
      cashFlow.entries = entries;
    }

    // Re-verify expenses on this date
    const startOfDay = new Date(cashFlow.date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(cashFlow.date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const dailyExpenses = await Expense.find({
      businessAssociate: cashFlow.businessAssociate,
      date: { $gte: startOfDay, $lte: endOfDay },
    });
    cashFlow.totalExpense = dailyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    await cashFlow.save();

    // Recalculate forward
    await cascadeRecalculate(cashFlow.businessAssociate, endOfDay);

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

    const { businessAssociate, date } = cashFlow;
    await CashFlow.findByIdAndDelete(id);

    // Cascade recalculate forward cash flows
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    await cascadeRecalculate(businessAssociate, endOfDay);

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
