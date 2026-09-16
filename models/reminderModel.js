import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    location: String,
    note: String,
    reminderTime: { type: Date, required: true }, // combined date + time
    isTriggered: { type: Boolean, default: false }, // once triggered, won't repeat
  },
  { timestamps: true }
);

export default mongoose.model("Reminder", reminderSchema);
