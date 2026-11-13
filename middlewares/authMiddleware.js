// import jwt from "jsonwebtoken";

// export const verifyToken = (req, res, next) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res.status(401).json({ message: "No token provided" });
//   }

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded; // yaha userId mil jaata hai
//     next();
//   } catch (err) {
//     return res.status(403).json({ message: "Invalid or expired token" });
//   }
// };


import jwt from "jsonwebtoken";
import Admin from "../models/adminAuthSchema.js";

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id || decoded._id || decoded.userId;
    let role = decoded.role;

    // If role is missing or not admin, check if userId exists in Admin model
    if (!role || (role !== 'admin' && role !== 'superadmin')) {
      try {
        const isAdmin = await Admin.exists({ _id: userId });
        if (isAdmin) {
          role = 'admin';
        }
      } catch (_) {}
    }

    req.user = {
      id: userId,
      email: decoded.email,
      role: role,
      fullName: decoded.fullName,
    };

    if (!req.user.id) {
      return res.status(401).json({ message: "User ID missing in token" });
    }

    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
