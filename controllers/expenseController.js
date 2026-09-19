import Expense from "../models/expenseSchema.js";
import ExpenseCategory from "../models/expenseCategorySchema.js";
import Project from "../models/projectSchema.js";
import Employee from "../models/employeeSchema.js";
import Client from "../models/clientSchema.js";
import CashFlow from "../models/cashFlowSchema.js";
import mongoose from "mongoose";

const DEFAULT_CATEGORIES = [
  "Keele",
  "Eat",
  "Sariya",
  "Kulhadi",
  "Fabda",
  "Materials",
  "Labor",
  "Equipment",
  "Utility",
  "Others",
];

// Helper: Sync CashFlow totalExpense and cascade forward balances
export const syncCashFlowExpense = async (businessAssociateId, dateObj) => {
  try {
    const targetDate = new Date(dateObj);
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Sum all expenses for this associate on this date
    const dailyExpenses = await Expense.find({
      businessAssociate: businessAssociateId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    const totalExpense = dailyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Find existing cashflow
    let cashFlow = await CashFlow.findOne({
      businessAssociate: businessAssociateId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (cashFlow) {
      cashFlow.totalExpense = totalExpense;
      cashFlow.closingBalance =
        (cashFlow.openingBalance || 0) +
        (cashFlow.totalReceived || 0) -
        totalExpense;
      await cashFlow.save();

      // Recalculate forward cash flows for this associate
      await cascadeRecalculate(businessAssociateId, endOfDay);
    } else if (totalExpense > 0) {
      // Auto-create cash flow for this random/back-dated entry so balances stay intact
      const prev = await CashFlow.findOne({
        businessAssociate: businessAssociateId,
        date: { $lt: startOfDay },
      }).sort({ date: -1 });

      const openingBal = prev ? (prev.closingBalance || 0) : 0;
      cashFlow = new CashFlow({
        businessAssociate: businessAssociateId,
        date: startOfDay,
        openingBalance: openingBal,
        totalReceived: 0,
        totalExpense: totalExpense,
        closingBalance: openingBal - totalExpense,
        entries: [],
      });
      await cashFlow.save();
      await cascadeRecalculate(businessAssociateId, endOfDay);
    }
  } catch (err) {
    console.error("Error in syncCashFlowExpense:", err);
  }
};

// Helper: Cascade recalculate forward cash flows for an associate
export const cascadeRecalculate = async (businessAssociateId, fromDate) => {
  try {
    const forwardCashFlows = await CashFlow.find({
      businessAssociate: businessAssociateId,
      date: { $gt: fromDate },
    }).sort({ date: 1 });

    let currentPrev = await CashFlow.findOne({
      businessAssociate: businessAssociateId,
      date: { $lte: fromDate },
    }).sort({ date: -1 });

    let runningClosingBalance = currentPrev ? currentPrev.closingBalance : 0;

    for (const cf of forwardCashFlows) {
      cf.openingBalance = runningClosingBalance;
      cf.closingBalance =
        cf.openingBalance + (cf.totalReceived || 0) - (cf.totalExpense || 0);
      await cf.save();
      runningClosingBalance = cf.closingBalance;
    }
  } catch (err) {
    console.error("Error in cascadeRecalculate:", err);
  }
};

// ─── CREATE EXPENSE ────────────────────────────────────────────────────────────
export const createExpense = async (req, res) => {
  try {
    const {
      project,
      client,
      businessAssociate,
      category,
      itemName,
      quantity,
      unit,
      amount,
      paidTo,
      date,
      paymentType,
      remarks,
    } = req.body;

    if (!project || !businessAssociate || !category || amount === undefined || !paidTo || !date) {
      return res.status(400).json({
        success: false,
        message: "project, businessAssociate, category, amount, paidTo, and date are required.",
      });
    }

    // Validate project
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Validate associate
    const associateDoc = await Employee.findById(businessAssociate);
    if (!associateDoc) {
      return res.status(404).json({ success: false, message: "Business Associate not found" });
    }

    // Resolve client: either passed or picked from project
    let clientId = client;
    if (!clientId && projectDoc.client) {
      clientId = projectDoc.client;
    }

    const expenseDate = new Date(date);
    if (isNaN(expenseDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }

    const expense = new Expense({
      project,
      client: clientId,
      businessAssociate,
      category: category.trim(),
      itemName: itemName ? itemName.trim() : "",
      quantity: parseFloat(quantity) || 1,
      unit: unit ? unit.trim() : "Pcs",
      amount: parseFloat(amount) || 0,
      paidTo: paidTo.trim(),
      date: expenseDate,
      paymentType: paymentType || "Cash",
      remarks: remarks ? remarks.trim() : "",
      createdBy: req.user?._id || businessAssociate,
    });

    await expense.save();

    // Sync Cash Flow for this associate on this date
    await syncCashFlowExpense(businessAssociate, expenseDate);

    const populated = await expense.populate([
      { path: "project", select: "projectName status" },
      { path: "client", select: "name contactNumber" },
      { path: "businessAssociate", select: "name email phone department" },
    ]);

    return res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ALL EXPENSES (WITH 7-ATTRIBUTE ADVANCED FILTERS) ──────────────────────
export const getAllExpenses = async (req, res) => {
  try {
    const {
      businessAssociate,
      client,
      project,
      status, // Project status: Active, Completed
      category,
      paymentType,
      startDate,
      endDate,
      search,
    } = req.query;

    const filter = {};

    if (businessAssociate) {
      filter.businessAssociate = businessAssociate;
    }

    if (client) {
      filter.client = client;
    }

    if (project) {
      filter.project = project;
    }

    if (category) {
      filter.category = category;
    }

    if (paymentType) {
      filter.paymentType = paymentType;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        filter.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { itemName: { $regex: search, $options: "i" } },
        { paidTo: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { remarks: { $regex: search, $options: "i" } },
      ];
    }

    // If project status filter is applied, query matching project IDs first
    if (status) {
      const matchingProjects = await Project.find({ status }).select("_id");
      const projectIds = matchingProjects.map((p) => p._id);
      if (filter.project) {
        // Intersect if both provided
        if (!projectIds.some((id) => id.toString() === filter.project.toString())) {
          return res.status(200).json({
            success: true,
            count: 0,
            totalAmount: 0,
            data: [],
          });
        }
      } else {
        filter.project = { $in: projectIds };
      }
    }

    const expenses = await Expense.find(filter)
      .populate([
        { path: "project", select: "projectName status" },
        { path: "client", select: "name contactNumber" },
        { path: "businessAssociate", select: "name email phone department" },
      ])
      .sort({ date: -1, createdAt: -1 });

    const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return res.status(200).json({
      success: true,
      count: expenses.length,
      totalAmount,
      data: expenses,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET DAILY PROJECT EXPENSE SHEET (GROUPED BY PROJECT FOR SINGLE SHEET VIEW) ───
export const getDailyProjectExpenseSheet = async (req, res) => {
  try {
    const { date, businessAssociate, project } = req.query;

    let targetDate = date ? new Date(date) : new Date();
    if (isNaN(targetDate.getTime())) {
      targetDate = new Date();
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const query = {
      date: { $gte: startOfDay, $lte: endOfDay },
    };

    if (businessAssociate) {
      if (mongoose.Types.ObjectId.isValid(businessAssociate)) {
        query.businessAssociate = businessAssociate;
      } else {
        const foundEmp = await Employee.findOne({ name: businessAssociate });
        if (foundEmp) query.businessAssociate = foundEmp._id;
        else query.businessAssociate = businessAssociate;
      }
    }
    if (project) {
      if (mongoose.Types.ObjectId.isValid(project)) {
        query.project = project;
      } else {
        const foundP = await Project.findOne({ projectName: project });
        if (foundP) query.project = foundP._id;
        else query.project = project;
      }
    }

    const expenses = await Expense.find(query)
      .populate([
        { path: "project", select: "projectName status client" },
        { path: "client", select: "name contactNumber" },
        { path: "businessAssociate", select: "name email phone department" },
      ])
      .sort({ createdAt: 1 });

    // Group expenses by Project
    const projectMap = new Map();
    let totalDayExpense = 0;

    for (const exp of expenses) {
      const projId = exp.project?._id ? String(exp.project._id) : "unassigned";
      const projName = exp.project?.projectName || "Unassigned / General Site";
      const projStatus = exp.project?.status || "Active";
      const clientName = exp.client?.name || "N/A";
      const clientContact = exp.client?.contactNumber || "";

      if (!projectMap.has(projId)) {
        projectMap.set(projId, {
          projectId: projId,
          projectName: projName,
          projectStatus: projStatus,
          clientName: clientName,
          clientContact: clientContact,
          projectSubtotal: 0,
          itemsCount: 0,
          expenses: [],
        });
      }

      const projGroup = projectMap.get(projId);
      const amt = Number(exp.amount) || 0;
      projGroup.projectSubtotal += amt;
      projGroup.itemsCount += 1;
      totalDayExpense += amt;

      projGroup.expenses.push({
        id: exp._id,
        category: exp.category,
        itemName: exp.itemName || "",
        quantity: exp.quantity || 1,
        unit: exp.unit || "Pcs",
        amount: amt,
        paidTo: exp.paidTo || "",
        paymentType: exp.paymentType || "Cash",
        remarks: exp.remarks || "",
        associateName: exp.businessAssociate?.name || "N/A",
        associateId: exp.businessAssociate?._id || "",
        date: exp.date,
        createdAt: exp.createdAt,
      });
    }

    const projectSheets = Array.from(projectMap.values());

    return res.status(200).json({
      success: true,
      date: targetDate.toISOString().split("T")[0],
      totalDayExpense,
      totalProjectsCount: projectSheets.length,
      totalExpensesCount: expenses.length,
      data: projectSheets,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── BATCH CREATE EXPENSES (MULTIPLE PROJECTS / MULTIPLE CATEGORIES) ───────────
export const createBatchExpenses = async (req, res) => {
  try {
    const { expenses } = req.body;
    if (!Array.isArray(expenses) || expenses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "expenses array is required and cannot be empty.",
      });
    }

    const createdRecords = [];
    const associatesToSync = new Map();

    for (const item of expenses) {
      const {
        project,
        client,
        businessAssociate,
        category,
        itemName,
        quantity,
        unit,
        amount,
        paidTo,
        date,
        paymentType,
        remarks,
      } = item;

      if (!project || !businessAssociate || !category || amount === undefined || !paidTo) {
        continue;
      }

      const projectDoc = await Project.findById(project);
      if (!projectDoc) continue;

      let clientId = client || projectDoc.client;
      const expenseDate = date ? new Date(date) : new Date();

      const newExpense = new Expense({
        project,
        client: clientId,
        businessAssociate,
        category: category.trim(),
        itemName: itemName ? itemName.trim() : "",
        quantity: parseFloat(quantity) || 1,
        unit: unit ? unit.trim() : "Pcs",
        amount: parseFloat(amount) || 0,
        paidTo: paidTo.trim(),
        date: expenseDate,
        paymentType: paymentType || "Cash",
        remarks: remarks ? remarks.trim() : "",
        createdBy: req.user?._id || businessAssociate,
      });

      await newExpense.save();
      createdRecords.push(newExpense);

      const dateKey = `${businessAssociate}_${expenseDate.toISOString().split("T")[0]}`;
      associatesToSync.set(dateKey, { businessAssociate, date: expenseDate });
    }

    for (const syncItem of associatesToSync.values()) {
      await syncCashFlowExpense(syncItem.businessAssociate, syncItem.date);
    }

    return res.status(201).json({
      success: true,
      message: `Successfully created ${createdRecords.length} expenses.`,
      count: createdRecords.length,
      data: createdRecords,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET EXPENSES FOR SPECIFIC DATE & ASSOCIATE (FOR MODAL & EXPORT) ─────────
export const getDateExpensesSummary = async (req, res) => {
  try {
    const { businessAssociate, date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date is required.",
      });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const query = {
      date: { $gte: startOfDay, $lte: endOfDay },
    };
    if (businessAssociate) {
      query.businessAssociate = businessAssociate;
    }

    const expenses = await Expense.find(query)
      .populate([
        { path: "project", select: "projectName status" },
        { path: "client", select: "name contactNumber" },
        { path: "businessAssociate", select: "name email phone" },
      ])
      .sort({ createdAt: -1 });

    const totalExpenseAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return res.status(200).json({
      success: true,
      count: expenses.length,
      totalExpenseAmount,
      date: targetDate,
      data: expenses,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET EXPENSE BY ID ────────────────────────────────────────────────────────
export const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findById(id).populate([
      { path: "project", select: "projectName status" },
      { path: "client", select: "name contactNumber" },
      { path: "businessAssociate", select: "name email phone department" },
    ]);

    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    return res.status(200).json({ success: true, data: expense });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE EXPENSE ────────────────────────────────────────────────────────────
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Expense.findById(id);

    if (!existing) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    const oldAssociate = existing.businessAssociate;
    const oldDate = existing.date;

    const updated = await Expense.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).populate([
      { path: "project", select: "projectName status" },
      { path: "client", select: "name contactNumber" },
      { path: "businessAssociate", select: "name email phone department" },
    ]);

    // Resync old date/associate
    await syncCashFlowExpense(oldAssociate, oldDate);

    // If associate or date changed, sync new date/associate
    if (
      updated.businessAssociate.toString() !== oldAssociate.toString() ||
      new Date(updated.date).toDateString() !== new Date(oldDate).toDateString()
    ) {
      await syncCashFlowExpense(updated.businessAssociate, updated.date);
    }

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE EXPENSE ────────────────────────────────────────────────────────────
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    const { businessAssociate, date } = expense;

    await Expense.findByIdAndDelete(id);

    // Resync cash flow
    await syncCashFlowExpense(businessAssociate, date);

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET EXPENSE CATEGORIES ───────────────────────────────────────────────────
export const getExpenseCategories = async (req, res) => {
  try {
    const customCategories = await ExpenseCategory.find().sort({ name: 1 });
    const customNames = customCategories.map((c) => c.name);

    // Combine defaults and custom categories without duplicates
    const combinedSet = new Set([...DEFAULT_CATEGORIES, ...customNames]);
    const categories = Array.from(combinedSet);

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADD EXPENSE CATEGORY ─────────────────────────────────────────────────────
export const addExpenseCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const trimmed = name.trim();
    const existing = await ExpenseCategory.findOne({
      name: { $regex: `^${trimmed}$`, $options: "i" },
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Category already exists",
        data: existing,
      });
    }

    const category = await ExpenseCategory.create({ name: trimmed });
    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
