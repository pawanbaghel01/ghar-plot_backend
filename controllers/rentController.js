import Property from "../models/addProps.js";

// Get all properties with purpose = Rent/Lease
export const getAllRentProperties = async (req, res) => {
  try {
    const properties = await Property.find({ purpose: 'Rent/Lease' });
    const count = await Property.countDocuments({ purpose: 'Rent/Lease' });
    res.status(200).json( {totalProperty: count ,data :properties});
  } catch (error) {
    console.error('Rent Properties Error:', error);
    res.status(500).json({ message: 'Server error',error: error.message});
  }
};



// Get Rent/Lease properties added by logged-in user
export const getMyRentProperties = async (req, res) => {
  try {
    const userId = req.user?.id || req.employee?._id; // from verifyToken or verifyEmployeeToken middleware

    if (!userId) {
      return res.status(400).json({ message: "Invalid or missing userId" });
    }

    const properties = await Property.find({ 
      purpose: 'Rent/Lease', 
      userId 
    });

    const count = await Property.countDocuments({ 
      purpose: 'Rent/Lease', 
      userId 
    });

    res.status(200).json({ totalProperty: count, data: properties });
  } catch (error) {
    console.error('My Rent Properties Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getOtherRentProperties = async (req, res) => {
  try {
    const userId = req.user?.id || req.employee?._id; // from verifyToken or verifyEmployeeToken middleware

    if (!userId) {
      return res.status(400).json({ message: "Invalid or missing userId" });
    }

    //  Find Rent/Lease properties excluding current user's
    const properties = await Property.find({ 
      purpose: "Rent/Lease",
      userId: { $ne: userId } // exclude current user
    });

    //  Count total properties (same filter)
    const count = await Property.countDocuments({ 
      purpose: "Rent/Lease",
      userId: { $ne: userId }
    });

    res.status(200).json({ totalProperty: count, data: properties });
  } catch (error) {
    console.error("Other Rent Properties Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
