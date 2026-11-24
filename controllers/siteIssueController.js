import SiteIssueCategory from "../models/siteIssueCategorySchema.js";
import SiteIssue from "../models/siteIssueSchema.js";
import { generateSiteIssueCode } from "../utils/counterHelper.js";

const DEFAULT_CATEGORIES = [
  "Before Starting Site",
  "Brickwork",
  "Chokidari",
  "Column Reinforcement",
  "Concreting",
  "Curing",
  "Electricity",
  "Everytime",
  "Footing",
  "Lift",
  "Material",
  "Neatness",
  "Only Build Self Projects",
];

const DEFAULT_ISSUES = [
  {
    businessAssociate: "admin",
    clientName: "Inspire Decor and Builders",
    projectName: "Zone Inspire Sites Issues",
    category: "Before Starting Site",
    report: "Educate clients that Owners and supervisors and thekedars keep roaming at sites and labours are always at site",
    dateStr: "10-09-2023",
  },
  {
    businessAssociate: "admin",
    clientName: "Inspire Decor and Builders",
    projectName: "Zone Inspire Sites Issues",
    category: "Before Starting Site",
    report: "Take handover of all drawings and agreements and payment",
    dateStr: "10-09-2023",
  },
  {
    businessAssociate: "admin",
    clientName: "Inspire Decor and Builders",
    projectName: "Zone Inspire Sites Issues",
    category: "Brickwork",
    report: "Ensure that walls from one end to last should be in soot rather than tying soot from column to column",
    dateStr: "30-10-2023",
  },
  {
    businessAssociate: "admin",
    clientName: "Inspire Decor and Builders",
    projectName: "Zone Inspire Sites Issues",
    category: "Brickwork",
    report: "While doing brickwork always put empty bags at sides to avoid wastage of masala",
    dateStr: "30-10-2023",
  },
  {
    businessAssociate: "admin",
    clientName: "Inspire Decor and Builders",
    projectName: "Zone Inspire Sites Issues",
    category: "Brickwork",
    report: "Brickwork ke liye bricks ko geela kar lein",
    dateStr: "14-11-2023",
  },
];

// ==========================================
// CATEGORY CONTROLLERS
// ==========================================

export const getSiteIssueCategories = async (req, res) => {
  try {
    let categories = await SiteIssueCategory.find({ isActive: true }).sort({ name: 1 });

    // Auto-seed if empty
    if (!categories || categories.length === 0) {
      const seedOps = DEFAULT_CATEGORIES.map((name) => ({ name, isActive: true }));
      await SiteIssueCategory.insertMany(seedOps, { ordered: false }).catch(() => {});
      categories = await SiteIssueCategory.find({ isActive: true }).sort({ name: 1 });
    }

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching site issue categories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

export const createSiteIssueCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const trimmedName = name.trim();
    const existing = await SiteIssueCategory.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    });

    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
        return res.status(200).json({
          success: true,
          message: "Category reactivated successfully",
          data: existing,
        });
      }
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await SiteIssueCategory.create({
      name: trimmedName,
      description: description?.trim() || "",
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error creating site issue category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create category",
      error: error.message,
    });
  }
};

export const deleteSiteIssueCategory = async (req, res) => {
  try {
    const { id } = req.params;
    let deleted;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      deleted = await SiteIssueCategory.findByIdAndDelete(id);
    } else {
      deleted = await SiteIssueCategory.findOneAndDelete({ name: id });
    }

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting site issue category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message,
    });
  }
};

// ==========================================
// SITE ISSUES CONTROLLERS
// ==========================================

export const getSiteIssues = async (req, res) => {
  try {
    const { ba, client, project, category, date, search } = req.query;
    const filter = {};

    if (ba) filter.businessAssociate = { $regex: new RegExp(ba, "i") };
    if (client) filter.clientName = { $regex: new RegExp(client, "i") };
    if (project) filter.projectName = { $regex: new RegExp(project, "i") };
    if (category) filter.category = { $regex: new RegExp(`^${category}$`, "i") };
    if (date) filter.dateStr = { $regex: new RegExp(date, "i") };

    if (search) {
      const q = new RegExp(search, "i");
      filter.$or = [
        { report: q },
        { clientName: q },
        { projectName: q },
        { category: q },
        { issueCode: q },
      ];
    }

    let issues = await SiteIssue.find(filter).sort({ createdAt: -1 });

    // Auto-seed initial demo issues if collection is completely empty and no filter
    if (issues.length === 0 && Object.keys(filter).length === 0) {
      const count = await SiteIssue.countDocuments();
      if (count === 0) {
        for (const item of DEFAULT_ISSUES) {
          const code = await generateSiteIssueCode();
          await SiteIssue.create({
            ...item,
            issueCode: code,
          });
        }
        issues = await SiteIssue.find(filter).sort({ createdAt: -1 });
      }
    }

    res.status(200).json({
      success: true,
      data: issues,
    });
  } catch (error) {
    console.error("Error fetching site issues:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch site issues",
      error: error.message,
    });
  }
};

export const createSiteIssue = async (req, res) => {
  try {
    const { businessAssociate, clientName, projectName, category, report, dateStr, date } = req.body;

    if (!report || !report.trim()) {
      return res.status(400).json({
        success: false,
        message: "Report/issue details are required",
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    const issueCode = await generateSiteIssueCode();
    const parsedDate = date ? new Date(date) : new Date();

    const siteIssue = await SiteIssue.create({
      issueCode,
      businessAssociate: businessAssociate?.trim() || "admin",
      clientName: clientName?.trim() || "Inspire Decor and Builders",
      projectName: projectName?.trim() || "Zone Inspire Sites Issues",
      category: category.trim(),
      report: report.trim(),
      date: parsedDate,
      dateStr: dateStr?.trim() || new Date().toISOString().slice(0, 10),
      status: "Open",
    });

    res.status(201).json({
      success: true,
      message: "Site issue created successfully",
      data: siteIssue,
    });
  } catch (error) {
    console.error("Error creating site issue:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create site issue",
      error: error.message,
    });
  }
};

export const updateSiteIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { businessAssociate, clientName, projectName, category, report, dateStr, status } = req.body;

    const issue = await SiteIssue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Site issue not found",
      });
    }

    if (businessAssociate !== undefined) issue.businessAssociate = businessAssociate;
    if (clientName !== undefined) issue.clientName = clientName;
    if (projectName !== undefined) issue.projectName = projectName;
    if (category !== undefined) issue.category = category;
    if (report !== undefined) issue.report = report;
    if (dateStr !== undefined) issue.dateStr = dateStr;
    if (status !== undefined) issue.status = status;

    await issue.save();

    res.status(200).json({
      success: true,
      message: "Site issue updated successfully",
      data: issue,
    });
  } catch (error) {
    console.error("Error updating site issue:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update site issue",
      error: error.message,
    });
  }
};

export const deleteSiteIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await SiteIssue.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Site issue not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Site issue deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting site issue:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete site issue",
      error: error.message,
    });
  }
};
