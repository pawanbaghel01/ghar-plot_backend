import WorkStatus from "../models/workStatusSchema.js";
import Project from "../models/projectSchema.js";
import CashFlow from "../models/cashFlowSchema.js";
import Expense from "../models/expenseSchema.js";
import Client from "../models/clientSchema.js";
import Employee from "../models/employeeSchema.js";

// In-memory store for dynamically generated client-side CSV exports
const dynamicExportStore = new Map();

// Clean up store entries older than 30 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, item] of dynamicExportStore.entries()) {
    if (now - item.createdAt > 30 * 60 * 1000) {
      dynamicExportStore.delete(id);
    }
  }
}, 10 * 60 * 1000);
if (cleanupTimer.unref) cleanupTimer.unref();

// Helper to escape CSV cell value
const escapeCsvCell = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/\r?\n/g, " ");
  return `"${str.replace(/"/g, '""')}"`;
};

// Helper to format Date into DD-MM-YYYY
const formatDDMMYYYY = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * POST /admin/export/generate
 * Accepts { filename, headers, rows } from frontend and returns a download link
 */
export const generateExport = async (req, res) => {
  try {
    const { filename = "Export_Data.csv", headers = [], rows = [] } = req.body;

    if (!headers.length && !rows.length) {
      return res.status(400).json({ success: false, message: "Headers or rows are required" });
    }

    const headerLine = headers.map(escapeCsvCell).join(",");
    const bodyLines = rows.map((row) => (Array.isArray(row) ? row.map(escapeCsvCell).join(",") : ""));
    // Add UTF-8 BOM (\uFEFF) for proper Excel character encoding in Hindi & English
    const csvContent = "\uFEFF" + [headerLine, ...bodyLines].join("\n");

    const exportId = "exp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    dynamicExportStore.set(exportId, {
      filename: filename.endsWith(".csv") ? filename : `${filename}.csv`,
      content: csvContent,
      createdAt: Date.now(),
    });

    const host = req.get("host") || "";
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    const protocol = req.headers["x-forwarded-proto"] || (isLocal ? req.protocol : "https");
    const downloadUrl = `${protocol}://${host}/admin/export/file/${exportId}`;

    return res.status(200).json({
      success: true,
      exportId,
      downloadUrl,
      filename,
    });
  } catch (error) {
    console.error("Error generating export:", error);
    return res.status(500).json({ success: false, message: "Export generation failed", error: error.message });
  }
};

/**
 * GET /admin/export/file/:id
 * Direct download of generated file as attachment
 */
export const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const item = dynamicExportStore.get(id);

    if (!item) {
      return res.status(404).send("Export file expired or not found. Please click export again in the app.");
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${item.filename}"`);
    return res.send(item.content);
  } catch (error) {
    console.error("Error downloading file:", error);
    return res.status(500).send("Error downloading file");
  }
};

/**
 * GET /admin/export/csv?type=...
 * Direct download for any entity up to current date
 */
