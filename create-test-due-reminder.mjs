import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = "mongodb+srv://sumitgharplot_db_user:DasKahLD2kb8WzZR@gharplot.vhzd2nr.mongodb.net/99acer-db?retryWrites=true&w=majority&appName=99acer-backend";

const reminderSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, required: false },
  assignmentType: { type: String, required: false },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  title: String, comment: String, note: String,
  clientName: String, phone: String, email: String, location: String,
  reminderDateTime: Date,
  status: { type: String, default: 'pending' },
  isActive: { type: Boolean, default: true },
  isRepeating: { type: Boolean, default: false },
  lastTriggered: Date,
  triggerCount: { type: Number, default: 0 },
  nextTrigger: Date,
  snoozedUntil: Date,
}, { collection: 'reminders', timestamps: true });

const Reminder = mongoose.model('Reminder', reminderSchema);

const employeeSchema = new mongoose.Schema({ name: String, email: String, fcmToken: String, adminReminderPopupEnabled: Boolean }, { collection: 'employees' });
const Employee = mongoose.model('Employee', employeeSchema);

await mongoose.connect(MONGO_URI);
console.log("✅ Connected to MongoDB");

// Find an employee
const emp = await Employee.findOne({ isActive: true }).select('name email _id');
if (!emp) { console.log("No employee found"); process.exit(1); }
console.log(`Using employee: ${emp.name} (${emp._id})`);

// Create reminder due 1 min 30 sec from now
const dueTime = new Date(Date.now() + 90 * 1000);
console.log(`⏰ Setting reminder due at: ${dueTime.toISOString()} (UTC)`);
console.log(`⏰ That's ${dueTime.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})} IST`);

const reminder = new Reminder({
  employeeId: emp._id,
  title: "TEST ADMIN PUSH NOTIFICATION",
  comment: "Test reminder to verify admin gets push at due time",
  clientName: "Test Client",
  phone: "9999999999",
  reminderDateTime: dueTime,
  status: 'pending',
  isActive: true,
  isRepeating: false,
});

await reminder.save();
console.log(`✅ Test reminder created: ${reminder._id}`);
console.log(`\n👉 Watch backend.log now — in ~90 seconds you should see:`);
console.log(`   🚀 [Cron] TRIGGERING notification for: TEST ADMIN PUSH NOTIFICATION`);
console.log(`   ✅ FCM sent to main admin`);
console.log(`\nCheck logs with:`);
console.log(`   Get-Content backend.log -Wait -Tail 20`);

await mongoose.disconnect();
process.exit(0);
