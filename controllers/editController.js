import User from "../models/user.js";

export const editProfile = async (req, res) => {
  try {
    const userId = req.user.id; // user id from verifyToken middleware
    const { fullName, email, phone } = req.body;

    // Prepare the update data object dynamically
    const updateData = {};

    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    //  If file uploaded, store its path in MongoDB
    if (req.file) {
      const uploadedProfilePic = `/uploads/${req.file.filename}`;
      updateData.photosAndVideo = [uploadedProfilePic]; // save in DB
    }

    //  Update user document
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true, context: "query" });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Edit Profile Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

















// import User from "../models/user.js";

// export const editProfile = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { fullName, email, phone } = req.body;

//     const updateData = { fullName, email, phone };

//     // Agar file upload hui hai
//     let uploadedProfilePic = null;
//     if (req.file) {
//       uploadedProfilePic = `/uploads/${req.file.filename}`;
//     }

//     // Update user details 
//     const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

//     res.status(200).json({
//       message: "Profile updated successfully",
//       user: updatedUser,
//       uploadedProfilePic,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Something went wrong" });
//   }
// };
