import Property from "../models/addProps.js";

// ===========================================
// GET: Total + Monthly Revenue (Simple Format)
// ===========================================
export const getRevenueStatus = async (req, res) => {
  try {
    // -------------------------
    // Total revenue
    // -------------------------
    const revenueData = await Property.aggregate([
      {
        $group: {
          _id: "$propertyType",
          totalRevenue: { $sum: "$price" },
        },
      },
    ]);

    let residentialRevenue = 0;
    let commercialRevenue = 0;

    revenueData.forEach((item) => {
      if (item._id === "Residential") residentialRevenue = item.totalRevenue;
      if (item._id === "Commercial") commercialRevenue = item.totalRevenue;
    });

    const totalRevenue = residentialRevenue + commercialRevenue;

    // -------------------------
    // Monthly revenue (simple format)
    // -------------------------
    const monthlyData = await Property.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$postedDate" },
            month: { $month: "$postedDate" },
            propertyType: "$propertyType",
          },
          revenue: { $sum: "$price" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    // Build monthly revenue list
    const monthlyRevenueList = [];

    monthlyData.forEach((item) => {
      const monthKey = `${item._id.year}-${String(item._id.month).padStart(2, "0")}`;

      // Find existing month object or create new
      let monthObj = monthlyRevenueList.find((m) => m.month === monthKey);
      if (!monthObj) {
        monthObj = {
          month: monthKey,
          totalRevenue: 0,
          residentialRevenue: 0,
          commercialRevenue: 0,
        };
        monthlyRevenueList.push(monthObj);
      }

      // Assign category revenue
      if (item._id.propertyType === "Residential") {
        monthObj.residentialRevenue = item.revenue;
      }
      if (item._id.propertyType === "Commercial") {
        monthObj.commercialRevenue = item.revenue;
      }

      // Update total revenue
      monthObj.totalRevenue += item.revenue;
    });

    // -------------------------
    // Send response
    // -------------------------
    res.status(200).json({
      success: true,
      totalRevenue,
      residentialRevenue,
      commercialRevenue,
      monthlyRevenue: monthlyRevenueList,
    });
  } catch (error) {
    console.error("Error fetching revenue stats:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