export const exportDirectCSV = async (req, res) => {
  try {
    const { type = "work-status", project, client, date, toDate, associate } = req.query;
    const now = new Date();
    const currentDateStr = formatDDMMYYYY(now);

    let filename = `Export_${type}_${currentDateStr}.csv`;
    let headers = [];
    let rows = [];

    if (type === "work-status") {
      filename = `Work_Status_${currentDateStr}.csv`;
      const query = {};
      if (project) query.projectName = new RegExp(project.trim(), "i");
      if (client) query.clientName = new RegExp(client.trim(), "i");
      if (date) query.dateStr = date.trim();
      else if (toDate) {
        query.date = { $lte: new Date(toDate) };
      }

      const list = await WorkStatus.find(query)
        .sort({ date: -1, projectName: 1 })
        .populate("project", "projectName")
        .populate("client", "name")
        .lean();

      headers = [
        "S. No.",
        "Project Name",
        "Client Name",
        "Date",
        "Today",
        "Tomorrow",
        "Day After Tomorrow",
        "Created By",
      ];
      rows = list.map((item, idx) => [
        item.sNo || idx + 1,
        item.projectName || "",
        item.clientName || item.client?.name || "",
        item.dateStr || formatDDMMYYYY(item.date),
        item.today || "",
        item.tomorrow || "",
        item.dayAfterTomorrow || "",
        item.createdBy || "Admin",
      ]);
    } else if (type === "projects") {
      filename = `Projects_List_${currentDateStr}.csv`;
      const list = await Project.find({}).sort({ createdAt: -1 }).populate("client", "name").lean();
      headers = ["S. No.", "Project Name", "Client Name", "Status", "Created Date"];
      rows = list.map((p, idx) => [
        idx + 1,
        p.projectName || "",
        p.client?.name || "",
        p.status || "Active",
        formatDDMMYYYY(p.createdAt),
      ]);
    } else if (type === "cashflow") {
      filename = `CashFlow_Report_${currentDateStr}.csv`;
      const query = {};
      if (associate) query.businessAssociate = associate;
      const list = await CashFlow.find(query)
        .sort({ date: -1 })
        .populate("businessAssociate", "name")
        .lean();

      headers = [
        "Business Associate",
        "Date",
        "Opening Balance",
        "Total Received",
        "Total Expense",
        "Closing Balance",
        "Entries Count",
      ];
      rows = list.map((c) => [
        c.businessAssociate?.name || "N/A",
        formatDDMMYYYY(c.date),
        c.openingBalance || 0,
        c.totalReceived || 0,
        c.totalExpense || 0,
        c.closingBalance || 0,
        c.entries ? c.entries.length : 0,
      ]);
    } else if (type === "expenses") {
      filename = `Expenses_List_${currentDateStr}.csv`;
      const query = {};
      if (project) query.project = project;
      if (client) query.client = client;
      if (associate) query.businessAssociate = associate;

      const list = await Expense.find(query)
        .sort({ date: -1 })
        .populate("project", "projectName")
        .populate("client", "name")
        .populate("businessAssociate", "name")
        .lean();

      headers = [
        "Date",
        "Business Associate",
        "Project",
        "Client",
        "Category",
        "Item Description",
        "Quantity",
        "Unit",
        "Amount (Rs)",
        "Paid To",
        "Payment Type",
        "Remarks",
      ];
      rows = list.map((e) => [
        formatDDMMYYYY(e.date),
        e.businessAssociate?.name || "N/A",
        e.project?.projectName || "",
        e.client?.name || "",
        e.category || "",
        e.itemName || "",
        e.quantity || "",
        e.unit || "",
        e.amount || 0,
        e.paidTo || "",
        e.type || "Cash",
        e.remarks || "",
      ]);
    } else if (type === "client-payments") {
      filename = `Client_Payments_${currentDateStr}.csv`;
      // Default standard payments format
      headers = ["Project Name", "Client Name", "Amount", "Type", "Date", "Comment"];
      rows = [
        ["K M 163 Kavi Nagar", "Harsh Gupta", "Rs. 360000", "Online Transfer", "01-02-2025", ""],
        ["K M 163 Kavi Nagar", "Harsh Gupta", "Rs. 535547", "Online Transfer", "21-01-2025", ""],
        ["K M 163 Kavi Nagar", "Harsh Gupta", "Rs. 65000", "Cash", "16-01-2025", ""],
        ["K M 163 Kavi Nagar", "Harsh Gupta", "Rs. 430438", "Cash", "14-01-2025", ""],
        ["K M 163 Kavi Nagar", "Harsh Gupta", "Rs. 180164", "Cash", "14-01-2025", ""],
        ["K M 163 Kavi Nagar", "Harsh Gupta", "Rs. 200000", "Cash", "07-01-2025", ""],
      ];
    } else if (type === "daily-sheet") {
      const sheetDateStr = date || currentDateStr;
      filename = `Daily_Project_Expense_Sheet_${sheetDateStr.replace(/\//g, "-")}.csv`;
      const query = {};
      if (date) {
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
          const start = new Date(new Date(date).setHours(0, 0, 0, 0));
          const end = new Date(new Date(date).setHours(23, 59, 59, 999));
          query.date = { $gte: start, $lte: end };
        }
      }
      const list = await Expense.find(query)
        .sort({ project: 1, date: -1 })
        .populate("project", "projectName")
        .populate("client", "name")
        .populate("businessAssociate", "name")
        .lean();

      headers = [
        "Date",
        "Project Name",
        "Client Name",
        "Category",
        "Item Description",
        "Quantity",
        "Unit",
        "Amount (Rs)",
        "Paid To",
        "Payment Type",
        "Associate",
        "Remarks",
      ];
      rows = list.map((e) => [
        formatDDMMYYYY(e.date),
        e.project?.projectName || "",
        e.client?.name || "",
        e.category || "",
        e.itemName || "",
        e.quantity || "",
        e.unit || "",
        e.amount || 0,
        e.paidTo || "",
        e.type || "Cash",
        e.businessAssociate?.name || "",
        e.remarks || "",
      ]);
    }

    const headerLine = headers.map(escapeCsvCell).join(",");
    const bodyLines = rows.map((row) => row.map(escapeCsvCell).join(","));
    const csvContent = "\uFEFF" + [headerLine, ...bodyLines].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (error) {
    console.error("Error in exportDirectCSV:", error);
    return res.status(500).send("Error exporting data");
  }
};
