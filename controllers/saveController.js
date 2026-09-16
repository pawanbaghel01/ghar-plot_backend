import SavedProperty from "../models/saveProperty.js";
import Property from "../models/addProps.js";
import User from "../models/user.js";

//  Save a property for a user
export const saveProperty = async (req, res) => {
  try {
    const userId = req.user?.id || req.employee?._id;
    const { propertyId } = req.query; // or req.body

    if (!userId || !propertyId) {
      return res
        .status(400)
        .json({ message: "userId and propertyId are required" });
    }

    // Check if already saved
    const alreadySaved = await SavedProperty.findOne({ userId, propertyId });
    if (alreadySaved) {
      return res.status(409).json({ message: "Property already saved" });
    }

    const saved = await SavedProperty.create({ userId, propertyId });

    //  Increment "shortlistedCount"
    await User.findByIdAndUpdate(userId, { $inc: { shortlistedCount: 1 } });

    res
      .status(201)
      .json({ message: "Property saved successfully", saved });
  } catch (error) {
    console.error("Error saving property:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

//  Get all saved properties for a user
export const getSavedProperties = async (req, res) => {
  try {
    const userId = req.user?.id || req.employee?._id;
    if (!userId)
      return res.status(400).json({ message: "userId is required" });

    const savedItems = await SavedProperty.find({ userId }).populate("propertyId");
    res.status(200).json({
      message: "Saved properties fetched successfully",
      count: savedItems.length,
      savedProperties: savedItems.map((item) => item.propertyId),
    });
  } catch (error) {
    console.error("Error fetching saved properties:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

//  Remove a saved property
export const removeSavedProperty = async (req, res) => {
  try {
    const userId = req.user?.id || req.employee?._id;
    const { propertyId } = req.query;
    if (!userId || !propertyId) {
      return res
        .status(400)
        .json({ message: "userId and propertyId are required" });
    }

    const removed = await SavedProperty.findOneAndDelete({ userId, propertyId });
    if (!removed) {
      return res.status(404).json({ message: "Saved property not found" });
    }

    //  Decrement "shortlistedCount"
    await User.findByIdAndUpdate(userId, { $inc: { shortlistedCount: -1 } });

    res.status(200).json({ message: "Property removed from saved list" });
  } catch (error) {
    console.error("Error removing saved property:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
