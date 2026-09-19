import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import session from "express-session";
import path from "path";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";



// Import routes
import router from "./routes/authRoute.js";
import addRouter from "./routes/addRoute.js";
import getRoute from "./routes/getRoutes.js";
import recentRoute from "./routes/recentRoute.js";
import saveRoute from "./routes/saveRoute.js";
import editRoutes from "./routes/editProfileRoute.js";
import serviceRoutes from "./routes/serviceRoute.js";
import boughtRoute from "./routes/boughtRoute.js";
import chatRouter from "./routes/chatRoute.js";
import sellRoute from "./routes/sellRoute.js";
import rentRoute from "./routes/rentRoute.js";
import revenueRoute from "./routes/revenueRoute.js";
import userRoute from "./routes/userRoute.js";
import changePasswordRoute from "./routes/changePasswordRoute.js";
import adminAuthRoute from "./routes/adminAuthRoute.js";
import paymentRoute from "./routes/paymentRoute.js"
import inquiryRoute from "./routes/inquiryRoute.js";
import reminderRoute from "./routes/reminderRoute.js";
import notificationRoute from "./routes/notificationRoute.js";
import adminNotificationRoute from "./routes/adminNotificationRoute.js";
import fcmRoute from "./routes/fcmRoute.js";
import updateNotificationRoute from "./routes/updateNotificationRoute.js";
import contactRoute from "./routes/contactRoute.js";
import roleRoute from "./routes/roleRoute.js";
import employeeRoute from "./routes/employeeRoute.js";
import adminRoleRoute from "./routes/adminRoleRoute.js";
import adminEmployeeRoute from "./routes/adminEmployeeRoute.js";
import clientAssignmentRoute from "./routes/clientAssignmentRoute.js";
import employeeDashboardRoute from "./routes/employeeDashboardRoute.js";
import employeeReportRoute from "./routes/employeeReportRoute.js";
import adminLeadAssignmentRoute from "./routes/adminLeadAssignmentRoute.js";
import employeeLeadRoute from "./routes/employeeLeadRoute.js";
import adminUserLeadAssignmentRoute from "./routes/adminUserLeadAssignmentRoute.js";
import employeeUserLeadRoute from "./routes/employeeUserLeadRoute.js";
// import testReminderRoute from "./routes/testReminderRoute.js"; // Disabled test reminders
import followUpRoute from "./routes/followUpRoute.js";
import alertRoute from "./routes/alertRoute.js";
import uspCategoryRoute from "./routes/uspCategoryRoute.js";
import uspEmployeeRoute from "./routes/uspEmployeeRoute.js";
import adminReminderRoute from "./routes/adminReminderRoute.js";
import appConfigRoutes from "./routes/appConfigRoutes.js";
import clientTypeRoute from "./routes/clientTypeRoute.js";
import clientRoute from "./routes/clientRoute.js";
import projectRoute from "./routes/projectRoute.js";
import cashFlowRoute from "./routes/cashFlowRoute.js";
import expenseRoute from "./routes/expenseRoute.js";
// Load environment variables
dotenv.config();

const app = express();

//  Middleware


app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(
  session({
    secret: "your-secret-key", // move to .env later
    resave: false,
    saveUninitialized: false,
  })
);

//  MongoDB Connection
const connectDB = async () => {
  try {
    if (!process.env.MONGO_CONN) {
      throw new Error(" MONGO_CONN not found in .env file");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_CONN);

    console.log(" MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1); // Stop server if DB fails
  }
};

connectDB();

// Attach socket.io instance to req
app.use((req, res, next) => {
  req.io = io;
  console.log(`[DEBUG] Incoming Request: ${req.method} ${req.url}`);
  next();
});



// Root / Health check route for Render
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Ghar-Plot Backend API is running live!",
    timestamp: new Date().toISOString()
  });
});

app.head("/", (req, res) => {
  res.status(200).end();
});

//  API Routes
app.use("/auth", router);
app.use("/property", addRouter);
app.use("/api/properties", getRoute);
app.use("/api/properties", recentRoute);
app.use("/api/properties", saveRoute);
app.use("/api/services", serviceRoutes);
app.use("/api/properties", boughtRoute);
app.use("/api/chat", chatRouter);
app.use("/api/users", editRoutes);
app.use("/api/properties", sellRoute);
app.use("/api/properties", rentRoute);
app.use("/api/properties", revenueRoute);
app.use("/api/users", userRoute);
app.use("/api", changePasswordRoute);
app.use("/admin/notifications", adminNotificationRoute);
app.use("/admin", adminAuthRoute);
app.use("/api/payment", paymentRoute);

//  Serve Uploaded Files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/inquiry", inquiryRoute);

app.use("/api/reminder", reminderRoute);
app.use("/api/notification", notificationRoute);
app.use("/api", fcmRoute);
app.use("/application", updateNotificationRoute)
app.use("/api/contact", contactRoute);
app.use("/api/roles", roleRoute);
app.use("/api/employees", employeeRoute);
app.use("/employee", employeeRoute); // Employee profile and self-service routes
app.use("/admin/roles", adminRoleRoute);
app.use("/admin/employees", adminEmployeeRoute);
app.use("/api/clients", clientAssignmentRoute);
app.use("/admin/leads", adminLeadAssignmentRoute);
app.use("/employee/leads", employeeLeadRoute);
app.use("/admin/user-leads", adminUserLeadAssignmentRoute);
app.use("/employee/user-leads", employeeUserLeadRoute);
app.use("/employee/reminders", reminderRoute);
app.use("/employee/follow-ups", followUpRoute);
app.use("/employee/dashboard", employeeDashboardRoute);
app.use("/api/employee-reports", employeeReportRoute);
app.use("/admin/employee-reports", employeeReportRoute);
// app.use("/test", testReminderRoute); // Disabled test reminders
app.use("/api/follow-ups", followUpRoute);
app.use("/api/alerts", alertRoute);
app.use("/api/usp-categories", uspCategoryRoute);
app.use("/api/usp-employees", uspEmployeeRoute);
app.use("/admin/reminders", adminReminderRoute);
app.use("/api/config", appConfigRoutes); 
app.use("/api/client-types", clientTypeRoute);
app.use("/admin/clients", clientRoute);
app.use("/employee/clients", clientRoute);
app.use("/admin/projects", projectRoute);
app.use("/employee/projects", projectRoute);
app.use("/admin/cashflows", cashFlowRoute);
app.use("/employee/cashflows", cashFlowRoute);
app.use("/admin/expenses", expenseRoute);
app.use("/employee/expenses", expenseRoute);

//  Socket.io Setup
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // replace with your frontend URL in production
    methods: ["GET", "POST"],
  },
});


// // Attach socket.io instance to req
// app.use((req, res, next) => {
//   req.io = io;
//   next();
// });



//  Socket.io Events
io.on("connection", (socket) => {
  console.log(" User connected:", socket.id);

  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
    console.log(`User joined chat room: ${chatId}`);
  });

  socket.on("sendMessage", (data) => {
    io.to(data.chatId).emit("receiveMessage", data);
  });

  socket.on("disconnect", () => {
    console.log(" User disconnected:", socket.id);
  });
});

// Final 404 handler for debugging untracked routes
app.use((req, res) => {
  console.log(`[DEBUG] ❌ 404 - Not Found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found on this server`,
    path: req.url
  });
});

//  Start Server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});

export { io };

// Start cron jobs after io is exported to avoid circular dependency issues
import { initReminderCron } from "./cron/reminderCron.js";
initReminderCron(io);
import { initAlertCron } from "./cron/alertCron.js";
initAlertCron();
