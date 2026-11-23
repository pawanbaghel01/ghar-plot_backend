import Property from "../models/addProps.js";

// Get recently added properties with dynamic limit and optional featured filter
export const getRecentAllProperties = async (req, res) => {
  try {
    const { featured, limit } = req.query;
    const filter = {};

    if (featured === 'true' || featured === true) {
      filter.isFeatured = true;
    }

    let query = Property.find(filter).sort({ postedDate: -1 }); // latest first

    const parsedLimit = parseInt(limit, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      query = query.limit(parsedLimit);
    }

    const properties = await query;

    res.status(200).json({
      message: "Recently added properties fetched successfully",
      properties,
    });
  } catch (error) {
    console.error("Error fetching recent properties:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get only featured properties
export const getFeaturedProperties = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 15;
    const properties = await Property.find({ isFeatured: true })
      .sort({ postedDate: -1 })
      .limit(limit);

    res.status(200).json({
      message: "Featured properties fetched successfully",
      properties,
    });
  } catch (error) {
    console.error("Error fetching featured properties:", error);
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

