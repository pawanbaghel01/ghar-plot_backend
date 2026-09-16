import Property from "../models/addProps.js";

// Get recently added properties with dynamic limit
export const getRecentAllProperties = async (req, res) => {
  try {
    // query param se limit lo, default 5
    // const limit = parseInt(req.query.limit) || 5;

    const properties = await Property.find()
      .sort({ postedDate: -1 }) // latest first
      // .limit(limit);

    res.status(200).json({
      message: "Recently added properties fetched successfully",
      properties,
    });
  } catch (error) {
    console.error("Error fetching recent properties:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get recently added properties excluding those added by logged-in user
export const getRecentProperties = async (req, res) => {
  try {
    // Check both user and employee authentication
    const userId = req.user?.id || req.employee?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: userId missing" });
    }

    // const limit = parseInt(req.query.limit) || 5;

    const properties = await Property.find({
      userId: { $ne: userId }, // Exclude properties added by the logged-in user
    })
      .sort({ postedDate: -1 }) // Latest first
      // .limit(limit);

    res.status(200).json({
      message: "Recently added properties fetched successfully",
      properties,
    });
  } catch (error) {
    console.error("Error fetching recent properties:", error);
    res.status(500).json({ message: "Server error" });
  }
};

