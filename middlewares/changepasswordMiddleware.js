import jwt from "jsonwebtoken";
import User from "../models/user.js";


export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer TOKEN
    if (!token) return res.status(401).json({ message: "Not authorized, no token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is invalid or expired", error: err.message });
  }
};













// export const protect = async (req, res, next) => {
//   let token;

//   try {
//     // 1️ Check for Authorization header
//     if (
//       req.headers.authorization &&
//       req.headers.authorization.startsWith("Bearer")
//     ) {
//       token = req.headers.authorization.split(" ")[1]; // Extract token
//     }

//     if (!token) {
//       return res.status(401).json({ message: "Not authorized, token missing" });
//     }

//     // 2️ Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // 3️ Get user from DB and attach to req.user
//     req.user = await User.findById(decoded.id).select("-password");
//     if (!req.user) {
//       return res.status(401).json({ message: "Not authorized, user not found" });
//     }

//     next(); //  User is authenticated
//   } catch (err) {
//     console.error(err);
//     return res.status(401).json({ message: "Not authorized, token failed" });
//   }
// };
