import Property from "../models/addProps.js";

// Get all properties
export const getAllProperties = async (req, res) => {
  try {
    // const userId = req.params.userId; // or from token/session

    // Fetch data and count
    const properties = await Property.find();
    const count = await Property.countDocuments();

    // Send combined response
    res.status(200).json({
      success: true,
      totalProperties: count,
      data: properties,
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch properties",
      error: error.message,
    });
  }
};





// Get properties added by other users
// export const getAllOtherProperties = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     if (!userId) {
//       return res.status(400).json({ message: "Missing userId" });
//     }

//     // find all properties where userId != current user
//     const properties = await Property.find({
//       userId: { $ne: userId } // $ne = not equal
//     });

//     res.status(200).json(properties);
//   } catch (error) {
//     console.error("Get Other Users Properties Error:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };


// Get properties by category

// Get properties added by other users excluding Rent/Lease
// export const getAllOtherProperties = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     if (!userId) {
//       return res.status(400).json({ message: "Missing userId" });
//     }

//     // Find all properties except:
//     // 1 Those created by the current user
//     // 2 Those with purpose = "Rent/Lease"
//     const properties = await Property.find({
//       userId: { $ne: userId },
//       purpose: { $ne: "Rent/Lease" }, // Exclude Rent/Lease
//     });

//     res.status(200).json({  count: properties.length , properties});
//   } catch (error) {
//     console.error("Get Other Users Properties Error:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// Get properties added by other users excluding Rent/Lease with posted user details
export const getAllOtherProperties = async (req, res) => {
  try {
    // Check both user and employee authentication
    const userId = req.user?.id || req.employee?._id;

    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }

    //  Find all properties except:
    // 1 Those created by the current user
    // 2 Those with purpose = "Rent/Lease"
    const properties = await Property.find({
      userId: { $ne: userId },
      purpose: { $ne: "Rent/Lease" },
    })
      .populate({
        path: "userId", // This will pull data from User model
        select: "fullName email phone city state avatar", // choose only useful fields
      })
      .sort({ createdAt: -1 }); // Optional: latest first

    if (!properties.length) {
      return res.status(201).json({ message: "No properties found" });
    }

    res.status(200).json({
      message: "Other users' properties fetched successfully",
      count: properties.length,
      data: properties,
    });
  } catch (error) {
    console.error("Get Other Users Properties Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



export const getPropertiesByCategory = async (req, res) => {
  try {
    const category = req.params.category.toLowerCase();
    let query = {};

    // Residential categories
    if (["apartment", "villa", "plot"].includes(category)) {
      query = { propertyType: "Residential", residentialType: category };
    }

    // Commercial categories
    if (["office", "shop", "warehouse"].includes(category)) {
      query = { propertyType: "Commercial", commercialType: category };
    }

    // Fetch properties
    const properties = await Property.find(query);

    // Count properties in this category
    const count = await Property.countDocuments(query);

    // Send response
    res.status(200).json({
      count,
      properties,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching category properties", error });
  }
};



// ===============================
// GET: Properties by Main Category
export const getPropertiesByMainCategory = async (req, res) => {
  try {
    const category = req.params.mainCategory.toLowerCase(); // e.g. residential or commercial

    // Validate category
    if (!["residential", "commercial"].includes(category)) {
      return res.status(400).json({ message: "Invalid category. Use 'Residential' or 'Commercial'." });
    }

    // Fetch properties by type
    const properties = await Property.find({ propertyType: category.charAt(0).toUpperCase() + category.slice(1) });

    // Count total properties by category
    const totalResidential = await Property.countDocuments({ propertyType: "Residential" });
    const totalCommercial = await Property.countDocuments({ propertyType: "Commercial" });

    // Response
    res.status(200).json({
      message: `${category} properties fetched successfully`,
      totalCount: properties.length,
      categoryCount: {
        residential: totalResidential,
        commercial: totalCommercial,
      },
      properties,
    });
  } catch (error) {
    console.error("Error fetching properties by category:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// Get counts per sub-category
export const getSubCategoryCounts = async (req, res) => {
  try {
    const counts = await Property.aggregate([
      {
        $group: {
          _id: {
            propertyType: "$propertyType",
            subCategory: {
              $cond: [
                { $eq: ["$propertyType", "Residential"] },
                "$residentialType",
                "$commercialType",
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.propertyType",
          subCategories: {
            $push: { name: "$_id.subCategory", count: "$count" },
          },
        },
      },
    ]);

    const response = {
      Residential: [],
      Commercial: [],
    };

    counts.forEach((type) => {
      if (type._id === "Residential") response.Residential = type.subCategories;
      if (type._id === "Commercial") response.Commercial = type.subCategories;
    });

    res.status(200).json(response);
  } catch (error) {
    console.error("Sub-category count error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
